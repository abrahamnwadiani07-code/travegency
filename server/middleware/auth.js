const jwt = require('jsonwebtoken');
const { query } = require('../db');

/**
 * Authenticate — verify JWT and attach req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await query(
      `SELECT id, role, first_name, last_name, email, is_verified FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired — please sign in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Require agent role
 */
const requireAgent = (req, res, next) => {
  if (req.user?.role !== 'agent' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Agent access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireAgent };
