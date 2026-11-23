const router = require('express').Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ── GET /api/places ────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  const search   = (req.query.q        || '').toLowerCase();
  const category = (req.query.category || '').toLowerCase();
  const limit    = req.query.limit  ? Math.min(Number(req.query.limit), 200) : null;
  const offset   = req.query.offset ? Number(req.query.offset)               : 0;

  try {
    let sql    = 'SELECT * FROM places WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND LOWER(category) = ?';
      params.push(category);
    }
    if (search) {
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(address) LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY name';
    if (limit !== null) { sql += ' LIMIT ? OFFSET ?'; params.push(limit, offset); }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch places.' });
  }
});

// ── POST /api/places ───────────────────────────────────────────────────────
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, category, address, lat, lng, phone, icon, rating, website, hours, image } = req.body;
  if (!name || !category || !address) {
    return res.status(400).json({ error: 'Name, category and address are required.' });
  }
  const safelat = Number(lat) || 0;
  const safelng = Number(lng) || 0;
  try {
    const [result] = await pool.query(
      'INSERT INTO places (name, category, address, lat, lng, phone, icon, rating, website, hours, image) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [name, category, address, safelat, safelng, phone || '', icon || '📍', rating || 0, website || '', hours || '', image || '']
    );
    res.status(201).json({
      id: result.insertId, name, category, address, lat: safelat, lng: safelng,
      phone: phone || '', icon: icon || '📍', rating: rating || 0, website: website || '', hours: hours || '', image: image || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add place.' });
  }
});

// ── PUT /api/places/:id ────────────────────────────────────────────────────
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, category, address, lat, lng, phone, icon, rating, website, hours, image } = req.body;
  if (!name || !category || !address) {
    return res.status(400).json({ error: 'Name, category and address are required.' });
  }
  const safelat = Number(lat) || 0;
  const safelng = Number(lng) || 0;
  try {
    const [result] = await pool.query(
      'UPDATE places SET name=?, category=?, address=?, lat=?, lng=?, phone=?, icon=?, rating=?, website=?, hours=?, image=? WHERE id=?',
      [name, category, address, safelat, safelng, phone || '', icon || '📍', rating || 0, website || '', hours || '', image || '', req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Place not found.' });
    const [rows] = await pool.query('SELECT * FROM places WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update place.' });
  }
});

// ── DELETE /api/places/:id ─────────────────────────────────────────────────
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM places WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete place.' });
  }
});

module.exports = router;
