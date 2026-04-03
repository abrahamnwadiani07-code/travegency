const { query } = require('../db');

// ── GET /api/agents — list active agents (public) ──────────────────────────────
const getAgents = async (req, res, next) => {
  try {
    const { path, status = 'active', limit = 50, offset = 0, search } = req.query;
    const params = [];
    let sql = `
      SELECT a.*,
        u.first_name, u.last_name, u.email AS user_email,
        COALESCE(
          (SELECT array_agg(ap.path::text) FROM agent_paths ap WHERE ap.agent_id = a.id), '{}'
        ) AS paths,
        (SELECT ap.path::text FROM agent_paths ap WHERE ap.agent_id = a.id AND ap.is_primary = TRUE LIMIT 1) AS primary_path
      FROM agents a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE 1=1
    `;

    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}::agent_status`;
    }
    if (path) {
      params.push(path);
      sql += ` AND EXISTS (SELECT 1 FROM agent_paths ap WHERE ap.agent_id = a.id AND ap.path = $${params.length}::travel_path)`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (a.display_name ILIKE $${params.length} OR a.location ILIKE $${params.length})`;
    }

    sql += ` ORDER BY a.rating DESC, a.total_bookings DESC`;
    params.push(parseInt(limit), parseInt(offset));
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await query(sql, params);
    res.json({ agents: rows });
  } catch (err) { next(err); }
};

// ── GET /api/agents/:id — single agent ─────────────────────────────────────────
const getAgent = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT a.*,
        u.first_name, u.last_name,
        COALESCE(
          (SELECT array_agg(ap.path::text) FROM agent_paths ap WHERE ap.agent_id = a.id), '{}'
        ) AS paths
      FROM agents a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.id = $1
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Agent not found' });

    // Get recent reviews
    const { rows: reviews } = await query(`
      SELECT r.*, u.first_name || ' ' || u.last_name AS reviewer_name
      FROM reviews r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.agent_id = $1
      ORDER BY r.created_at DESC LIMIT 10
    `, [req.params.id]);

    res.json({ agent: rows[0], reviews });
  } catch (err) { next(err); }
};

// ── GET /api/agents/match/:path — best agent for a travel path ─────────────────
const matchAgent = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT a.*, u.first_name, u.last_name,
        COALESCE(
          (SELECT array_agg(ap2.path::text) FROM agent_paths ap2 WHERE ap2.agent_id = a.id), '{}'
        ) AS paths
      FROM agents a
      JOIN agent_paths ap ON ap.agent_id = a.id
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.status = 'active' AND ap.path = $1::travel_path
      ORDER BY ap.is_primary DESC, a.rating DESC, a.total_bookings DESC
      LIMIT 5
    `, [req.params.path]);

    res.json({ agents: rows, bestMatch: rows[0] || null });
  } catch (err) { next(err); }
};

// ── POST /api/agents — create/onboard agent (admin) ───────────────────────────
const createAgent = async (req, res, next) => {
  try {
    const {
      userId, displayName, bio, location,
      experienceYrs, ratePerTrip, paths, avatarUrl,
    } = req.body;

    // Create agent profile
    const { rows } = await query(`
      INSERT INTO agents (user_id, display_name, bio, location, experience_yrs, rate_per_trip, avatar_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *
    `, [userId, displayName, bio || null, location || null, experienceYrs || 0, ratePerTrip || 0, avatarUrl || null]);

    const agent = rows[0];

    // Update user role
    await query(`UPDATE users SET role = 'agent' WHERE id = $1`, [userId]);

    // Insert agent paths
    if (paths?.length) {
      for (const p of paths) {
        await query(
          `INSERT INTO agent_paths (agent_id, path, is_primary) VALUES ($1, $2::travel_path, $3)
           ON CONFLICT DO NOTHING`,
          [agent.id, p.path || p, p.isPrimary || false]
        );
      }
    }

    res.status(201).json({ agent });
  } catch (err) { next(err); }
};

// ── PATCH /api/agents/:id/status — suspend/activate (admin) ───────────────────
const updateAgentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { rows } = await query(`
      UPDATE agents SET status = $1::agent_status,
        verified_at = CASE WHEN $1 = 'active' THEN NOW() ELSE verified_at END,
        verified_by = CASE WHEN $1 = 'active' THEN $3 ELSE verified_by END
      WHERE id = $2 RETURNING *
    `, [status, req.params.id, req.user.id]);

    if (!rows.length) return res.status(404).json({ error: 'Agent not found' });
    res.json({ agent: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/agents/me — get own agent profile ────────────────────────────────
const getMyProfile = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT a.*,
        COALESCE((SELECT array_agg(ap.path::text) FROM agent_paths ap WHERE ap.agent_id = a.id), '{}') AS paths,
        (SELECT ap.path::text FROM agent_paths ap WHERE ap.agent_id = a.id AND ap.is_primary = TRUE LIMIT 1) AS primary_path
      FROM agents a WHERE a.user_id = $1
    `, [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Agent profile not found' });
    res.json({ agent: rows[0] });
  } catch (err) { next(err); }
};

// ── PATCH /api/agents/me — update own agent profile ──────────────────────────
const updateMyProfile = async (req, res, next) => {
  try {
    const { displayName, bio, location, experienceYrs, ratePerTrip, avatarUrl } = req.body;
    const { rows } = await query(`
      UPDATE agents SET
        display_name   = COALESCE($1, display_name),
        bio            = COALESCE($2, bio),
        location       = COALESCE($3, location),
        experience_yrs = COALESCE($4, experience_yrs),
        rate_per_trip  = COALESCE($5, rate_per_trip),
        avatar_url     = COALESCE($6, avatar_url)
      WHERE user_id = $7 RETURNING *
    `, [displayName, bio, location, experienceYrs, ratePerTrip, avatarUrl, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Agent profile not found' });
    res.json({ agent: rows[0] });
  } catch (err) { next(err); }
};

// ── PATCH /api/agents/me/availability — toggle availability ──────────────────
const toggleAvailability = async (req, res, next) => {
  try {
    const { available } = req.body;
    const status = available ? 'active' : 'suspended';
    const { rows } = await query(
      `UPDATE agents SET status = $1::agent_status WHERE user_id = $2 RETURNING id, status`,
      [status, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Agent not found' });
    res.json({ agent: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/agents/me/stats — agent performance stats ──────────────────────
const getMyStats = async (req, res, next) => {
  try {
    const { rows: agentRows } = await query(`SELECT id FROM agents WHERE user_id = $1`, [req.user.id]);
    if (!agentRows.length) return res.status(404).json({ error: 'Agent not found' });
    const agentId = agentRows[0].id;

    const [bookingStats, paymentStats, reviewStats, monthlyBookings] = await Promise.all([
      query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status IN ('agent_assigned','confirmed','in_progress')) AS active,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS this_month
        FROM bookings WHERE agent_id = $1
      `, [agentId]),
      query(`
        SELECT
          COALESCE(SUM(CASE WHEN p.status='released' THEN b.agent_payout END), 0) AS total_earned,
          COALESCE(SUM(CASE WHEN p.status='in_escrow' THEN b.agent_payout END), 0) AS pending_payout,
          COUNT(*) FILTER (WHERE p.status='released') AS released_count
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        WHERE b.agent_id = $1
      `, [agentId]),
      query(`
        SELECT COUNT(*) AS total, COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS avg_rating
        FROM reviews WHERE agent_id = $1
      `, [agentId]),
      query(`
        SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS count
        FROM bookings WHERE agent_id = $1 AND created_at > NOW() - INTERVAL '6 months'
        GROUP BY month ORDER BY month
      `, [agentId]),
    ]);

    res.json({
      bookings: bookingStats.rows[0],
      payments: paymentStats.rows[0],
      reviews:  reviewStats.rows[0],
      monthlyBookings: monthlyBookings.rows,
    });
  } catch (err) { next(err); }
};

// ── POST /api/agents/apply — agent self-application ─────────────────────────
const applyAsAgent = async (req, res, next) => {
  try {
    const { displayName, bio, location, experienceYrs, ratePerTrip, paths } = req.body;

    // Check if already an agent
    const { rows: existing } = await query(`SELECT id FROM agents WHERE user_id = $1`, [req.user.id]);
    if (existing.length) return res.status(409).json({ error: 'You already have an agent profile' });

    const { rows } = await query(`
      INSERT INTO agents (user_id, display_name, bio, location, experience_yrs, rate_per_trip, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending_review')
      RETURNING *
    `, [req.user.id, displayName, bio, location, experienceYrs || 0, ratePerTrip || 0]);

    const agent = rows[0];

    if (paths?.length) {
      for (let i = 0; i < paths.length; i++) {
        const p = paths[i];
        await query(
          `INSERT INTO agent_paths (agent_id, path, is_primary) VALUES ($1, $2::travel_path, $3) ON CONFLICT DO NOTHING`,
          [agent.id, typeof p === 'string' ? p : p.path, i === 0]
        );
      }
    }

    // Notify admins
    const { rows: admins } = await query(`SELECT id FROM users WHERE role = 'admin'`);
    for (const admin of admins) {
      await query(`
        INSERT INTO notifications (user_id, title, body, type, meta)
        VALUES ($1, 'New agent application', $2, 'agent_application', $3)
      `, [admin.id, `${displayName} has applied to become an agent.`, JSON.stringify({ agentId: agent.id })]);
    }

    res.status(201).json({ agent, message: 'Application submitted for review' });
  } catch (err) { next(err); }
};

module.exports = { getAgents, getAgent, matchAgent, createAgent, updateAgentStatus, getMyProfile, updateMyProfile, toggleAvailability, getMyStats, applyAsAgent };
