const router = require('express').Router();
const QRCode = require('qrcode');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/verify/:userId/qr — generate QR code for a user (user gets their own, admin gets any)
router.get('/:userId/qr', authenticate, async (req, res) => {
  const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
  const isSelf  = req.user.id === parseInt(req.params.userId);
  if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Access denied' });

  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // QR encodes a verification string — admin panel will resolve it
  const qrData = `AMSAM_VERIFY_${user.id}_${user.name.replace(/\s+/g, '_').toUpperCase()}`;
  try {
    const qrDataURL = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: { dark: '#1A2040', light: '#FFFFFF' }
    });
    res.json({ qr: qrDataURL, qrData });
  } catch (e) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// GET /api/verify/:userId — get student info for QR scan result (admin only)
router.get('/:userId', authenticate, requireAdmin, (req, res) => {
  const user = db.prepare(
    'SELECT id, name, college_id, email, photo_path, role, batch, department, phone, created_at FROM users WHERE id = ?'
  ).get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
