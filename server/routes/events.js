const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const xss = require('xss');

// GET /api/events
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT e.*, u.name as created_by_name
      FROM amsam_events e LEFT JOIN amsam_users u ON e.created_by = u.id
    `;
    let params = [];

    // Filter events by visibility depending on role
    if (req.user.role === 'guest') {
      query += ` WHERE (e.visibility LIKE '%all%' OR e.visibility LIKE '%guest%')`;
    } else if (req.user.role === 'student') {
      query += ` WHERE (e.visibility LIKE '%student%' OR e.visibility LIKE '%all%')`;
    } else if (req.user.role === 'pg_student' || req.user.role === 'rda') {
      query += ` WHERE (e.visibility LIKE '%rda%' OR e.visibility LIKE '%all%')`;
    } // Admins can see all events

    query += ` ORDER BY e.event_date DESC`;

    const events = await db.all(query, params);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const event = await db.get('SELECT * FROM amsam_events WHERE id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Prevent guest from viewing student/RDA-only events
    const vis = (event.visibility || '').toLowerCase();
    if (req.user.role === 'guest' && !vis.includes('all') && !vis.includes('guest')) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role === 'student' && !vis.includes('student') && !vis.includes('all')) {
      return res.status(403).json({ error: 'Access denied' });
    } else if ((req.user.role === 'pg_student' || req.user.role === 'rda') && !vis.includes('rda') && !vis.includes('all')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/events
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, venue, event_date, event_time, fee, fee_member, club_fees, visibility } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let finalVisibility = 'student';
    if (typeof visibility === 'string') {
      const parts = visibility.split(',').map(s => s.trim().toLowerCase()).filter(s => ['student', 'all', 'rda', 'guest'].includes(s));
      if (parts.length > 0) finalVisibility = [...new Set(parts)].join(',');
    } else if (Array.isArray(visibility)) {
      const parts = visibility.map(s => String(s).trim().toLowerCase()).filter(s => ['student', 'all', 'rda', 'guest'].includes(s));
      if (parts.length > 0) finalVisibility = [...new Set(parts)].join(',');
    }

    let finalClubFees = null;
    if (Array.isArray(club_fees) && club_fees.length > 0) {
      finalClubFees = JSON.stringify(club_fees.map(c => ({ club: xss(c.club || ''), fee: parseInt(c.fee) || 0 })));
    }

    const result = await db.run(
      'INSERT INTO amsam_events (title, description, venue, event_date, event_time, fee, fee_member, club_fees, visibility, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [
        xss(title),
        xss(description || ''),
        xss(venue || ''),
        xss(event_date || ''),
        xss(event_time || ''),
        parseInt(fee) || 0,
        parseInt(fee_member) || 0,
        finalClubFees,
        finalVisibility,
        req.user.id
      ]
    );
    res.status(201).json({ message: 'Event created', id: result.insertId });
  } catch (err) {
    console.error('[Event POST Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/events/:id
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, venue, event_date, event_time, fee, fee_member, club_fees, visibility } = req.body;
    const ev = await db.get('SELECT * FROM amsam_events WHERE id = ?', [req.params.id]);
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    let finalVisibility = ev.visibility;
    if (visibility !== undefined) {
      if (typeof visibility === 'string') {
        const parts = visibility.split(',').map(s => s.trim().toLowerCase()).filter(s => ['student', 'all', 'rda', 'guest'].includes(s));
        if (parts.length > 0) finalVisibility = [...new Set(parts)].join(',');
      } else if (Array.isArray(visibility)) {
        const parts = visibility.map(s => String(s).trim().toLowerCase()).filter(s => ['student', 'all', 'rda', 'guest'].includes(s));
        if (parts.length > 0) finalVisibility = [...new Set(parts)].join(',');
      }
    }

    let finalClubFees = ev.club_fees !== undefined ? ev.club_fees : null;
    if (Array.isArray(club_fees)) {
      finalClubFees = club_fees.length > 0
        ? JSON.stringify(club_fees.map(c => ({ club: xss(c.club || ''), fee: parseInt(c.fee) || 0 })))
        : null;
    }

    await db.run(
      'UPDATE amsam_events SET title=?, description=?, venue=?, event_date=?, event_time=?, fee=?, fee_member=?, club_fees=?, visibility=? WHERE id=?',
      [
        xss(title || ev.title),
        xss(description ?? ev.description),
        xss(venue ?? ev.venue),
        xss(event_date ?? ev.event_date),
        xss(event_time ?? ev.event_time),
        fee !== undefined ? parseInt(fee) : ev.fee,
        fee_member !== undefined ? parseInt(fee_member) : (ev.fee_member || 0),
        finalClubFees,
        finalVisibility,
        req.params.id
      ]
    );
    res.json({ message: 'Event updated' });
  } catch (err) {
    console.error('[Event PUT Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM amsam_events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
