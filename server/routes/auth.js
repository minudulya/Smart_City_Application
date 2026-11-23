const router  = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? LIMIT 1',
      [username.trim()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password.' });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, username, password, name } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const displayName = (name && name.trim()) || username;

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
      [email.trim().toLowerCase(), username.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with that email or username already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, username, name, role, password_hash) VALUES (?,?,?,?,?)',
      [email.trim().toLowerCase(), username.trim(), displayName, 'citizen', hash]
    );

    const newUser = {
      id: result.insertId,
      email: email.trim().toLowerCase(),
      username: username.trim(),
      name: displayName,
      role: 'citizen',
    };

    const token = signToken(newUser);
    res.status(201).json({ token, user: newUser });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, username, name, role FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/auth/password ─────────────────────────────────────────────────
router.put('/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
