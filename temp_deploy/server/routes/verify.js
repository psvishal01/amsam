const router = require('express').Router();
const QRCode = require('qrcode');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/verify/:userId/qr
router.get('/:userId/qr', authenticate, async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
    const isSelf  = req.user.id === parseInt(req.params.userId);
    if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Access denied' });

    const user = await db.get('SELECT id, name, is_paid FROM amsam_users WHERE id = ?', [req.params.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.is_paid) {
      return res.status(402).json({
        error: 'payment_required',
        message: 'Membership fee not paid. QR code will be available once payment is confirmed by an admin.'
      });
    }

    const qrData = `AMSAM_VERIFY_${user.id}_${user.name.replace(/\s+/g, '_').toUpperCase()}`;
    const qrDataURL = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: { dark: '#1A2040', light: '#FFFFFF' }
    });
    res.json({ qr: qrDataURL, qrData });
  } catch (err) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// GET /api/verify/:userId
router.get('/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, name, college_id, email, photo_path, role, batch, department, phone, is_paid, paid_at, created_at FROM amsam_users WHERE id = ?',
      [req.params.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
