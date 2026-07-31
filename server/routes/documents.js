const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const xss = require('xss');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const docUploadsDir = path.join(__dirname, '../uploads/documents');
try { if (!fs.existsSync(docUploadsDir)) fs.mkdirSync(docUploadsDir, { recursive: true }); } catch (e) { console.warn('Could not create uploads/documents dir:', e.message); }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docUploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /api/documents
router.get('/', authenticate, async (req, res) => {
  if (req.user.role === 'guest') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const docs = await db.all(
      `SELECT d.*, u.name as created_by_name
       FROM amsam_documents d LEFT JOIN amsam_users u ON d.created_by = u.id
       ORDER BY d.created_at DESC`
    );
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/documents
router.post('/', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !category) return res.status(400).json({ error: 'Title and category are required' });
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const validCategories = ['Int', 'Ext', 'Adm', 'Ntc', 'Agr'];
    if (!validCategories.includes(category)) return res.status(400).json({ error: 'Invalid category' });

    const filePath = `/uploads/documents/${req.file.filename}`;
    const result = await db.run(
      'INSERT INTO amsam_documents (title, description, category, file_path, created_by) VALUES (?,?,?,?,?)',
      [xss(title), xss(description || ''), category, filePath, req.user.id]
    );
    res.status(201).json({ message: 'Document uploaded', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const doc = await db.get('SELECT file_path FROM amsam_documents WHERE id = ?', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    await db.run('DELETE FROM amsam_documents WHERE id = ?', [req.params.id]);

    const fullPath = path.join(__dirname, '..', doc.file_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/documents/:id
router.put('/:id', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const id = req.params.id;

    const doc = await db.get('SELECT * FROM amsam_documents WHERE id = ?', [id]);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const validCategories = ['Int', 'Ext', 'Adm', 'Ntc', 'Agr'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    let filePath = doc.file_path;
    if (req.file) {
      const oldPath = path.join(__dirname, '..', doc.file_path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      filePath = `/uploads/documents/${req.file.filename}`;
    }

    await db.run(
      'UPDATE amsam_documents SET title = ?, description = ?, category = ?, file_path = ? WHERE id = ?',
      [xss(title || doc.title), xss(description || doc.description), category || doc.category, filePath, id]
    );
    res.json({ message: 'Document updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
