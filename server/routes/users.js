const router = require('express').Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ── GET /api/users ─────────────────────────────────────────────────────────
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, username, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ── PUT /api/users/:id/role ────────────────────────────────────────────────
router.put('/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'merchant', 'citizen'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin, merchant, or citizen.' });
  }
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found.' });
    const [rows] = await pool.query(
      'SELECT id, email, username, name, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// ── DELETE /api/users/:id ──────────────────────────────────────────────────
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found.' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
