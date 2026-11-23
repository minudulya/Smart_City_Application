const router = require('express').Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ── GET /api/announcements ─────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  const limit  = req.query.limit  ? Math.min(Number(req.query.limit), 200) : null;
  const offset = req.query.offset ? Number(req.query.offset)               : 0;

  try {
    const base = 'SELECT * FROM announcements WHERE expires_at IS NULL OR expires_at > NOW() ORDER BY created_at DESC';
    let sql    = base;
    const params = [];
    if (limit !== null) { sql = base + ' LIMIT ? OFFSET ?'; params.push(limit, offset); }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

// ── POST /api/announcements ────────────────────────────────────────────────
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { title, message, category, expiresInHours } = req.body;
  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }
  try {
    const expiresAt = expiresInHours
      ? new Date(Date.now() + Math.max(Number(expiresInHours), 1) * 3600 * 1000)
      : null;
    let result;
    try {
      [result] = await pool.query(
        'INSERT INTO announcements (title, message, category, expires_at) VALUES (?,?,?,?)',
        [title, message, category || 'event', expiresAt]
      );
    } catch (innerErr) {
      if (innerErr.code === 'ER_BAD_FIELD_ERROR' || innerErr.code === 'ER_NO_SUCH_TABLE' || innerErr.sqlMessage?.includes('Unknown column')) {
        [result] = await pool.query(
          'INSERT INTO announcements (title, message, expires_at) VALUES (?,?,?)',
          [title, message, expiresAt]
        );
      } else {
        throw innerErr;
      }
    }
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create announcement.' });
  }
});

// ── PUT /api/announcements/:id ─────────────────────────────────────────────
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { title, message, category, expiresInHours } = req.body;
  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }
  try {
    const expiresAt = expiresInHours
      ? new Date(Date.now() + Math.max(Number(expiresInHours), 1) * 3600 * 1000)
      : null;
    let result;
    try {
      [result] = await pool.query(
        'UPDATE announcements SET title = ?, message = ?, category = ?, expires_at = ? WHERE id = ?',
        [title, message, category || 'event', expiresAt, req.params.id]
      );
    } catch (innerErr) {
      if (innerErr.code === 'ER_BAD_FIELD_ERROR' || innerErr.sqlMessage?.includes('Unknown column')) {
        [result] = await pool.query(
          'UPDATE announcements SET title = ?, message = ?, expires_at = ? WHERE id = ?',
          [title, message, expiresAt, req.params.id]
        );
      } else {
        throw innerErr;
      }
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Announcement not found.' });
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update announcement.' });
  }
});

// ── DELETE /api/announcements/:id ─────────────────────────────────────────
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete announcement.' });
  }
});

module.exports = router;
