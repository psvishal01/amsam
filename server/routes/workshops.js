const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const xss = require('xss');
const crypto = require('crypto');
const Razorpay = require('razorpay');

function getRazorpayInstance() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// Helper: fetch workshop with live seat counts
async function getWorkshopWithCounts(id) {
  return db.get(`
    SELECT w.*,
      (SELECT COUNT(*) FROM amsam_workshop_registrations r WHERE r.workshop_id = w.id AND r.seat_type = 'member')      AS member_registered,
      (SELECT COUNT(*) FROM amsam_workshop_registrations r WHERE r.workshop_id = w.id AND r.seat_type = 'non_member')  AS non_member_registered,
      (SELECT COUNT(*) FROM amsam_workshop_registrations r WHERE r.workshop_id = w.id AND r.seat_type = 'club')        AS club_registered
    FROM amsam_workshops w WHERE w.id = ?
  `, [id]);
}

// Helper: determine seat type + fee for this user, or throw if full
function resolveSeatType(w, user) {
  const isMember   = user && user.is_paid === 1;
  const userClubs  = user && user.clubs ? user.clubs.split(',').map(c => c.trim().toLowerCase()) : [];

  // Parse multi-club slots (new format)
  let clubSlots = [];
  try { if (w.club_slots) clubSlots = JSON.parse(w.club_slots); } catch(e) {}

  // Also support legacy single club_name
  if (!clubSlots.length && w.club_name) {
    clubSlots = [{ club: w.club_name, seats: w.seats_club || 0, fee: w.fee_club || 0 }];
  }

  // Find if user belongs to any club that has a slot in this workshop
  const matchedSlot = clubSlots.find(slot => slot.club && userClubs.includes(slot.club.trim().toLowerCase()));

  if (isMember) {
    if (w.seats_member > 0 && w.member_registered >= w.seats_member) {
      throw Object.assign(new Error('No member seats available for this workshop'), { statusCode: 400 });
    }
    return { seatType: 'member', fee: w.fee_member || 0 };
  } else if (matchedSlot) {
    if (matchedSlot.seats > 0 && w.club_registered >= w.seats_club) {
      throw Object.assign(new Error('No club seats available for this workshop'), { statusCode: 400 });
    }
    return { seatType: 'club', fee: matchedSlot.fee || 0 };
  } else {
    if (w.seats_non_member > 0 && w.non_member_registered >= w.seats_non_member) {
      throw Object.assign(new Error('No non-member seats available for this workshop'), { statusCode: 400 });
    }
    return { seatType: 'non_member', fee: w.fee_non_member || 0 };
  }
}

// ── GET /api/workshops/my/registrations  (MUST be before /:id) ────────────
router.get('/my/registrations', authenticate, async (req, res) => {
  try {
    const regs = await db.all(`
      SELECT r.seat_type, r.registered_at, w.id as workshop_id,
             w.title, w.workshop_date, w.workshop_to_date, w.workshop_time, w.venue
      FROM amsam_workshop_registrations r
      JOIN amsam_workshops w ON r.workshop_id = w.id
      WHERE r.user_id = ?
      ORDER BY r.registered_at DESC
    `, [req.user.id]);
    res.json(regs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/workshops  ───────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT w.*,
        (SELECT COUNT(*) FROM amsam_workshop_registrations r WHERE r.workshop_id = w.id AND r.seat_type = 'member')      AS member_registered,
        (SELECT COUNT(*) FROM amsam_workshop_registrations r WHERE r.workshop_id = w.id AND r.seat_type = 'non_member')  AS non_member_registered,
        (SELECT COUNT(*) FROM amsam_workshop_registrations r WHERE r.workshop_id = w.id AND r.seat_type = 'club')        AS club_registered
      FROM amsam_workshops w
    `;
    
    if (req.user.role === 'guest') {
      query += ` WHERE (w.visibility LIKE '%all%' OR w.visibility LIKE '%guest%')`;
    } else if (req.user.role === 'student') {
      query += ` WHERE (w.visibility LIKE '%student%' OR w.visibility LIKE '%all%')`;
    } else if (req.user.role === 'pg_student' || req.user.role === 'rda') {
      query += ` WHERE (w.visibility LIKE '%rda%' OR w.visibility LIKE '%all%')`;
    }

    query += ` ORDER BY w.workshop_date DESC`;

    const workshops = await db.all(query);
    res.json(workshops);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/workshops/:id ────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const w = await getWorkshopWithCounts(req.params.id);
    if (!w) return res.status(404).json({ error: 'Workshop not found' });
    
    const vis = (w.visibility || '').toLowerCase();
    if (req.user.role === 'guest' && !vis.includes('all') && !vis.includes('guest')) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role === 'student' && !vis.includes('student') && !vis.includes('all')) {
      return res.status(403).json({ error: 'Access denied' });
    } else if ((req.user.role === 'pg_student' || req.user.role === 'rda') && !vis.includes('rda') && !vis.includes('all')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(w);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/workshops  (admin only) ─────────────────────────────────────
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, venue, workshop_date, workshop_to_date, workshop_time,
            seats_member, seats_non_member, seats_club, club_name,
            fee_member, fee_non_member, fee_club, club_slots, visibility } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let finalVisibility = 'student';
    if (typeof visibility === 'string') {
      const parts = visibility.split(',').map(s => s.trim().toLowerCase()).filter(s => ['student', 'all', 'rda', 'guest'].includes(s));
      if (parts.length > 0) finalVisibility = [...new Set(parts)].join(',');
    } else if (Array.isArray(visibility)) {
      const parts = visibility.map(s => String(s).trim().toLowerCase()).filter(s => ['student', 'all', 'rda', 'guest'].includes(s));
      if (parts.length > 0) finalVisibility = [...new Set(parts)].join(',');
    }

    // Derive aggregate club seats/name from club_slots if provided
    let finalClubSlots = null;
    let totalClubSeats = parseInt(seats_club) || 0;
    let firstClubName  = xss(club_name || '');
    let firstClubFee   = parseInt(fee_club) || 0;
    if (Array.isArray(club_slots) && club_slots.length > 0) {
      finalClubSlots = JSON.stringify(club_slots.map(s => ({ club: xss(s.club || ''), seats: parseInt(s.seats) || 0, fee: parseInt(s.fee) || 0 })));
      totalClubSeats = club_slots.reduce((sum, s) => sum + (parseInt(s.seats) || 0), 0);
      firstClubName  = xss(club_slots[0].club || '');
      firstClubFee   = parseInt(club_slots[0].fee) || 0;
    }

    const result = await db.run(
      `INSERT INTO amsam_workshops
         (title, description, venue, workshop_date, workshop_to_date, workshop_time,
          seats_member, seats_non_member, seats_club, club_name,
          fee_member, fee_non_member, fee_club, club_slots, visibility, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        xss(title),
        xss(description || ''),
        xss(venue || ''),
        xss(workshop_date || ''),
        xss(workshop_to_date || ''),
        xss(workshop_time || ''),
        parseInt(seats_member)     || 0,
        parseInt(seats_non_member) || 0,
        totalClubSeats,
        firstClubName,
        parseInt(fee_member)       || 0,
        parseInt(fee_non_member)   || 0,
        firstClubFee,
        finalClubSlots,
        finalVisibility,
        req.user.id
      ]
    );
    res.status(201).json({ message: 'Workshop created', id: result.insertId });
  } catch (err) {
    console.error('[Workshop POST Error]', err.message, err.stack);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── PUT /api/workshops/:id  (admin only) ──────────────────────────────────
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, venue, workshop_date, workshop_to_date, workshop_time,
            seats_member, seats_non_member, seats_club, club_name,
            fee_member, fee_non_member, fee_club, club_slots, visibility } = req.body;
    const w = await db.get('SELECT * FROM amsam_workshops WHERE id = ?', [req.params.id]);
    if (!w) return res.status(404).json({ error: 'Workshop not found' });

    let finalVisibility = w.visibility;
    if (visibility !== undefined) {
      if (typeof visibility === 'string') {
        const parts = visibility.split(',').map(s => s.trim().toLowerCase()).filter(s => ['student', 'all', 'rda', 'guest'].includes(s));
        if (parts.length > 0) finalVisibility = [...new Set(parts)].join(',');
      } else if (Array.isArray(visibility)) {
        const parts = visibility.map(s => String(s).trim().toLowerCase()).filter(s => ['student', 'all', 'rda', 'guest'].includes(s));
        if (parts.length > 0) finalVisibility = [...new Set(parts)].join(',');
      }
    }

    // Derive aggregate club seats/name from club_slots if provided
    let finalClubSlots = w.club_slots !== undefined ? w.club_slots : null;
    let totalClubSeats = seats_club !== undefined ? parseInt(seats_club) : w.seats_club;
    let firstClubName  = club_name !== undefined ? xss(club_name) : w.club_name;
    let firstClubFee   = fee_club !== undefined ? parseInt(fee_club) : w.fee_club;
    if (Array.isArray(club_slots)) {
      finalClubSlots = club_slots.length > 0
        ? JSON.stringify(club_slots.map(s => ({ club: xss(s.club || ''), seats: parseInt(s.seats) || 0, fee: parseInt(s.fee) || 0 })))
        : null;
      totalClubSeats = club_slots.reduce((sum, s) => sum + (parseInt(s.seats) || 0), 0);
      firstClubName  = club_slots.length > 0 ? xss(club_slots[0].club || '') : '';
      firstClubFee   = club_slots.length > 0 ? parseInt(club_slots[0].fee) || 0 : 0;
    }

    await db.run(
      `UPDATE amsam_workshops
       SET title=?, description=?, venue=?, workshop_date=?, workshop_to_date=?, workshop_time=?,
           seats_member=?, seats_non_member=?, seats_club=?, club_name=?,
           fee_member=?, fee_non_member=?, fee_club=?, club_slots=?, visibility=?
       WHERE id=?`,
      [
        xss(title || w.title),
        xss(description ?? w.description),
        xss(venue ?? w.venue),
        xss(workshop_date ?? w.workshop_date),
        xss(workshop_to_date ?? w.workshop_to_date),
        xss(workshop_time ?? w.workshop_time),
        seats_member     !== undefined ? parseInt(seats_member)     : w.seats_member,
        seats_non_member !== undefined ? parseInt(seats_non_member) : w.seats_non_member,
        totalClubSeats,
        firstClubName,
        fee_member     !== undefined ? parseInt(fee_member)     : w.fee_member,
        fee_non_member !== undefined ? parseInt(fee_non_member) : w.fee_non_member,
        firstClubFee,
        finalClubSlots,
        finalVisibility,
        req.params.id
      ]
    );
    res.json({ message: 'Workshop updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/workshops/:id  (admin only) ───────────────────────────────
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM amsam_workshops WHERE id = ?', [req.params.id]);
    res.json({ message: 'Workshop deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/workshops/:id/create-order  (student — starts payment) ──────
// This route: checks seats, determines fee, creates Razorpay order (or free registration)
router.post('/:id/create-order', authenticate, async (req, res) => {
  try {
    const workshopId = parseInt(req.params.id);
    const userId = req.user.id;

    // Already registered?
    const existing = await db.get(
      'SELECT * FROM amsam_workshop_registrations WHERE workshop_id = ? AND user_id = ?',
      [workshopId, userId]
    );
    if (existing) return res.status(400).json({ error: 'Already registered for this workshop' });

    // Fetch workshop with seat counts
    const w = await getWorkshopWithCounts(workshopId);
    if (!w) return res.status(404).json({ error: 'Workshop not found' });

    // Fetch user profile
    const user = await db.get('SELECT is_paid, clubs FROM amsam_users WHERE id = ?', [userId]);

    // Resolve seat type + applicable fee (throws 400 if full)
    let seatType, fee;
    try {
      ({ seatType, fee } = resolveSeatType(w, user));
    } catch (err) {
      return res.status(err.statusCode || 400).json({ error: err.message });
    }

    // FREE — register immediately
    if (!fee || fee === 0) {
      const qrCode = `WS_${workshopId}_${userId}_${crypto.randomUUID().split('-')[0]}`;
      await db.run(
        'INSERT INTO amsam_workshop_registrations (workshop_id, user_id, seat_type, qr_code, is_paid) VALUES (?,?,?,?,1)',
        [workshopId, userId, seatType, qrCode]
      );
      return res.status(201).json({ is_free: true, message: 'Registered successfully', seat_type: seatType });
    }

    // PAID — create Razorpay order
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: fee * 100,
      currency: 'INR',
      receipt: `ws_${workshopId}_user_${userId}`
    });

    // Store pending order — reuse amsam_payment_orders (add workshop_id col if needed)
    // We encode the workshop info in notes so we don't need a schema change
    await db.run(
      'INSERT INTO amsam_payment_orders (order_id, user_id, event_id) VALUES (?,?,?)',
      [order.id, userId, -(workshopId)]   // negative ID = workshop
    );

    res.json({
      orderId:    order.id,
      amount:     order.amount,
      currency:   order.currency,
      keyId:      process.env.RAZORPAY_KEY_ID,
      fee,
      seatType,
      workshopId
    });
  } catch (err) {
    console.error('[Workshop create-order error]', err.message);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── POST /api/workshops/:id/verify-payment  (student — confirms payment) ──
router.post('/:id/verify-payment', authenticate, async (req, res) => {
  try {
    const workshopId = parseInt(req.params.id);
    const userId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, seat_type } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Validate pending order
    const pendingOrder = await db.get(
      'SELECT * FROM amsam_payment_orders WHERE order_id = ?',
      [razorpay_order_id]
    );
    if (!pendingOrder) return res.status(400).json({ error: 'Invalid or unknown order ID' });
    if (pendingOrder.user_id !== userId || pendingOrder.event_id !== -(workshopId)) {
      return res.status(403).json({ error: 'Order mismatch' });
    }
    if (pendingOrder.status !== 'created') {
      return res.status(400).json({ error: 'This payment order has already been processed' });
    }

    // Verify Razorpay signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Re-check seats (prevent race condition)
    const alreadyReg = await db.get(
      'SELECT * FROM amsam_workshop_registrations WHERE workshop_id = ? AND user_id = ?',
      [workshopId, userId]
    );
    if (alreadyReg) return res.status(400).json({ error: 'Already registered' });

    const w    = await getWorkshopWithCounts(workshopId);
    const user = await db.get('SELECT is_paid, clubs FROM amsam_users WHERE id = ?', [userId]);
    let resolvedSeat;
    try {
      resolvedSeat = resolveSeatType(w, user);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // Mark order paid
    await db.run(
      'UPDATE amsam_payment_orders SET status = ? WHERE order_id = ?',
      ['paid', razorpay_order_id]
    );

    // Create registration
    const qrCode = `WS_${workshopId}_${userId}_${crypto.randomUUID().split('-')[0]}`;
    await db.run(
      'INSERT INTO amsam_workshop_registrations (workshop_id, user_id, seat_type, qr_code, is_paid) VALUES (?,?,?,?,1)',
      [workshopId, userId, resolvedSeat.seatType, qrCode]
    );

    res.status(201).json({ message: 'Payment verified and registered successfully', qr_code: qrCode });
  } catch (err) {
    console.error('[Workshop verify-payment error]', err.message);
    res.status(500).json({ error: 'Payment verification failed: ' + err.message });
  }
});

// ── DELETE /api/workshops/:id/register  (cancel registration) ─────────────
router.delete('/:id/register', authenticate, async (req, res) => {
  try {
    const reg = await db.get(
      'SELECT * FROM amsam_workshop_registrations WHERE workshop_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!reg) return res.status(404).json({ error: 'Registration not found' });
    await db.run('DELETE FROM amsam_workshop_registrations WHERE id = ?', [reg.id]);
    res.json({ message: 'Registration cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/workshops/:id/registrations  (admin) ─────────────────────────
router.get('/:id/registrations', authenticate, requireAdmin, async (req, res) => {
  try {
    const regs = await db.all(`
      SELECT r.id, r.seat_type, r.registered_at,
             u.id as user_id, u.name, u.email, u.college_id, u.phone, u.is_paid, u.clubs
      FROM amsam_workshop_registrations r
      JOIN amsam_users u ON r.user_id = u.id
      WHERE r.workshop_id = ?
      ORDER BY r.registered_at DESC
    `, [req.params.id]);
    res.json(regs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── (Moved to top, before /:id) ────────────────────────────────────────────

module.exports = router;
