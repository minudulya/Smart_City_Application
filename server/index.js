require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const fs        = require('fs');

const { initDB }           = require('./db');
const authRoutes           = require('./routes/auth');
const placesRoutes         = require('./routes/places');
const adsRoutes            = require('./routes/ads');
const announcementsRoutes  = require('./routes/announcements');
const issuesRoutes         = require('./routes/issues');
const requestsRoutes       = require('./routes/requests');
const timetableRoutes      = require('./routes/timetable');
const uploadRoutes         = require('./routes/upload');
const usersRoutes          = require('./routes/users');

const app = express();

// ── Uploads directory ──────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Security headers ────────────────────────────────────────────────────────
// crossOriginResourcePolicy: cross-origin lets the client load uploaded images
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));

// ── Body parsing ────────────────────────────────────────────────────────────
// 10 MB limit to handle base64-encoded images sent in JSON
app.use(express.json({ limit: '10mb' }));

// ── Serve uploaded images ──────────────────────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ── Rate limiting ───────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
});

// Stricter limiter for auth endpoints to slow brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

app.use('/api', apiLimiter);

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/places',        placesRoutes);
app.use('/api/ads',           adsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/issues',        issuesRoutes);
app.use('/api/requests',      requestsRoutes);
app.use('/api/timetable',     timetableRoutes);
app.use('/api/upload',        uploadRoutes);
app.use('/api/users',         usersRoutes);

// ── Serve client in production ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// ── Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err.message);
    console.error('👉 Make sure MySQL (XAMPP) is running and credentials in server/.env are correct.');
    process.exit(1);
  });
