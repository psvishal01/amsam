const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const crypto = require('crypto');
const db = require('../db');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../mailer');

// Multer config for profile photos (disk storage)
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
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only valid image files (jpeg, jpg, png, webp) are allowed'));
    }
  }
});

// Multer config for spreadsheet uploads (memory storage — no temp files)
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    if (ok) cb(null, true);
    else cb(new Error('Only .xlsx, .xls or .csv files are allowed'));
  }
});

// GET /api/users — all users (admin only)
router.get('/', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, name, college_id, email, photo_path, role, batch, department, phone, is_paid, paid_at, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});

// GET /api/users/:id — single user
router.get('/:id', authenticate, (req, res) => {
  const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
  const isSelf  = req.user.id === parseInt(req.params.id);
  if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Access denied' });

  const user = db.prepare(
    'SELECT id, name, college_id, email, photo_path, role, batch, department, phone, is_paid, paid_at, created_at FROM users WHERE id = ?'
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

// DELETE /api/users/bulk-delete — delete multiple students at once (super_admin only)
router.post('/bulk-delete', authenticate, requireSuperAdmin, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }

  const deleted  = [];
  const skipped  = [];

  const bulkDel = db.transaction((idList) => {
    for (const id of idList) {
      const uid = parseInt(id);
      if (isNaN(uid)) { skipped.push({ id, reason: 'Invalid ID' }); continue; }
      if (uid === req.user.id) { skipped.push({ id: uid, reason: 'Cannot delete your own account' }); continue; }

      const target = db.prepare('SELECT role FROM users WHERE id = ?').get(uid);
      if (!target) { skipped.push({ id: uid, reason: 'User not found' }); continue; }
      if (target.role === 'super_admin') { skipped.push({ id: uid, reason: 'Cannot delete a Super Admin' }); continue; }

      db.prepare('DELETE FROM users WHERE id = ?').run(uid);
      deleted.push(uid);
    }
  });

  try {
    bulkDel(ids);
    res.json({ deleted: deleted.length, skipped, total: ids.length });
  } catch (e) {
    res.status(500).json({ error: 'Bulk delete failed: ' + e.message });
  }
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

// PUT /api/users/:id/payment — mark student as paid or unpaid (super_admin only)
router.put('/:id/payment', authenticate, requireSuperAdmin, (req, res) => {
  const { is_paid } = req.body;
  if (typeof is_paid !== 'boolean' && is_paid !== 0 && is_paid !== 1) {
    return res.status(400).json({ error: 'is_paid must be true or false' });
  }
  const paid = is_paid ? 1 : 0;
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE users SET is_paid = ?, paid_at = ? WHERE id = ?')
    .run(paid, paid ? new Date().toISOString() : null, req.params.id);

  res.json({ message: paid ? 'Student marked as paid' : 'Student marked as unpaid', is_paid: paid });
});

// GET /api/users/import-template — download a sample .xlsx template (no Password column — auto-generated)
router.get('/import-template', authenticate, requireSuperAdmin, (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'College ID', 'Email', 'Batch', 'Department', 'Phone'],
    ['Arjun Sharma', 'MBBS2024001', 'arjun@aiims.edu.in', '2024', 'MBBS', '9876543210'],
  ]);
  // Set column widths
  ws['!cols'] = [20,16,28,10,14,14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="amsam_students_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Helper: generate a human-readable random password (12 chars)
function generatePassword() {
  // Uses uppercase, lowercase, digits — easy to read, hard to guess
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(12))
    .map(b => chars[b % chars.length])
    .join('');
}

// POST /api/users/bulk-import — parse spreadsheet, auto-generate passwords, send welcome emails
router.post('/bulk-import', authenticate, requireSuperAdmin, memUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let rows;
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  } catch (e) {
    return res.status(400).json({ error: 'Failed to parse file: ' + e.message });
  }

  if (!rows.length) return res.status(400).json({ error: 'The file has no data rows.' });

  const bcrypt = require('bcryptjs');

  const insertStmt = db.prepare(
    'INSERT INTO users (name, college_id, email, password_hash, role, batch, department, phone) VALUES (?,?,?,?,?,?,?,?)'
  );

  // ⚡ Validate all rows first, then insert in a single transaction
  const toInsert    = [];
  const skipped     = [];
  const imported_ids = [];

  // ── Pass 1: validate & collect rows to insert ──────────────────
  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    // Normalize column names (case-insensitive)
    const get = (keys) => {
      for (const k of keys) {
        const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
        if (found) return String(row[found]).trim();
      }
      return '';
    };

    const name       = get(['Name', 'Full Name', 'Student Name']);
    const college_id = get(['College ID', 'CollegeID', 'College Id', 'college_id']);
    const email      = get(['Email', 'Email Address', 'email']);
    const batch      = get(['Batch', 'Year', 'batch'])           || null;
    const department = get(['Department', 'Dept', 'department']) || null;
    const phone      = get(['Phone', 'Mobile', 'phone'])         || null;

    if (!name || !college_id || !email) {
      skipped.push({ row: rowNum, reason: 'Missing required field (Name, College ID, or Email)', data: { name, college_id, email } });
      continue;
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped.push({ row: rowNum, reason: 'Invalid email format', data: { name, college_id, email } });
      continue;
    }

    // ✨ Auto-generate a unique password for each student
    const plainPassword = generatePassword();
    const passwordHash  = bcrypt.hashSync(plainPassword, 10);

    toInsert.push({ rowNum, name, college_id, email: email.toLowerCase(), plainPassword, passwordHash, batch, department, phone });
  }

  // ── Pass 2: insert all valid rows in ONE transaction ───────────
  const successfulStudents = [];

  const bulkInsert = db.transaction((records) => {
    for (const r of records) {
      try {
        insertStmt.run(r.name, r.college_id, r.email, r.passwordHash, 'student', r.batch, r.department, r.phone);
        imported_ids.push(r.rowNum);
        successfulStudents.push({ name: r.name, email: r.email, password: r.plainPassword });
      } catch (e) {
        skipped.push({
          row: r.rowNum,
          reason: e.message.includes('UNIQUE') ? 'Duplicate email or College ID' : e.message,
          data: { name: r.name, college_id: r.college_id, email: r.email }
        });
      }
    }
  });

  try {
    bulkInsert(toInsert);
  } catch (e) {
    return res.status(500).json({ error: 'Transaction failed. Please check your data and try again.' });
  }

  // ── Pass 3: send welcome emails asynchronously (fire & forget) ─
  // We respond immediately and let emails send in the background so the
  // admin is not left waiting if the mail server is slow.
  const portalUrl = process.env.PORTAL_URL;
  setImmediate(() => {
    for (const student of successfulStudents) {
      sendWelcomeEmail({
        toEmail:     student.email,
        studentName: student.name,
        username:    student.email,
        password:    student.password,
        portalUrl,
      }).catch(err => console.error(`Welcome email failed for ${student.email}:`, err.message));
    }
  });

  res.json({ imported: imported_ids.length, skipped, total: rows.length, emailsSent: successfulStudents.length });
});

module.exports = router;
