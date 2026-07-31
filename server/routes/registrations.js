const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { sendReceiptEmail } = require('../mailer');

function getRazorpayInstance() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// Helper: determine applicable fee for an event
function resolveEventFee(event, user) {
  const isMember = user && user.is_paid === 1;
  if (isMember) {
    return event.fee_member !== undefined && event.fee_member !== null ? event.fee_member : event.fee;
  }
  if (event.club_fees && user && user.clubs) {
    try {
      const cFees = typeof event.club_fees === 'string' ? JSON.parse(event.club_fees) : event.club_fees;
      const userClubs = user.clubs.split(',').map(c => c.trim().toLowerCase());
      if (Array.isArray(cFees)) {
        const match = cFees.find(cf => cf.club && userClubs.includes(cf.club.trim().toLowerCase()));
        if (match && match.fee !== undefined && match.fee !== null) {
          return parseInt(match.fee);
        }
      }
    } catch (e) {}
  }
  return event.fee;
}

// GET /api/registrations/my-registrations
router.get('/my-registrations', authenticate, async (req, res) => {
  try {
    const registrations = await db.all(`
      SELECT r.*, e.title, e.event_date, e.event_time, e.venue
      FROM amsam_registrations r
      JOIN amsam_events e ON r.event_id = e.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/registrations/:eventId/create-order
router.post('/:eventId/create-order', authenticate, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await db.get('SELECT * FROM amsam_events WHERE id = ?', [eventId]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const existing = await db.get(
      'SELECT * FROM amsam_registrations WHERE user_id = ? AND event_id = ?',
      [req.user.id, eventId]
    );
    if (existing) return res.status(400).json({ error: 'Already registered for this event' });

    // Determine correct fee: paid members get fee_member, club members get club fee, others get fee
    const user = await db.get('SELECT is_paid, clubs FROM amsam_users WHERE id = ?', [req.user.id]);
    const applicableFee = resolveEventFee(event, user);

    // Free event — register directly
    if (!applicableFee || applicableFee === 0) {
      const qrCode = `AMSAM_EVENT_${crypto.randomUUID()}`;
      try {
        await db.run(
          'INSERT INTO amsam_registrations (user_id, event_id, qr_code, is_paid) VALUES (?, ?, ?, 1)',
          [req.user.id, eventId, qrCode]
        );

        // Send confirmation email for free registrations too
        const student = await db.get('SELECT name, email FROM amsam_users WHERE id = ?', [req.user.id]);
        const eventDetails = await db.get('SELECT title, event_date, venue FROM amsam_events WHERE id = ?', [eventId]);
        if (student && eventDetails) {
          sendReceiptEmail({
            toEmail:     student.email,
            studentName: student.name,
            eventTitle:  eventDetails.title,
            eventDate:   eventDetails.event_date,
            eventVenue:  eventDetails.venue,
            amountPaid:  0,
            paymentId:   'FREE',
            qrCode,
          }).catch(err => console.error('Free event confirmation email failed:', err.message));
        }

        return res.status(201).json({ message: 'Registered successfully', is_free: true, qr_code: qrCode });
      } catch (err) {
        return res.status(500).json({ error: 'Failed to register' });
      }
    }

    // Paid event — create Razorpay order
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: applicableFee * 100,
      currency: 'INR',
      receipt: `event_${eventId}_user_${req.user.id}`,
    });

    await db.run(
      'INSERT INTO amsam_payment_orders (order_id, user_id, event_id) VALUES (?, ?, ?)',
      [order.id, req.user.id, eventId]
    );

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, applicableFee });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// POST /api/registrations/:eventId/verify-payment
router.post('/:eventId/verify-payment', authenticate, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const pendingOrder = await db.get(
      'SELECT * FROM amsam_payment_orders WHERE order_id = ?',
      [razorpay_order_id]
    );
    if (!pendingOrder) return res.status(400).json({ error: 'Invalid or unknown order ID' });
    if (pendingOrder.user_id !== req.user.id || pendingOrder.event_id != eventId) {
      return res.status(403).json({ error: 'Order mismatch' });
    }
    if (pendingOrder.status !== 'created') {
      return res.status(400).json({ error: 'This payment order has already been processed' });
    }

    // Verify signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Mark order paid
    await db.run(
      'UPDATE amsam_payment_orders SET status = ? WHERE order_id = ?',
      ['paid', razorpay_order_id]
    );

    // Create registration
    const qrCode = `AMSAM_EVENT_${crypto.randomUUID()}`;
    await db.run(
      'INSERT INTO amsam_registrations (user_id, event_id, qr_code, is_paid) VALUES (?, ?, ?, 1)',
      [req.user.id, eventId, qrCode]
    );

    // Send receipt email asynchronously
    const student = await db.get('SELECT name, email, is_paid, clubs FROM amsam_users WHERE id = ?', [req.user.id]);
    const event   = await db.get('SELECT title, event_date, venue, fee, fee_member, club_fees FROM amsam_events WHERE id = ?', [eventId]);
    if (student && event) {
      const actualPaid = resolveEventFee(event, student);
      sendReceiptEmail({
        toEmail:     student.email,
        studentName: student.name,
        eventTitle:  event.title,
        eventDate:   event.event_date,
        eventVenue:  event.venue,
        amountPaid:  actualPaid,
        paymentId:   razorpay_payment_id,
        qrCode,
      }).catch(err => console.error('Receipt email failed:', err.message));
    }

    res.status(201).json({ message: 'Payment verified and registered successfully', qr_code: qrCode });
  } catch (err) {
    res.status(500).json({ error: 'Payment verification failed: ' + err.message });
  }
});

// POST /api/registrations/scan
router.post('/scan', authenticate, requireAdmin, async (req, res) => {
  try {
    const { qr_code } = req.body;
    if (!qr_code) return res.status(400).json({ error: 'QR Code is required' });

    const registration = await db.get(`
      SELECT r.*, u.name as user_name, u.college_id, e.title as event_title
      FROM amsam_registrations r
      JOIN amsam_users u ON r.user_id = u.id
      JOIN amsam_events e ON r.event_id = e.id
      WHERE r.qr_code = ?
    `, [qr_code]);

    if (!registration) return res.status(404).json({ error: 'Invalid Event QR Code' });
    res.json(registration);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/registrations/admit
router.post('/admit', authenticate, requireAdmin, async (req, res) => {
  try {
    const { qr_code } = req.body;
    if (!qr_code) return res.status(400).json({ error: 'QR Code is required' });

    const registration = await db.get('SELECT * FROM amsam_registrations WHERE qr_code = ?', [qr_code]);
    if (!registration) return res.status(404).json({ error: 'Invalid QR Code' });

    if (registration.is_admitted) {
      return res.status(400).json({ error: 'QR Code already used. Student already admitted.' });
    }

    await db.run('UPDATE amsam_registrations SET is_admitted = 1 WHERE id = ?', [registration.id]);
    res.json({ message: 'Student successfully admitted for the event' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/registrations/event/:eventId
router.get('/event/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const registrations = await db.all(`
      SELECT r.id as registration_id, r.qr_code, r.is_paid, r.is_admitted, r.created_at,
             u.id as user_id, u.name as user_name, u.email as user_email, u.phone as user_phone, 
             u.college_id, u.role
      FROM amsam_registrations r
      JOIN amsam_users u ON r.user_id = u.id
      WHERE r.event_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.eventId]);
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

// PUT /api/registrations/:id/toggle-admit
router.put('/:id/toggle-admit', authenticate, requireAdmin, async (req, res) => {
  try {
    const registration = await db.get('SELECT * FROM amsam_registrations WHERE id = ?', [req.params.id]);
    if (!registration) return res.status(404).json({ error: 'Registration not found' });

    const newStatus = registration.is_admitted ? 0 : 1;
    await db.run('UPDATE amsam_registrations SET is_admitted = ? WHERE id = ?', [newStatus, registration.id]);
    res.json({ message: 'Admission status updated', is_admitted: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle admission' });
  }
});

module.exports = router;
