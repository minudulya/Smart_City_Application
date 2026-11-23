const router = require('express').Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ── GET /api/issues ────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  const limit  = req.query.limit  ? Math.min(Number(req.query.limit), 200) : null;
  const offset = req.query.offset ? Number(req.query.offset)               : 0;

  try {
    let sql    = 'SELECT * FROM issues ORDER BY created_at DESC';
    const params = [];
    if (limit !== null) { sql = 'SELECT * FROM issues ORDER BY created_at DESC LIMIT ? OFFSET ?'; params.push(limit, offset); }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch issues.' });
  }
});

// ── POST /api/issues ───────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  const { name, issue, location, category } = req.body;
  if (!issue?.trim() || !location?.trim()) {
    return res.status(400).json({ error: 'Issue title and details are required.' });
  }
  try {
    const reporterName = name || req.user.name;
    const [result] = await pool.query(
      'INSERT INTO issues (name, issue, location, category, status) VALUES (?,?,?,?,?)',
      [reporterName, issue, location, category || 'general', 'Open']
    );
    const [rows] = await pool.query('SELECT * FROM issues WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit issue.' });
  }
});

// ── POST /api/issues/:id/update ────────────────────────────────────────────
router.post('/:id/update', authenticateToken, requireRole('admin'), async (req, res) => {
  const { status, update: note } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM issues WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Issue not found.' });

    await pool.query(
      'UPDATE issues SET status = COALESCE(?, status), note = COALESCE(?, note) WHERE id = ?',
      [status || null, note || null, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM issues WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update issue.' });
  }
});

// ── DELETE /api/issues/:id ─────────────────────────────────────────────────
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT status FROM issues WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Issue not found.' });
    if (rows[0].status !== 'Resolved') {
      return res.status(403).json({ error: 'Only resolved issues may be deleted.' });
    }
    await pool.query('DELETE FROM issues WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete issue.' });
  }
});

module.exports = router;
