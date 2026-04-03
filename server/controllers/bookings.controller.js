const { query, getClient } = require('../db');
const { v4: uuidv4 }       = require('uuid');
const emailSvc             = require('../services/email');

// ── Generate booking reference ────────────────────────────────────────────────
const makeRef = (path) =>
  `TRG-${path.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;

// ── GET /api/bookings  (traveller sees own, admin sees all) ───────────────────
const getBookings = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { status, path, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT
        b.*,
        u.first_name || ' ' || u.last_name AS traveller_name, u.email AS traveller_email,
        a.display_name AS agent_name
      FROM bookings b
      LEFT JOIN users  u ON u.id = b.traveller_id
      LEFT JOIN agents a ON a.id = b.agent_id
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin) {
      params.push(req.user.id);
      sql += ` AND b.traveller_id = $${params.length}`;
    }
    if (status) { params.push(status); sql += ` AND b.status = $${params.length}`; }
    if (path)   { params.push(path);   sql += ` AND b.travel_path = $${params.length}`; }

    sql += ` ORDER BY b.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await query(sql, params);
    res.json({ bookings: rows });
  } catch (err) { next(err); }
};

// ── GET /api/bookings/:id ─────────────────────────────────────────────────────
const getBooking = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT b.*,
        u.first_name || ' ' || u.last_name AS traveller_name, u.email AS traveller_email,
        a.display_name AS agent_name, a.location AS agent_location,
        p.status AS payment_status, p.amount AS payment_amount, p.currency
      FROM bookings b
      LEFT JOIN users    u ON u.id = b.traveller_id
      LEFT JOIN agents   a ON a.id = b.agent_id
      LEFT JOIN payments p ON p.booking_id = b.id
      WHERE b.id = $1
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });

    const b = rows[0];
    // Only owner or admin can see
    if (req.user.role !== 'admin' && b.traveller_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ booking: b });
  } catch (err) { next(err); }
};

// ── POST /api/bookings  — create booking, auto-assign agent ─────────────────
const createBooking = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      travelPath, service, destination,
      travelDate, amount, notes, extraData,
    } = req.body;

    const PLATFORM_FEE = parseFloat(process.env.PLATFORM_FEE_PERCENT || 5) / 100;
    const fee          = parseFloat((amount * PLATFORM_FEE).toFixed(2));
    const payout       = parseFloat((amount - fee).toFixed(2));
    const reference    = makeRef(travelPath);

    // Auto-match best available agent for this path
    const { rows: agentRows } = await client.query(`
      SELECT a.id FROM agents a
      JOIN agent_paths ap ON ap.agent_id = a.id
      WHERE a.status = 'active' AND ap.path = $1
      ORDER BY ap.is_primary DESC, a.rating DESC, a.total_bookings ASC
      LIMIT 1
    `, [travelPath]);

    const agentId = agentRows[0]?.id || null;

    const { rows } = await client.query(`
      INSERT INTO bookings
        (reference, traveller_id, agent_id, travel_path, service,
         destination, travel_date, amount, platform_fee, agent_payout,
         status, notes, extra_data)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
              $11,$12,$13)
      RETURNING *
    `, [
      reference, req.user.id, agentId, travelPath, service,
      destination, travelDate || null, amount, fee, payout,
      agentId ? 'agent_assigned' : 'pending',
      notes || null, JSON.stringify(extraData || {}),
    ]);

    const booking = rows[0];

    // Create payment record (unpaid — traveller pays separately)
    await client.query(`
      INSERT INTO payments (booking_id, payer_id, amount, currency)
      VALUES ($1,$2,$3,'NGN')
    `, [booking.id, req.user.id, amount]);

    // Update agent booking count
    if (agentId) {
      await client.query(
        `UPDATE agents SET total_bookings = total_bookings + 1 WHERE id = $1`, [agentId]
      );
    }

    // Notify traveller
    await client.query(`
      INSERT INTO notifications (user_id, title, body, type, meta)
      VALUES ($1,$2,$3,'booking', $4)
    `, [
      req.user.id,
      'Booking created',
      `Your booking to ${destination} has been created. Ref: ${reference}`,
      JSON.stringify({ bookingId: booking.id, reference }),
    ]);

    await client.query('COMMIT');

    // Send emails (non-blocking)
    const { rows: userRows } = await query(
      `SELECT first_name, email FROM users WHERE id = $1`, [req.user.id]
    );
    if (userRows.length) {
      emailSvc.sendWelcome({
        to: userRows[0].email, firstName: userRows[0].first_name,
        path: travelPath, reference,
      }).catch(console.error);
    }

    res.status(201).json({ booking, reference });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── PATCH /api/bookings/:id/status  — update booking status ─────────────────
const updateStatus = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { status, cancelReason } = req.body;
    const bookingId = req.params.id;

    const { rows: current } = await client.query(
      `SELECT * FROM bookings WHERE id = $1`, [bookingId]
    );
    if (!current.length) return res.status(404).json({ error: 'Booking not found' });

    const booking = current[0];

    // Auth: admin can do anything; traveller can only cancel
    if (req.user.role !== 'admin' && status !== 'cancelled') {
      return res.status(403).json({ error: 'Only admins can change this status' });
    }

    const extras = {};
    if (status === 'confirmed')    extras.confirmed_at  = new Date();
    if (status === 'completed')    extras.completed_at  = new Date();
    if (status === 'cancelled') {
      extras.cancelled_at  = new Date();
      extras.cancelled_by  = req.user.id;
      extras.cancel_reason = cancelReason || null;
    }

    const { rows } = await client.query(`
      UPDATE bookings SET status = $1,
        confirmed_at  = COALESCE($2, confirmed_at),
        completed_at  = COALESCE($3, completed_at),
        cancelled_at  = COALESCE($4, cancelled_at),
        cancelled_by  = COALESCE($5, cancelled_by),
        cancel_reason = COALESCE($6, cancel_reason)
      WHERE id = $7 RETURNING *
    `, [
      status,
      extras.confirmed_at || null, extras.completed_at || null,
      extras.cancelled_at || null, extras.cancelled_by || null,
      extras.cancel_reason || null,
      bookingId,
    ]);

    // Handle payment on completion
    if (status === 'completed') {
      await client.query(`
        UPDATE payments SET status = 'released', released_at = NOW()
        WHERE booking_id = $1
      `, [bookingId]);
    }
    if (status === 'cancelled') {
      await client.query(`
        UPDATE payments SET status = 'refunded', refunded_at = NOW()
        WHERE booking_id = $1
      `, [bookingId]);
    }

    await client.query('COMMIT');
    res.json({ booking: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── GET /api/bookings/:id/messages ────────────────────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT m.*, u.first_name || ' ' || u.last_name AS sender_name, u.role AS sender_role
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.booking_id = $1
      ORDER BY m.created_at ASC
    `, [req.params.id]);
    res.json({ messages: rows });
  } catch (err) { next(err); }
};

// ── POST /api/bookings/:id/messages ──────────────────────────────────────────
const sendMessage = async (req, res, next) => {
  try {
    const { body } = req.body;
    const { rows } = await query(`
      INSERT INTO messages (booking_id, sender_id, body)
      VALUES ($1,$2,$3) RETURNING *
    `, [req.params.id, req.user.id, body]);
    res.status(201).json({ message: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/bookings/search?ref=  — search by reference ────────────────────
const searchBookings = async (req, res, next) => {
  try {
    const { ref, destination, status, traveller } = req.query;
    const isAdmin = req.user.role === 'admin';
    const params = [];
    let sql = `
      SELECT b.*, u.first_name || ' ' || u.last_name AS traveller_name, u.email AS traveller_email,
        a.display_name AS agent_name
      FROM bookings b
      LEFT JOIN users u ON u.id = b.traveller_id
      LEFT JOIN agents a ON a.id = b.agent_id
      WHERE 1=1
    `;
    if (!isAdmin) { params.push(req.user.id); sql += ` AND (b.traveller_id = $${params.length} OR b.agent_id IN (SELECT id FROM agents WHERE user_id = $${params.length}))`; }
    if (ref) { params.push(`%${ref}%`); sql += ` AND b.reference ILIKE $${params.length}`; }
    if (destination) { params.push(`%${destination}%`); sql += ` AND b.destination ILIKE $${params.length}`; }
    if (status) { params.push(status); sql += ` AND b.status = $${params.length}`; }
    if (traveller) { params.push(`%${traveller}%`); sql += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`; }
    sql += ` ORDER BY b.created_at DESC LIMIT 50`;
    const { rows } = await query(sql, params);
    res.json({ bookings: rows });
  } catch (err) { next(err); }
};

module.exports = { getBookings, getBooking, createBooking, updateStatus, getMessages, sendMessage, searchBookings };
