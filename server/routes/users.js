const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const db = require('../db');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

// Multer config for profile photos
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user_${req.params.id || req.user.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// GET /api/users — all users (admin only)
router.get('/', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, name, college_id, email, photo_path, role, batch, department, phone, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});

// GET /api/users/:id — single user
router.get('/:id', authenticate, (req, res) => {
  const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
  const isSelf  = req.user.id === parseInt(req.params.id);
  if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Access denied' });

  const user = db.prepare(
    'SELECT id, name, college_id, email, photo_path, role, batch, department, phone, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/users — create student (super_admin only)
router.post('/', authenticate, requireSuperAdmin, (req, res) => {
  const { name, college_id, email, password, batch, department, phone } = req.body;
  if (!name || !college_id || !email || !password) {
    return res.status(400).json({ error: 'name, college_id, email, password are required' });
  }
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare(
      'INSERT INTO users (name, college_id, email, password_hash, role, batch, department, phone) VALUES (?,?,?,?,?,?,?,?)'
    ).run(name, college_id, email.toLowerCase(), hash, 'student', batch || null, department || null, phone || null);
    res.status(201).json({ message: 'Student created', id: info.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email or College ID already exists' });
    throw e;
  }
});

// PUT /api/users/:id — update student info (super_admin only)
router.put('/:id', authenticate, requireSuperAdmin, (req, res) => {
  const { name, college_id, email, batch, department, phone } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare(
    'UPDATE users SET name=?, college_id=?, email=?, batch=?, department=?, phone=? WHERE id=?'
  ).run(
    name || user.name,
    college_id || user.college_id,
    email ? email.toLowerCase() : user.email,
    batch || user.batch,
    department || user.department,
    phone || user.phone,
    req.params.id
  );
  res.json({ message: 'User updated' });
});

// DELETE /api/users/:id (super_admin only)
router.delete('/:id', authenticate, requireSuperAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

// PUT /api/users/:id/role — promote/demote (super_admin only)
router.put('/:id/role', authenticate, requireSuperAdmin, (req, res) => {
  const { role } = req.body;
  if (!['sub_admin', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Role must be sub_admin or student' });
  }
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'super_admin') return res.status(400).json({ error: 'Cannot change super admin role' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: `User role updated to ${role}` });
});

// POST /api/users/:id/photo — upload photo (admin only)
router.post('/:id/photo', authenticate, requireAdmin, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const photoPath = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE users SET photo_path = ? WHERE id = ?').run(photoPath, req.params.id);
  res.json({ message: 'Photo uploaded', photo_path: photoPath });
});

// POST /api/users/:id/reset-password — admin resets a student password
router.post('/:id/reset-password', authenticate, requireSuperAdmin, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ message: 'Password reset successfully' });
});

module.exports = router;
