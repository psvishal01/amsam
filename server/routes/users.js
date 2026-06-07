const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../mailer');

// Multer — profile photos (disk)
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
    const ok = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase()) &&
               /jpeg|jpg|png|webp/.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only valid image files (jpeg, jpg, png, webp) are allowed'));
  }
});

// Multer — spreadsheets (memory)
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    ok ? cb(null, true) : cb(new Error('Only .xlsx, .xls or .csv files are allowed'));
  }
});

// ── GET /api/users ────────────────────────────────────────────────
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    let users;
    if (req.query.role === 'guest') {
      users = await db.all(
        'SELECT id, name, college_id, email, photo_path, role, phone, organization, created_at FROM amsam_users WHERE role = ? ORDER BY created_at DESC',
        ['guest']
      );
    } else {
      users = await db.all(
        "SELECT id, name, college_id, email, photo_path, role, batch, department, phone, is_paid, paid_at, created_at FROM amsam_users WHERE role != 'guest' ORDER BY created_at DESC"
      );
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// ── GET /api/users/import-template ────────────────────────────────
router.get('/import-template', authenticate, requireSuperAdmin, (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'College ID', 'Email', 'Batch', 'Department', 'Phone'],
    ['Arjun Sharma', 'MBBS2024001', 'arjun@aiims.edu.in', '2024', 'MBBS', '9876543210'],
  ]);
  ws['!cols'] = [20, 16, 28, 10, 14, 14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="amsam_students_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ── GET /api/users/:id ────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
    const isSelf  = req.user.id === parseInt(req.params.id);
    if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Access denied' });

    const user = await db.get(
      'SELECT id, name, college_id, email, photo_path, role, batch, department, phone, is_paid, paid_at, created_at FROM amsam_users WHERE id = ?',
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/users ───────────────────────────────────────────────
router.post('/', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { name, college_id, email, password, batch, department, phone, role, organization } = req.body;
    const userRole = role || 'student';
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password are required' });
    }
    if (userRole === 'student' && !college_id) {
      return res.status(400).json({ error: 'college_id is required for students' });
    }
    
    const finalCollegeId = (userRole === 'guest' && !college_id) ? ('GUEST_' + Date.now()) : college_id;
    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO amsam_users (name, college_id, email, password_hash, role, batch, department, phone, organization) VALUES (?,?,?,?,?,?,?,?,?)',
      [name, finalCollegeId, email.toLowerCase(), hash, userRole, batch || null, department || null, phone || null, organization || null]
    );
    res.status(201).json({ message: 'User created', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email or College ID already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/users/:id ────────────────────────────────────────────
router.put('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { name, college_id, email, batch, department, phone, role, organization } = req.body;
    const user = await db.get('SELECT * FROM amsam_users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.run(
      'UPDATE amsam_users SET name=?, college_id=?, email=?, batch=?, department=?, phone=?, role=?, organization=? WHERE id=?',
      [
        name || user.name,
        college_id || user.college_id,
        email ? email.toLowerCase() : user.email,
        batch !== undefined ? batch : user.batch,
        department !== undefined ? department : user.department,
        phone !== undefined ? phone : user.phone,
        role || user.role,
        organization !== undefined ? organization : user.organization,
        req.params.id
      ]
    );
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/users/:id ─────────────────────────────────────────
router.delete('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await db.run('DELETE FROM amsam_users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/users/bulk-delete ───────────────────────────────────
router.post('/bulk-delete', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }

    const deleted = [];
    const skipped = [];

    for (const id of ids) {
      const uid = parseInt(id);
      if (isNaN(uid)) { skipped.push({ id, reason: 'Invalid ID' }); continue; }
      if (uid === req.user.id) { skipped.push({ id: uid, reason: 'Cannot delete your own account' }); continue; }

      const target = await db.get('SELECT role FROM amsam_users WHERE id = ?', [uid]);
      if (!target) { skipped.push({ id: uid, reason: 'User not found' }); continue; }
      if (target.role === 'super_admin') { skipped.push({ id: uid, reason: 'Cannot delete a Super Admin' }); continue; }

      await db.run('DELETE FROM amsam_users WHERE id = ?', [uid]);
      deleted.push(uid);
    }

    res.json({ deleted: deleted.length, skipped, total: ids.length });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed: ' + err.message });
  }
});

// ── PUT /api/users/:id/role ───────────────────────────────────────
router.put('/:id/role', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['sub_admin', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be sub_admin or student' });
    }
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    const target = await db.get('SELECT * FROM amsam_users WHERE id = ?', [req.params.id]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'super_admin') return res.status(400).json({ error: 'Cannot change super admin role' });

    await db.run('UPDATE amsam_users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: `User role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/users/:id/photo ─────────────────────────────────────
router.post('/:id/photo', authenticate, requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const photoPath = `/uploads/${req.file.filename}`;
    await db.run('UPDATE amsam_users SET photo_path = ? WHERE id = ?', [photoPath, req.params.id]);
    res.json({ message: 'Photo uploaded', photo_path: photoPath });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/users/:id/reset-password ───────────────────────────
router.post('/:id/reset-password', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hash = bcrypt.hashSync(newPassword, 10);
    await db.run('UPDATE amsam_users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/users/:id/payment ────────────────────────────────────
router.put('/:id/payment', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { is_paid } = req.body;
    if (typeof is_paid !== 'boolean' && is_paid !== 0 && is_paid !== 1) {
      return res.status(400).json({ error: 'is_paid must be true or false' });
    }
    const paid = is_paid ? 1 : 0;
    const target = await db.get('SELECT * FROM amsam_users WHERE id = ?', [req.params.id]);
    if (!target) return res.status(404).json({ error: 'User not found' });

    await db.run(
      'UPDATE amsam_users SET is_paid = ?, paid_at = ? WHERE id = ?',
      [paid, paid ? new Date().toISOString() : null, req.params.id]
    );
    res.json({ message: paid ? 'Student marked as paid' : 'Student marked as unpaid', is_paid: paid });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Helper: generate random password ──────────────────────────────
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(12)).map(b => chars[b % chars.length]).join('');
}

// ── POST /api/users/bulk-import ───────────────────────────────────
router.post('/bulk-import', authenticate, requireSuperAdmin, memUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // sendEmail flag: look in query string first, fallback to body
    const sendEmail = (req.query.sendEmail === 'true') || (req.body.sendEmail === 'true');
    const importRole = req.query.role === 'guest' ? 'guest' : 'student';
    console.log(`Bulk import config: sendEmail=${sendEmail}, role=${importRole} (query: ${req.query.sendEmail}, body: ${req.body.sendEmail})`);

    let rows;
    try {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    } catch (e) {
      return res.status(400).json({ error: 'Failed to parse file: ' + e.message });
    }

    if (!rows.length) return res.status(400).json({ error: 'The file has no data rows.' });

    const imported_ids  = [];
    const updated_ids   = [];
    const skipped       = [];
    const newStudents   = []; // only newly inserted, for welcome emails

    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i];
      const rowNum = i + 2;

      const get = (keys) => {
        for (const k of keys) {
          const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
          if (found) return String(row[found]).trim();
        }
        return '';
      };

      const name       = get(['Name', 'Full Name', 'Student Name', 'Guest Name']);
      let college_id   = get(['College ID', 'CollegeID', 'College Id', 'college_id']);
      const email      = get(['Email', 'Email Address', 'email']);
      const phone      = get(['Phone', 'Mobile', 'phone']) || null;

      // Role-specific fields
      const batch      = importRole === 'student' ? (get(['Batch', 'Year', 'batch']) || null) : null;
      const department = importRole === 'student' ? (get(['Department', 'Dept', 'department']) || null) : null;
      const organization = importRole === 'guest' ? (get(['Organization', 'Institution', 'Org', 'organization']) || null) : null;

      if (importRole === 'guest' && !college_id) {
        college_id = `GUEST_${Date.now()}_${Math.random().toString(36).substring(2,6)}`;
      }

      if (!name || !college_id || !email) {
        skipped.push({ row: rowNum, reason: `Missing required field (Name, Email${importRole === 'student' ? ', College ID' : ''})`, data: { name, college_id, email } });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        skipped.push({ row: rowNum, reason: 'Invalid email format', data: { name, college_id, email } });
        continue;
      }

      // Check if user already exists (by email OR college_id)
      const existing = await db.get(
        'SELECT id FROM amsam_users WHERE email = ? OR college_id = ?',
        [email.toLowerCase(), college_id]
      );

      if (existing) {
        if (!sendEmail) {
          // Update mode: refresh data without touching password
          if (importRole === 'student') {
            await db.run(
              'UPDATE amsam_users SET name=?, college_id=?, email=?, batch=?, department=?, phone=? WHERE id=?',
              [name, college_id, email.toLowerCase(), batch, department, phone, existing.id]
            );
          } else {
            await db.run(
              'UPDATE amsam_users SET name=?, college_id=?, email=?, organization=?, phone=? WHERE id=?',
              [name, college_id, email.toLowerCase(), organization, phone, existing.id]
            );
          }
          updated_ids.push(existing.id);
        } else {
          // Email ON: skip duplicates (new-only mode)
          skipped.push({
            row: rowNum,
            reason: 'Already exists — skipped (email mode)',
            data: { name, college_id, email }
          });
        }
        continue;
      }

      // New user — insert
      const plainPassword = generatePassword();
      const passwordHash  = bcrypt.hashSync(plainPassword, 10);

      try {
        let result;
        if (importRole === 'student') {
          result = await db.run(
            'INSERT INTO amsam_users (name, college_id, email, password_hash, role, batch, department, phone) VALUES (?,?,?,?,?,?,?,?)',
            [name, college_id, email.toLowerCase(), passwordHash, importRole, batch, department, phone]
          );
        } else {
          result = await db.run(
            'INSERT INTO amsam_users (name, college_id, email, password_hash, role, organization, phone) VALUES (?,?,?,?,?,?,?)',
            [name, college_id, email.toLowerCase(), passwordHash, importRole, organization, phone]
          );
        }
        
        imported_ids.push(result.insertId);
        if (sendEmail) {
          newStudents.push({ name, email: email.toLowerCase(), password: plainPassword });
        }
      } catch (e) {
        skipped.push({
          row: rowNum,
          reason: e.code === 'ER_DUP_ENTRY' ? 'Duplicate email or College ID' : e.message,
          data: { name, college_id, email }
        });
      }
    }

    // Send welcome emails — awaited so we can report success/failure per student
    let emailsSent   = 0;
    const emailErrors = [];
    if (sendEmail && newStudents.length > 0) {
      const portalUrl = process.env.PORTAL_URL;
      console.log(`📧 Sending welcome emails to ${newStudents.length} student(s)...`);
      for (const student of newStudents) {
        try {
          await sendWelcomeEmail({
            toEmail:     student.email,
            studentName: student.name,
            username:    student.email,
            password:    student.password,
            portalUrl,
          });
          emailsSent++;
          console.log(`✅ Welcome email sent: ${student.email}`);
        } catch (err) {
          console.error(`❌ Welcome email FAILED for ${student.email}:`, err.message);
          emailErrors.push({ email: student.email, reason: err.message });
        }
      }
    }

    res.json({
      imported:     imported_ids.length,
      updated:      updated_ids.length,
      skipped,
      total:        rows.length,
      emailsSent,
      emailErrors,
      sendEmail,
    });
  } catch (err) {
    res.status(500).json({ error: 'Bulk import failed: ' + err.message });
  }
});

module.exports = router;
