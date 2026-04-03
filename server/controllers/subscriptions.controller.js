const { query } = require('../db');

// ── GET /api/subscriptions/plans — get available plans ──────────────────────
const getPlans = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT value FROM platform_config WHERE key = 'subscription_plans'`);
    res.json({ plans: rows[0]?.value || {} });
  } catch (err) { next(err); }
};

// ── GET /api/subscriptions/me — get user's active subscription ──────────────
const getMySubscription = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT * FROM subscriptions
      WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.id]);

    // Count today's job views
    const { rows: viewRows } = await query(`
      SELECT COUNT(*) FROM job_views WHERE user_id = $1 AND viewed_at = CURRENT_DATE
    `, [req.user.id]);

    const plan = rows[0]?.plan || 'free';
    const viewsToday = parseInt(viewRows[0].count);

    res.json({
      subscription: rows[0] || { plan: 'free', status: 'active' },
      plan,
      viewsToday,
      viewLimit: plan === 'free' ? 5 : 999,
      canViewMore: plan !== 'free' || viewsToday < 5,
    });
  } catch (err) { next(err); }
};

// ── POST /api/subscriptions — create/upgrade subscription ───────────────────
const subscribe = async (req, res, next) => {
  try {
    const { plan, gatewayRef } = req.body;
    const planConfig = { basic: 5000, pro: 15000 };
    const amount = planConfig[plan];
    if (!amount) return res.status(400).json({ error: 'Invalid plan' });

    // Deactivate old subs
    await query(`UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`, [req.user.id]);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { rows } = await query(`
      INSERT INTO subscriptions (user_id, plan, amount, currency, expires_at, gateway_ref)
      VALUES ($1, $2, $3, 'NGN', $4, $5) RETURNING *
    `, [req.user.id, plan, amount, expiresAt, gatewayRef || null]);

    res.status(201).json({ subscription: rows[0], message: `Subscribed to ${plan} plan!` });
  } catch (err) { next(err); }
};

// ── POST /api/subscriptions/cancel — cancel subscription ────────────────────
const cancel = async (req, res, next) => {
  try {
    const { rows } = await query(`
      UPDATE subscriptions SET status = 'cancelled'
      WHERE user_id = $1 AND status = 'active'
      RETURNING *
    `, [req.user.id]);
    res.json({ message: 'Subscription cancelled', subscription: rows[0] });
  } catch (err) { next(err); }
};

// ── Middleware: track job view and enforce limit ─────────────────────────────
const trackJobView = async (req, res, next) => {
  try {
    if (!req.user) { next(); return; }

    // Get subscription
    const { rows: subs } = await query(`
      SELECT plan FROM subscriptions
      WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.id]);

    const plan = subs[0]?.plan || 'free';
    req.userPlan = plan;

    if (plan !== 'free') { next(); return; }

    // Count today's views
    const { rows: views } = await query(
      `SELECT COUNT(*) FROM job_views WHERE user_id = $1 AND viewed_at = CURRENT_DATE`,
      [req.user.id]
    );

    if (parseInt(views[0].count) >= 5) {
      return res.status(403).json({
        error: 'Daily job view limit reached',
        upgradeRequired: true,
        plan: 'free',
        viewsUsed: parseInt(views[0].count),
        limit: 5,
      });
    }

    // Track this view
    if (req.params.id) {
      await query(
        `INSERT INTO job_views (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [req.user.id, req.params.id]
      ).catch(() => {});
    }

    next();
  } catch (err) { next(err); }
};

module.exports = { getPlans, getMySubscription, subscribe, cancel, trackJobView };
