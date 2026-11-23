const router = require('express').Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ── GET /api/ads ───────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  const limit  = req.query.limit  ? Math.min(Number(req.query.limit), 200) : null;
  const offset = req.query.offset ? Number(req.query.offset)               : 0;

  try {
    let sql    = 'SELECT * FROM advertisements';
    let params = [];

    if (req.user.role === 'citizen') {
      sql += " WHERE status = 'Published'";
    } else if (req.user.role === 'merchant') {
      // Own ads (by user_id, or name fallback for legacy rows) + all published ads
      sql    += ' WHERE (user_id = ? OR (user_id IS NULL AND author = ?)) OR status = \'Published\'';
      params  = [req.user.id, req.user.name];
    }
    // admin: no WHERE — sees everything

    sql += ' ORDER BY created_at DESC';
    if (limit !== null) { sql += ' LIMIT ? OFFSET ?'; params.push(limit, offset); }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch advertisements.' });
  }
});

// ── POST /api/ads ──────────────────────────────────────────────────────────
router.post('/', authenticateToken, requireRole('merchant'), async (req, res) => {
  const { title, description, category, phone, image } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }
  try {
    const author = req.user.name;
    const [result] = await pool.query(
      'INSERT INTO advertisements (user_id, title, description, author, category, phone, image, status) VALUES (?,?,?,?,?,?,?,?)',
      [req.user.id, title, description, author, category || 'services', phone || '', image || '', 'Pending']
    );
    res.status(201).json({
      id: result.insertId, user_id: req.user.id, title, description, author,
      category: category || 'services', phone: phone || '', image: image || '', status: 'Pending',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit advertisement.' });
  }
});

// ── POST /api/ads/:id/publish ──────────────────────────────────────────────
router.post('/:id/publish', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE advertisements SET status = 'Published' WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ad not found.' });
    const [rows] = await pool.query('SELECT * FROM advertisements WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to publish ad.' });
  }
});

// ── POST /api/ads/:id/unpublish ────────────────────────────────────────────
router.post('/:id/unpublish', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE advertisements SET status = 'Unpublished' WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ad not found.' });
    const [rows] = await pool.query('SELECT * FROM advertisements WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unpublish ad.' });
  }
});

// ── DELETE /api/ads/:id ────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, author FROM advertisements WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'Ad not found.' });
    }

    const existing = rows[0];
    const isOwner = existing.user_id === req.user.id || existing.author === req.user.name;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the owner or an admin may delete this ad.' });
    }

    await pool.query('DELETE FROM advertisements WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete advertisement.' });
  }
});

module.exports = router;
