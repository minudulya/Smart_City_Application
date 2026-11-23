const router = require('express').Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ── GET /api/requests ──────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  const limit  = req.query.limit  ? Math.min(Number(req.query.limit), 200) : null;
  const offset = req.query.offset ? Number(req.query.offset)               : 0;

  try {
    let sql    = 'SELECT * FROM requests';
    let params = [];

    if (req.user.role !== 'admin') {
      // Filter by user_id, with name fallback for legacy rows created before user_id existed
      sql    += ' WHERE user_id = ? OR (user_id IS NULL AND name = ?)';
      params  = [req.user.id, req.user.name];
    }

    sql += ' ORDER BY created_at DESC';
    if (limit !== null) { sql += ' LIMIT ? OFFSET ?'; params.push(limit, offset); }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch requests.' });
  }
});

// ── POST /api/requests ─────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  const { requestType, details } = req.body;
  if (!requestType?.trim() || !details?.trim()) {
    return res.status(400).json({ error: 'Request type and details are required.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO requests (user_id, name, request_type, details, status) VALUES (?,?,?,?,?)',
      [req.user.id, req.user.name, requestType, details, 'Pending']
    );
    const [rows] = await pool.query('SELECT * FROM requests WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit request.' });
  }
});

// ── POST /api/requests/:id/reply ───────────────────────────────────────────
router.post('/:id/reply', authenticateToken, requireRole('admin'), async (req, res) => {
  const { response } = req.body;
  if (!response) {
    return res.status(400).json({ error: 'A response message is required.' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM requests WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Request not found.' });

    await pool.query(
      "UPDATE requests SET status = 'Responded', response = ? WHERE id = ?",
      [response, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reply to request.' });
  }
});

// ── PUT /api/requests/:id ───────────────────────────────────────────────────
router.put('/:id', authenticateToken, async (req, res) => {
  const { requestType, details } = req.body;
  if (!requestType || !details) {
    return res.status(400).json({ error: 'Request type and details are required.' });
  }

  try {
    const [rows] = await pool.query('SELECT user_id, name FROM requests WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Request not found.' });

    const existing = rows[0];
    const isSender = existing.user_id === req.user.id || existing.name === req.user.name;
    if (!isSender) {
      return res.status(403).json({ error: 'Only the original requester may edit this request.' });
    }

    await pool.query(
      'UPDATE requests SET request_type = ?, details = ?, status = ? WHERE id = ?',
      [requestType, details, 'Pending', req.params.id]
    );
    const [updatedRows] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    res.json(updatedRows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update request.' });
  }
});

// ── DELETE /api/requests/:id ───────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, name FROM requests WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Request not found.' });

    const existing = rows[0];
    const isSender = existing.user_id === req.user.id || existing.name === req.user.name;
    if (!isSender && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the requester or an admin may delete this request.' });
    }

    await pool.query('DELETE FROM requests WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete request.' });
  }
});

module.exports = router;
