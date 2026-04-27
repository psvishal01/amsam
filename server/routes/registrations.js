const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { sendReceiptEmail } = require('../mailer');

// Ensure payment_orders table exists for secure payment verification
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_orders (
    order_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    status TEXT DEFAULT 'created',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Helper to initialize Razorpay (prevents crash if env vars missing)
function getRazorpayInstance() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// GET /api/registrations/my-registrations
router.get('/my-registrations', authenticate, (req, res) => {
  const registrations = db.prepare(`
    SELECT r.*, e.title, e.event_date, e.event_time, e.venue 
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);
  res.json(registrations);
});

// POST /api/registrations/:eventId/create-order
router.post('/:eventId/create-order', authenticate, async (req, res) => {
  const eventId = req.params.eventId;
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const existing = db.prepare('SELECT * FROM registrations WHERE user_id = ? AND event_id = ?').get(req.user.id, eventId);
  if (existing) return res.status(400).json({ error: 'Already registered for this event' });

  // If free event, just register without Razorpay
  if (!event.fee || event.fee === 0) {
    const qrCodeStr = crypto.randomUUID();
    const qrCode = `AMSAM_EVENT_${qrCodeStr}`;
    try {
      db.prepare(`INSERT INTO registrations (user_id, event_id, qr_code, is_paid) VALUES (?, ?, ?, 1)`).run(req.user.id, eventId, qrCode);
      return res.status(201).json({ message: 'Registered successfully', is_free: true, qr_code: qrCode });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to register' });
    }
  }

  try {
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: event.fee * 100, // Amount in paise
      currency: "INR",
      receipt: `event_${eventId}_user_${req.user.id}`,
    });
    
    db.prepare('INSERT INTO payment_orders (order_id, user_id, event_id) VALUES (?, ?, ?)')
      .run(order.id, req.user.id, eventId);

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create Razorpay order' });
  }
});

// POST /api/registrations/:eventId/verify-payment
router.post('/:eventId/verify-payment', authenticate, (req, res) => {
  const eventId = req.params.eventId;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details' });
  }

  // 1. Verify the order exists and belongs to this user and event
  const pendingOrder = db.prepare('SELECT * FROM payment_orders WHERE order_id = ?').get(razorpay_order_id);
  if (!pendingOrder) {
    return res.status(400).json({ error: 'Invalid or unknown order ID' });
  }
  if (pendingOrder.user_id !== req.user.id || pendingOrder.event_id != eventId) {
    return res.status(403).json({ error: 'Order mismatch: This order was not created for this user/event' });
  }
  if (pendingOrder.status !== 'created') {
    return res.status(400).json({ error: 'This payment order has already been processed' });
  }

  // 2. Verify the Razorpay signature
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  // 3. Mark the order as paid to prevent replay attacks
  db.prepare('UPDATE payment_orders SET status = ? WHERE order_id = ?').run('paid', razorpay_order_id);

  // Payment successful, create registration
  const qrCodeStr = crypto.randomUUID();
  const qrCode = `AMSAM_EVENT_${qrCodeStr}`;
  
  try {
    db.prepare(`
      INSERT INTO registrations (user_id, event_id, qr_code, is_paid)
      VALUES (?, ?, ?, 1)
    `).run(req.user.id, eventId, qrCode);

    // Send receipt email asynchronously — don't block the HTTP response
    const student = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id);
    const event   = db.prepare('SELECT title, event_date, venue, fee FROM events WHERE id = ?').get(eventId);
    if (student && event) {
      sendReceiptEmail({
        toEmail:     student.email,
        studentName: student.name,
        eventTitle:  event.title,
        eventDate:   event.event_date,
        eventVenue:  event.venue,
        amountPaid:  event.fee,
        paymentId:   razorpay_payment_id,
        qrCode,
      }).catch(err => console.error('Receipt email failed:', err.message));
    }

    res.status(201).json({ message: 'Payment verified and registered successfully', qr_code: qrCode });
  } catch (err) {
    res.status(500).json({ error: 'Payment successful but failed to save registration' });
  }
});

// POST /api/registrations/scan - Verify QR code (Admin/Sub-admin)
router.post('/scan', authenticate, requireAdmin, (req, res) => {
  const { qr_code } = req.body;
  if (!qr_code) return res.status(400).json({ error: 'QR Code is required' });

  const registration = db.prepare(`
    SELECT r.*, u.name as user_name, u.college_id, e.title as event_title
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    JOIN events e ON r.event_id = e.id
    WHERE r.qr_code = ?
  `).get(qr_code);

  if (!registration) {
    return res.status(404).json({ error: 'Invalid Event QR Code' });
  }

  res.json(registration);
});

// POST /api/registrations/admit - Mark as admitted (Admin/Sub-admin)
router.post('/admit', authenticate, requireAdmin, (req, res) => {
  const { qr_code } = req.body;
  if (!qr_code) return res.status(400).json({ error: 'QR Code is required' });

  const registration = db.prepare('SELECT * FROM registrations WHERE qr_code = ?').get(qr_code);
  if (!registration) return res.status(404).json({ error: 'Invalid QR Code' });

  if (registration.is_admitted) {
    return res.status(400).json({ error: 'QR Code already used. Student already admitted.' });
  }

  db.prepare('UPDATE registrations SET is_admitted = 1 WHERE id = ?').run(registration.id);
  res.json({ message: 'Student successfully admitted for the event' });
});

module.exports = router;
