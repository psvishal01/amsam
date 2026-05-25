require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Project root is one level above /server — works regardless of where the folder is hosted
const PROJECT_ROOT = path.resolve(__dirname, '..');

app.set('trust proxy', 1);

// Ensure uploads directory exists
const uploadsDir = path.join(PROJECT_ROOT, 'server', 'uploads');
try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { console.warn('Could not create uploads dir:', e.message); }

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false
}));

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(PROJECT_ROOT, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/events', require('./routes/events'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/verify', require('./routes/verify'));
app.use('/api/registrations', require('./routes/registrations'));

// Test email route
app.get('/api/test-email', async (req, res) => {
  const { sendWelcomeEmail } = require('./mailer');
  const toEmail = req.query.to;
  if (!toEmail) return res.status(400).json({ error: 'Pass ?to=your@email.com' });
  try {
    await sendWelcomeEmail({ toEmail, studentName: 'Test User', username: toEmail, password: 'TestPassword123' });
    res.json({ success: true, message: `Test email sent to ${toEmail}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all SPA route
app.get('*', (req, res) => {
  const indexPath = path.join(PROJECT_ROOT, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[🚨 sendFile Error]:', err.message, '| Path tried:', indexPath);
      res.status(404).send('Page not found. Check server logs.');
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('\n[🚨 Global Error]:', err.stack || err);
  res.status(500).json({ error: 'An unexpected internal server error occurred' });
});

// ── Start server only after DB is ready ──────────────────────────
db.initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🏥 AMSAM Portal running at http://localhost:${PORT}`);
      console.log(`✅ Server started successfully.\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialise database. Server not started.', err);
    process.exit(1);
  });
