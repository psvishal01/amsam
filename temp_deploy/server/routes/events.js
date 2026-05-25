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
      query += ` WHERE e.visibility = 'all'`;
    } else if (req.user.role === 'student') {
      query += ` WHERE e.visibility IN ('student', 'all')`;
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

    // Prevent guest from viewing student-only events
    if (req.user.role === 'guest' && event.visibility !== 'all') {
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
    const { title, description, venue, event_date, event_time, fee, visibility } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const finalVisibility = ['student', 'all'].includes(visibility) ? visibility : 'student';

    const result = await db.run(
      'INSERT INTO amsam_events (title, description, venue, event_date, event_time, fee, visibility, created_by) VALUES (?,?,?,?,?,?,?,?)',
      [
        xss(title),
        xss(description || ''),
        xss(venue || ''),
        xss(event_date || ''),
        xss(event_time || ''),
        fee || 0,
        finalVisibility,
        req.user.id
      ]
    );
    res.status(201).json({ message: 'Event created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/events/:id
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, venue, event_date, event_time, fee, visibility } = req.body;
    const ev = await db.get('SELECT * FROM amsam_events WHERE id = ?', [req.params.id]);
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    const finalVisibility = visibility !== undefined
      ? (['student', 'all'].includes(visibility) ? visibility : 'student')
      : ev.visibility;

    await db.run(
      'UPDATE amsam_events SET title=?, description=?, venue=?, event_date=?, event_time=?, fee=?, visibility=? WHERE id=?',
      [
        xss(title || ev.title),
        xss(description ?? ev.description),
        xss(venue ?? ev.venue),
        xss(event_date ?? ev.event_date),
        xss(event_time ?? ev.event_time),
        fee ?? ev.fee,
        finalVisibility,
        req.params.id
      ]
    );
    res.json({ message: 'Event updated' });
  } catch (err) {
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
