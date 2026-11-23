const jwt = require('jsonwebtoken');

/**
 * Middleware: verify JWT from Authorization header.
 * Attaches decoded payload to req.user on success.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, name, role, email }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

/**
 * Middleware factory: restrict access to specific roles.
 * Usage: requireRole('admin') or requireRole('admin', 'merchant')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`
      });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole };
