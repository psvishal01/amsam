const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.get('SELECT * FROM amsam_users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        college_id: user.college_id,
        role: user.role,
        photo_path: user.photo_path
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/guest-signup
router.post('/guest-signup', async (req, res) => {
  try {
    const { name, email, password, phone, organization } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await db.get('SELECT id FROM amsam_users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    // Auto-generate a guest college_id
    const guestId = 'GUEST_' + Date.now();
    const hash = bcrypt.hashSync(password, 10);

    const result = await db.run(
      'INSERT INTO amsam_users (name, college_id, email, password_hash, role, phone, organization) VALUES (?,?,?,?,?,?,?)',
      [name.trim(), guestId, email.trim().toLowerCase(), hash, 'guest', phone || null, organization || null]
    );

    // Return token so they can log in immediately
    const user = await db.get('SELECT id, name, email, role, college_id, photo_path FROM amsam_users WHERE id = ?', [result.insertId]);
    const token = require('jsonwebtoken').sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({ token, user, message: 'Guest account created successfully' });
  } catch (err) {
    console.error('Guest signup error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/change-password

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const user = await db.get('SELECT * FROM amsam_users WHERE id = ?', [req.user.id]);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    await db.run('UPDATE amsam_users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, name, college_id, email, photo_path, role, batch, department, phone, is_paid, paid_at, created_at FROM amsam_users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
