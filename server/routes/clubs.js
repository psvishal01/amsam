const router = require('express').Router();
const db = require('../db');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

// ── GET /api/clubs ─────────────────────────────────────────────────
// Returns all clubs. Available to any authenticated user.
router.get('/', authenticate, async (req, res) => {
  try {
    const clubs = await db.all('SELECT * FROM amsam_clubs ORDER BY name ASC');
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/clubs/:id/members ─────────────────────────────────────
// Returns all students enrolled in a specific club. Super Admin only.
router.get('/:id/members', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const club = await db.get('SELECT * FROM amsam_clubs WHERE id = ?', [req.params.id]);
    if (!club) return res.status(404).json({ error: 'Club not found' });

    // clubs column is comma-separated club names — find users whose clubs field contains this club name
    const members = await db.all(
      `SELECT id, name, college_id, email, batch, department, phone, is_paid, paid_at, role, created_at
       FROM amsam_users
       WHERE clubs IS NOT NULL
         AND (
           clubs = ?
           OR clubs LIKE ?
           OR clubs LIKE ?
           OR clubs LIKE ?
         )
       ORDER BY name ASC`,
      [
        club.name,
        `${club.name},%`,
        `%,${club.name},%`,
        `%,${club.name}`
      ]
    );
    res.json({ club, members });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/clubs ────────────────────────────────────────────────
// Create a new club. Super Admin only.
router.post('/', authenticate, requireSuperAdmin, async (req, res) => {
  const { name, icon } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Club name is required' });
  try {
    const result = await db.run(
      'INSERT INTO amsam_clubs (name, icon) VALUES (?, ?)',
      [name.trim(), icon || '🎭']
    );
    res.status(201).json({ message: 'Club created', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A club with this name already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/clubs/:id ─────────────────────────────────────────────
// Update a club's name and/or icon. Super Admin only.
router.put('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  const { name, icon } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Club name is required' });
  try {
    const club = await db.get('SELECT * FROM amsam_clubs WHERE id = ?', [req.params.id]);
    if (!club) return res.status(404).json({ error: 'Club not found' });
    await db.run(
      'UPDATE amsam_clubs SET name = ?, icon = ? WHERE id = ?',
      [name.trim(), icon || club.icon || '🎭', req.params.id]
    );
    res.json({ message: 'Club updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A club with this name already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/clubs/:id ──────────────────────────────────────────
// Delete a club. Super Admin only.
router.delete('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const club = await db.get('SELECT * FROM amsam_clubs WHERE id = ?', [req.params.id]);
    if (!club) return res.status(404).json({ error: 'Club not found' });
    await db.run('DELETE FROM amsam_clubs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Club deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
