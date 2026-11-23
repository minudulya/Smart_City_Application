const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const { authenticateToken } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

// ── POST /api/upload ───────────────────────────────────────────────────────
// Returns { url: '/uploads/<filename>' } — use as the `image` field in ads.
router.post('/', authenticateToken, (req, res) => {
  upload.single('image')(req, res, err => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum 5 MB allowed.'
        : err.message || 'Upload failed.';
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
