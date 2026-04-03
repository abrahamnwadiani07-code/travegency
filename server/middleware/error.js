const { validationResult } = require('express-validator');

/**
 * validate — run after express-validator checks; returns 422 on failure
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error:  'Validation failed',
      fields: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

/**
 * notFound — catch-all for unmatched routes
 */
const notFound = (req, res, next) => {
  const err = new Error(`Not found — ${req.originalUrl}`);
  err.status = 404;
  next(err);
};

/**
 * errorHandler — global error handler
 */
const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  if (status === 500) {
    console.error('Server error:', err);
  }

  res.status(status).json({ error: message });
};

module.exports = { validate, notFound, errorHandler };
