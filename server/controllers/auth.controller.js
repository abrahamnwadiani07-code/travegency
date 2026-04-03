const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const { query } = require('../db');
const email     = require('../services/email');

// ── Helper: sign JWT ──────────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const {
      firstName, lastName, email: userEmail, phone,
      password, country, travelPath, destination,
      travelDate, notes, extraData,
    } = req.body;

    // Check duplicate
    const { rows: existing } = await query(
      `SELECT id FROM users WHERE email = $1`, [userEmail.toLowerCase()]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash         = await bcrypt.hash(password, 12);
    const verifyToken  = crypto.randomBytes(32).toString('hex');

    const { rows } = await query(`
      INSERT INTO users
        (first_name, last_name, email, phone, password_hash,
         country, travel_path, destination, travel_date, notes,
         extra_data, verify_token)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id, role, first_name, last_name, email, travel_path, is_verified
    `, [
      firstName, lastName, userEmail.toLowerCase(), phone, hash,
      country, travelPath || null, destination || null,
      travelDate || null, notes || null,
      JSON.stringify(extraData || {}), verifyToken,
    ]);

    const user = rows[0];

    // Send verification email (non-blocking)
    email.sendVerificationEmail({
      to: userEmail, firstName, token: verifyToken,
    }).catch(console.error);

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      token:   signToken(user.id),
      user:    { id: user.id, firstName, lastName, email: userEmail, travelPath, role: user.role },
    });
  } catch (err) { next(err); }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email: userEmail, password } = req.body;

    const { rows } = await query(
      `SELECT id, role, first_name, last_name, email, password_hash, is_verified, travel_path
       FROM users WHERE email = $1`,
      [userEmail.toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user    = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    // Update last login
    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

    res.json({
      token: signToken(user.id),
      user: {
        id:         user.id,
        role:       user.role,
        firstName:  user.first_name,
        lastName:   user.last_name,
        email:      user.email,
        travelPath: user.travel_path,
        isVerified: user.is_verified,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, role, first_name, last_name, email, phone,
              country, travel_path, destination, travel_date,
              notes, is_verified, last_login, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
};

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const { rows } = await query(
      `UPDATE users SET is_verified = TRUE, verify_token = NULL
       WHERE verify_token = $1 RETURNING id, first_name`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired token' });
    res.json({ message: 'Email verified successfully' });
  } catch (err) { next(err); }
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email: userEmail } = req.body;
    const { rows } = await query(
      `SELECT id, first_name FROM users WHERE email = $1`, [userEmail.toLowerCase()]
    );
    // Always respond 200 to prevent email enumeration
    if (rows.length) {
      const token   = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600 * 1000); // 1 hr
      await query(
        `UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3`,
        [token, expires, rows[0].id]
      );
      email.sendPasswordReset({ to: userEmail, firstName: rows[0].first_name, token }).catch(console.error);
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
};

// ── POST /api/auth/reset-password ────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const { rows } = await query(
      `SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()`, [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired reset token' });
    const hash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2`,
      [hash, rows[0].id]
    );
    res.json({ message: 'Password reset successfully' });
  } catch (err) { next(err); }
};

// ── PATCH /api/auth/profile — update own profile ────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, country, destination, travelDate, notes } = req.body;
    const { rows } = await query(`
      UPDATE users SET
        first_name  = COALESCE($1, first_name),
        last_name   = COALESCE($2, last_name),
        phone       = COALESCE($3, phone),
        country     = COALESCE($4, country),
        destination = COALESCE($5, destination),
        travel_date = COALESCE($6, travel_date),
        notes       = COALESCE($7, notes)
      WHERE id = $8
      RETURNING id, role, first_name, last_name, email, phone, country, travel_path, destination, travel_date, notes, is_verified
    `, [firstName, lastName, phone, country, destination, travelDate, notes, req.user.id]);
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
};

// ── POST /api/auth/change-password ──────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, verifyEmail, forgotPassword, resetPassword, updateProfile, changePassword };
