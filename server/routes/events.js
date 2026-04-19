const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/events — all users can read
router.get('/', authenticate, (req, res) => {
  const events = db.prepare(
    `SELECT e.*, u.name as created_by_name
     FROM events e LEFT JOIN users u ON e.created_by = u.id
     ORDER BY e.event_date DESC`
  ).all();
  res.json(events);
});

// GET /api/events/:id
router.get('/:id', authenticate, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// POST /api/events (admin/sub-admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, description, venue, event_date, event_time } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const info = db.prepare(
    'INSERT INTO events (title, description, venue, event_date, event_time, created_by) VALUES (?,?,?,?,?,?)'
  ).run(title, description || '', venue || '', event_date || '', event_time || '', req.user.id);
  res.status(201).json({ message: 'Event created', id: info.lastInsertRowid });
});

// PUT /api/events/:id (admin/sub-admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { title, description, venue, event_date, event_time } = req.body;
  const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  db.prepare(
    'UPDATE events SET title=?, description=?, venue=?, event_date=?, event_time=? WHERE id=?'
  ).run(
    title || ev.title,
    description ?? ev.description,
    venue ?? ev.venue,
    event_date ?? ev.event_date,
    event_time ?? ev.event_time,
    req.params.id
  );
  res.json({ message: 'Event updated' });
});

// DELETE /api/events/:id (admin/sub-admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ message: 'Event deleted' });
});

module.exports = router;
