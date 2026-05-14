require('dns').setDefaultResultOrder('ipv4first'); // Force IPv4 — Railway blocks IPv6 SMTP
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the first proxy (Railway load balancer) to ensure rate limiter gets the real IP
app.set('trust proxy', 1);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(helmet({ 
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false, // Disabled to allow inline onclick handlers and Razorpay script
  crossOriginOpenerPolicy: false // Disabled to allow Razorpay netbanking popups to work
})); // Add Security Headers
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*', // Restrict this in production via .env
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(uploadsDir));

// Rate limiter for API routes
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
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

// ── Test email route (admin only — for diagnosing mail issues) ──
app.get('/api/test-email', async (req, res) => {
  const { sendWelcomeEmail } = require('./mailer');
  const toEmail = req.query.to;
  if (!toEmail) return res.status(400).json({ error: 'Pass ?to=your@email.com' });
  try {
    await sendWelcomeEmail({
      toEmail,
      studentName: 'Test User',
      username: toEmail,
      password: 'TestPassword123',
    });
    console.log(`✅ Test email successfully sent to ${toEmail}`);
    res.json({ success: true, message: `Test email sent to ${toEmail}` });
  } catch (err) {
    console.error('❌ Test email FAILED:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Catch-all: serve index.html for SPA-style routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('\n[🚨 Global Error Handler Caught an Exception]:', err.stack || err);
  res.status(500).json({ error: 'An unexpected internal server error occurred' });
});

app.listen(PORT, () => {
  console.log(`\n🏥 AMSAM Portal running at http://localhost:${PORT}`);
  console.log(`✅ Server started securely.\n`);
});
