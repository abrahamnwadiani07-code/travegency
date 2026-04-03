const { query } = require('../db');

// ── GET /api/admin/dashboard — platform stats ──────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const [users, bookings, payments, agents, subscriptions] = await Promise.all([
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
      query(`
        SELECT
          COUNT(*)                                                     AS total,
          COUNT(*) FILTER (WHERE status = 'active')                    AS active,
          COUNT(*) FILTER (WHERE plan = 'gold')                        AS gold,
          COUNT(*) FILTER (WHERE plan = 'premium')                     AS premium,
          COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0)    AS monthly_revenue
        FROM subscriptions
      `).catch(() => ({ rows: [{ total: 0, active: 0, gold: 0, premium: 0, monthly_revenue: 0 }] })),
    ]);

    const { rows: recentBookings } = await query(`
      SELECT b.id, b.reference, b.destination, b.travel_path, b.status, b.amount, b.created_at,
        u.first_name || ' ' || u.last_name AS traveller_name
      FROM bookings b
      LEFT JOIN users u ON u.id = b.traveller_id
      ORDER BY b.created_at DESC LIMIT 10
    `);

    res.json({
      stats: {
        users:         users.rows[0],
        bookings:      bookings.rows[0],
        payments:      payments.rows[0],
        agents:        agents.rows[0],
        subscriptions: subscriptions.rows[0],
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
    if (role) { params.push(role); sql += ` AND role = $${params.length}::user_role`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`; }
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
    if (role !== undefined) { params.push(role); sets.push(`role = $${params.length}::user_role`); }
    if (is_verified !== undefined) { params.push(is_verified); sets.push(`is_verified = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    const { rows } = await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id, role, first_name, last_name, email, is_verified`, params);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
// AGENT MANAGEMENT & KYC
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/agents — list all agents with KYC status ─────────────────
const getAgents = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const params = [];
    let sql = `
      SELECT a.id, a.user_id, a.agency_name, a.license_number, a.bio, a.specializations,
             a.rating, a.total_reviews, a.status, a.kyc_status, a.kyc_documents,
             a.kyc_submitted_at, a.kyc_reviewed_at, a.kyc_reviewer_notes,
             a.created_at, a.updated_at,
             u.first_name, u.last_name, u.email, u.phone, u.country
      FROM agents a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE 1=1
    `;
    if (status) { params.push(status); sql += ` AND a.status = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (a.agency_name ILIKE $${params.length} OR u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`; }
    sql += ` ORDER BY a.created_at DESC`;
    const { rows } = await query(sql, params);
    res.json({ agents: rows });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/agents/:id/approve — approve agent ─────────────────────
const approveAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      UPDATE agents SET status = 'active', kyc_status = 'approved',
        kyc_reviewed_at = NOW(), kyc_reviewer_notes = $2
      WHERE id = $1 RETURNING *
    `, [id, req.body.notes || 'Approved by admin']);
    if (!rows.length) return res.status(404).json({ error: 'Agent not found' });

    // Notify agent
    await query(`
      INSERT INTO notifications (user_id, title, body, type)
      VALUES ($1, 'Application Approved!', 'Congratulations! Your agent application has been approved. You can now receive bookings.', 'agent_approved')
    `, [rows[0].user_id]).catch(() => {});

    res.json({ agent: rows[0], message: 'Agent approved successfully' });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/agents/:id/reject — reject agent ───────────────────────
const rejectAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { rows } = await query(`
      UPDATE agents SET status = 'rejected', kyc_status = 'rejected',
        kyc_reviewed_at = NOW(), kyc_reviewer_notes = $2
      WHERE id = $1 RETURNING *
    `, [id, reason || 'Application rejected']);
    if (!rows.length) return res.status(404).json({ error: 'Agent not found' });

    await query(`
      INSERT INTO notifications (user_id, title, body, type)
      VALUES ($1, 'Application Rejected', $2, 'agent_rejected')
    `, [rows[0].user_id, `Your agent application was not approved. Reason: ${reason || 'Does not meet requirements'}. Please update your KYC documents and resubmit.`]).catch(() => {});

    res.json({ agent: rows[0], message: 'Agent rejected' });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/agents/:id/suspend — suspend agent ─────────────────────
const suspendAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      UPDATE agents SET status = 'suspended', kyc_reviewer_notes = $2
      WHERE id = $1 RETURNING *
    `, [id, req.body.reason || 'Suspended by admin']);
    if (!rows.length) return res.status(404).json({ error: 'Agent not found' });

    await query(`
      INSERT INTO notifications (user_id, title, body, type)
      VALUES ($1, 'Account Suspended', $2, 'agent_suspended')
    `, [rows[0].user_id, `Your agent account has been suspended. Reason: ${req.body.reason || 'Policy violation'}`]).catch(() => {});

    res.json({ agent: rows[0], message: 'Agent suspended' });
  } catch (err) { next(err); }
};

// ── GET /api/admin/agents/:id/kyc — view agent KYC documents ────────────────
const getAgentKYC = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT a.*, u.first_name, u.last_name, u.email, u.phone, u.country
      FROM agents a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.id = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Agent not found' });

    // Get agent's uploaded documents
    let documents = [];
    try {
      const { rows: docs } = await query(`
        SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC
      `, [rows[0].user_id]);
      documents = docs;
    } catch (e) { /* table may not exist */ }

    res.json({ agent: rows[0], documents });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/subscriptions — list all subscriptions ───────────────────
const getSubscriptions = async (req, res, next) => {
  try {
    const { plan, status } = req.query;
    const params = [];
    let sql = `
      SELECT s.*, u.first_name, u.last_name, u.email
      FROM subscriptions s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE 1=1
    `;
    if (plan) { params.push(plan); sql += ` AND s.plan = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND s.status = $${params.length}`; }
    sql += ` ORDER BY s.created_at DESC LIMIT 100`;
    const { rows } = await query(sql, params);
    res.json({ subscriptions: rows });
  } catch (err) { next(err); }
};

// ── POST /api/admin/subscriptions/grant — grant subscription to user ────────
const grantSubscription = async (req, res, next) => {
  try {
    const { userId, plan, durationDays } = req.body;
    if (!userId || !plan) return res.status(400).json({ error: 'userId and plan required' });
    if (!['premium', 'gold'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

    // Deactivate old subs
    await query(`UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`, [userId]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (durationDays || 30));

    const { rows } = await query(`
      INSERT INTO subscriptions (user_id, plan, amount, currency, expires_at, gateway_ref)
      VALUES ($1, $2, 0, 'NGN', $3, 'admin_grant') RETURNING *
    `, [userId, plan, expiresAt]);

    await query(`
      INSERT INTO notifications (user_id, title, body, type)
      VALUES ($1, 'Subscription Granted!', $2, 'subscription_granted')
    `, [userId, `You've been granted a ${plan.toUpperCase()} subscription by the admin team. Enjoy!`]).catch(() => {});

    res.json({ subscription: rows[0], message: `Granted ${plan} to user` });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/subscriptions/:id/cancel — admin cancel subscription ───
const adminCancelSubscription = async (req, res, next) => {
  try {
    const { rows } = await query(`
      UPDATE subscriptions SET status = 'cancelled' WHERE id = $1 RETURNING *
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Subscription not found' });
    res.json({ subscription: rows[0], message: 'Subscription cancelled' });
  } catch (err) { next(err); }
};

// ── GET /api/admin/notifications — user notifications ──────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
    `, [req.user.id]);
    res.json({ notifications: rows });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT & REVENUE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/revenue — revenue analytics ──────────────────────────────
const getRevenue = async (req, res, next) => {
  try {
    const [totalRev, monthlyRev, byCurrency, byPlan, recentPayments] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM subscriptions WHERE status IN ('active', 'expired')`),
      query(`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM subscriptions WHERE created_at > NOW() - INTERVAL '30 days'`),
      query(`SELECT currency, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM subscriptions WHERE status IN ('active', 'expired') GROUP BY currency ORDER BY total DESC`),
      query(`SELECT plan, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM subscriptions WHERE status = 'active' GROUP BY plan`),
      query(`
        SELECT s.id, s.plan, s.amount, s.currency, s.status, s.created_at, s.gateway_ref,
          u.first_name, u.last_name, u.email, u.country
        FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id
        ORDER BY s.created_at DESC LIMIT 50
      `),
    ]);

    res.json({
      revenue: {
        total: totalRev.rows[0],
        monthly: monthlyRev.rows[0],
        byCurrency: byCurrency.rows,
        byPlan: byPlan.rows,
      },
      recentPayments: recentPayments.rows,
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/pricing — get current pricing config ─────────────────────
const getPricingConfig = async (req, res, next) => {
  try {
    const { PRICING, DEFAULT_PRICING } = require('../data/pricing');
    res.json({ pricing: PRICING, default: DEFAULT_PRICING });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/pricing/:country — update pricing for a country ────────
const updatePricing = async (req, res, next) => {
  try {
    const { country } = req.params;
    const { premium, gold, jobBoard, jobAutoApply, agentPlacement, matching } = req.body;

    // Store custom pricing in database (overrides file-based defaults)
    await query(`
      INSERT INTO platform_config (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
    `, [`pricing_${country}`, JSON.stringify({ premium, gold, jobBoard, jobAutoApply, agentPlacement, matching })]);

    res.json({ message: `Pricing updated for ${country}`, country, pricing: { premium, gold, jobBoard, jobAutoApply, agentPlacement, matching } });
  } catch (err) { next(err); }
};

// ── GET /api/admin/stripe/stats — Stripe account overview ───────────────────
const getStripeStats = async (req, res, next) => {
  try {
    let stripeData = { enabled: false };

    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const [balance, charges, customers] = await Promise.all([
        stripe.balance.retrieve().catch(() => ({ available: [], pending: [] })),
        stripe.charges.list({ limit: 10 }).catch(() => ({ data: [] })),
        stripe.customers.list({ limit: 5 }).catch(() => ({ data: [] })),
      ]);

      stripeData = {
        enabled: true,
        balance: {
          available: balance.available?.map(b => ({ amount: b.amount / 100, currency: b.currency.toUpperCase() })) || [],
          pending: balance.pending?.map(b => ({ amount: b.amount / 100, currency: b.currency.toUpperCase() })) || [],
        },
        recentCharges: charges.data?.map(c => ({
          id: c.id,
          amount: c.amount / 100,
          currency: c.currency.toUpperCase(),
          status: c.status,
          email: c.billing_details?.email,
          created: new Date(c.created * 1000),
        })) || [],
        totalCustomers: customers.data?.length || 0,
      };
    }

    res.json(stripeData);
  } catch (err) { next(err); }
};

// ── POST /api/admin/refund/:chargeId — issue refund ─────────────────────────
const issueRefund = async (req, res, next) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Stripe not configured' });
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { amount } = req.body; // optional partial refund amount

    const refundParams = { charge: req.params.chargeId };
    if (amount) refundParams.amount = Math.round(amount * 100);

    const refund = await stripe.refunds.create(refundParams);
    res.json({ refund: { id: refund.id, amount: refund.amount / 100, currency: refund.currency, status: refund.status } });
  } catch (err) {
    console.error('[Stripe Refund] Error:', err.message);
    next(err);
  }
};

module.exports = {
  getDashboard, getUsers, updateUser, getNotifications,
  getAgents, approveAgent, rejectAgent, suspendAgent, getAgentKYC,
  getSubscriptions, grantSubscription, adminCancelSubscription,
  getRevenue, getPricingConfig, updatePricing, getStripeStats, issueRefund,
};
