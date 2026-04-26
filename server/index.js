require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
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
app.use('/api/mom', require('./routes/mom'));
app.use('/api/verify', require('./routes/verify'));
app.use('/api/registrations', require('./routes/registrations'));

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
  console.log(`👑 Super Admin: admin@amsam.in / Admin@123`);
  console.log(`🛡️  Sub Admin:  subadmin@amsam.in / SubAdmin@123`);
  console.log(`👤 Students:   arjun.sharma@aiimsmangalagiri.edu.in / Student@123\n`);
});
