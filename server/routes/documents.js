const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const xss = require('xss');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const docUploadsDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(docUploadsDir)) fs.mkdirSync(docUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docUploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /api/documents — all authenticated users can read
router.get('/', authenticate, (req, res) => {
  const docs = db.prepare(
    `SELECT d.*, u.name as created_by_name
     FROM documents d LEFT JOIN users u ON d.created_by = u.id
     ORDER BY d.created_at DESC`
  ).all();
  res.json(docs);
});

// POST /api/documents (admin/sub-admin only)
router.post('/', authenticate, requireAdmin, upload.single('file'), (req, res) => {
  const { title, description, category } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'Title and category are required' });
  if (!req.file) return res.status(400).json({ error: 'File is required' });

  const validCategories = ['MOM', 'MOU', 'Letters', 'Finance'];
  if (!validCategories.includes(category)) return res.status(400).json({ error: 'Invalid category' });

  const filePath = `/uploads/documents/${req.file.filename}`;
  
  const info = db.prepare(
    'INSERT INTO documents (title, description, category, file_path, created_by) VALUES (?,?,?,?,?)'
  ).run(xss(title), xss(description || ''), category, filePath, req.user.id);

  res.status(201).json({ message: 'Document uploaded', id: info.lastInsertRowid });
});

// DELETE /api/documents/:id (admin/sub-admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const doc = db.prepare('SELECT file_path FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  
  const fullPath = path.join(__dirname, '..', doc.file_path);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
  
  res.json({ message: 'Document deleted' });
});

// PUT /api/documents/:id (admin/sub-admin only)
router.put('/:id', authenticate, requireAdmin, upload.single('file'), (req, res) => {
  const { title, description, category } = req.body;
  const id = req.params.id;

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const validCategories = ['MOM', 'MOU', 'Letters', 'Finance'];
  if (category && !validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  let filePath = doc.file_path;
  if (req.file) {
    // Delete old file
    const oldPath = path.join(__dirname, '..', doc.file_path);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    filePath = `/uploads/documents/${req.file.filename}`;
  }

  db.prepare(
    `UPDATE documents 
     SET title = ?, description = ?, category = ?, file_path = ?
     WHERE id = ?`
  ).run(
    xss(title || doc.title), 
    xss(description || doc.description), 
    category || doc.category, 
    filePath, 
    id
  );

  res.json({ message: 'Document updated successfully' });
});

module.exports = router;
