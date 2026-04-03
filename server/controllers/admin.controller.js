const { query } = require('../db');

// ── GET /api/admin/dashboard — platform stats ──────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const [users, bookings, payments, agents] = await Promise.all([
      query(`
        SELECT
          COUNT(*)                                                    AS total,
          COUNT(*) FILTER (WHERE role = 'traveller')                  AS travellers,
          COUNT(*) FILTER (WHERE role = 'agent')                      AS agents,
          COUNT(*) FILTER (WHERE role = 'admin')                      AS admins,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_30d
        FROM users
      `),
      query(`
        SELECT
          COUNT(*)                                                    AS total,
          COUNT(*) FILTER (WHERE status = 'pending')                  AS pending,
          COUNT(*) FILTER (WHERE status = 'agent_assigned')           AS assigned,
          COUNT(*) FILTER (WHERE status = 'confirmed')                AS confirmed,
          COUNT(*) FILTER (WHERE status = 'in_progress')              AS in_progress,
          COUNT(*) FILTER (WHERE status = 'completed')                AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled')                AS cancelled,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_30d
        FROM bookings
      `),
      query(`
        SELECT
          COUNT(*)                                           AS total,
          COALESCE(SUM(amount), 0)                           AS total_amount,
          COALESCE(SUM(CASE WHEN status='in_escrow'  THEN amount END), 0) AS in_escrow,
          COALESCE(SUM(CASE WHEN status='released'   THEN amount END), 0) AS released,
          COALESCE(SUM(CASE WHEN status='refunded'   THEN amount END), 0) AS refunded
        FROM payments
      `),
      query(`
        SELECT
          COUNT(*)                                            AS total,
          COUNT(*) FILTER (WHERE status = 'active')           AS active,
          COUNT(*) FILTER (WHERE status = 'pending_review')   AS pending_review,
          COUNT(*) FILTER (WHERE status = 'suspended')        AS suspended
        FROM agents
      `),
    ]);

    // Recent bookings
    const { rows: recentBookings } = await query(`
      SELECT b.id, b.reference, b.destination, b.travel_path, b.status, b.amount, b.created_at,
        u.first_name || ' ' || u.last_name AS traveller_name
      FROM bookings b
      LEFT JOIN users u ON u.id = b.traveller_id
      ORDER BY b.created_at DESC LIMIT 10
    `);

    res.json({
      stats: {
        users:    users.rows[0],
        bookings: bookings.rows[0],
        payments: payments.rows[0],
        agents:   agents.rows[0],
      },
      recentBookings,
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/users — list all users ──────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const { role, search, limit = 50, offset = 0 } = req.query;
    const params = [];
    let sql = `
      SELECT id, role, first_name, last_name, email, phone, country,
             travel_path, is_verified, last_login, created_at
      FROM users WHERE 1=1
    `;

    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}::user_role`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at DESC`;
    params.push(parseInt(limit), parseInt(offset));
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await query(sql, params);
    res.json({ users: rows });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/users/:id — update user ──────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { role, is_verified } = req.body;
    const sets = [];
    const params = [];

    if (role !== undefined) {
      params.push(role);
      sets.push(`role = $${params.length}::user_role`);
    }
    if (is_verified !== undefined) {
      params.push(is_verified);
      sets.push(`is_verified = $${params.length}`);
    }

    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id, role, first_name, last_name, email, is_verified`,
      params
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/admin/notifications — user notifications ──────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);
    res.json({ notifications: rows });
  } catch (err) { next(err); }
};

module.exports = { getDashboard, getUsers, updateUser, getNotifications };
