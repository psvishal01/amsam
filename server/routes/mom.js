const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/mom — all authenticated users can read
router.get('/', authenticate, (req, res) => {
  const moms = db.prepare(
    `SELECT m.*, u.name as created_by_name
     FROM mom m LEFT JOIN users u ON m.created_by = u.id
     ORDER BY m.meeting_date DESC`
  ).all();
  res.json(moms);
});

// GET /api/mom/:id
router.get('/:id', authenticate, (req, res) => {
  const mom = db.prepare('SELECT * FROM mom WHERE id = ?').get(req.params.id);
  if (!mom) return res.status(404).json({ error: 'MOM not found' });
  res.json(mom);
});

// POST /api/mom (admin/sub-admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, meeting_date, attendees, agenda, notes, action_items } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const info = db.prepare(
    'INSERT INTO mom (title, meeting_date, attendees, agenda, notes, action_items, created_by) VALUES (?,?,?,?,?,?,?)'
  ).run(
    title,
    meeting_date || '',
    Array.isArray(attendees) ? JSON.stringify(attendees) : (attendees || '[]'),
    agenda || '',
    notes || '',
    Array.isArray(action_items) ? JSON.stringify(action_items) : (action_items || '[]'),
    req.user.id
  );
  res.status(201).json({ message: 'MOM created', id: info.lastInsertRowid });
});

// PUT /api/mom/:id (admin/sub-admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { title, meeting_date, attendees, agenda, notes, action_items } = req.body;
  const mom = db.prepare('SELECT * FROM mom WHERE id = ?').get(req.params.id);
  if (!mom) return res.status(404).json({ error: 'MOM not found' });
  db.prepare(
    'UPDATE mom SET title=?, meeting_date=?, attendees=?, agenda=?, notes=?, action_items=? WHERE id=?'
  ).run(
    title || mom.title,
    meeting_date ?? mom.meeting_date,
    Array.isArray(attendees) ? JSON.stringify(attendees) : (attendees ?? mom.attendees),
    agenda ?? mom.agenda,
    notes ?? mom.notes,
    Array.isArray(action_items) ? JSON.stringify(action_items) : (action_items ?? mom.action_items),
    req.params.id
  );
  res.json({ message: 'MOM updated' });
});

// DELETE /api/mom/:id (admin/sub-admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM mom WHERE id = ?').run(req.params.id);
  res.json({ message: 'MOM deleted' });
});

module.exports = router;
