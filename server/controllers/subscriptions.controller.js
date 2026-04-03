const { query } = require('../db');

// ── TIER DEFINITIONS ────────────────────────────────────────────────────────
const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    features: ['AI consultation', 'Browse agents', 'View 5 jobs/day'],
    locked: ['agent_chat', 'document_upload', 'auto_apply', 'priority_matching', 'unlimited_jobs', 'visa_tracking', 'cv_review', 'interview_prep', 'unlimited_chat', 'dedicated_agent'],
  },
  premium: {
    name: 'Premium',
    price: 15000,
    period: 'month',
    features: [
      'AI consultation',
      'Agent chat (1hr sessions)',
      'Agent matching',
      'Document upload (5 docs)',
      'Job board (unlimited)',
      'Application tracker',
      'Email notifications',
      'Basic visa guidance',
      'Save & bookmark jobs',
      'Profile optimization tips',
    ],
    locked: ['auto_apply', 'unlimited_chat', 'dedicated_agent', 'cv_review', 'interview_prep', 'visa_tracking', 'priority_matching', 'salary_negotiation'],
  },
  gold: {
    name: 'Gold',
    price: 45000,
    period: 'month',
    features: [
      'Everything in Premium',
      'Unlimited agent chat',
      'Priority agent matching',
      'Auto-apply (50 jobs/month)',
      'Dedicated placement agent',
      'CV review & optimization',
      'Interview preparation',
      'Visa tracking & updates',
      'Salary negotiation support',
      'Document review by agent',
      'Direct company introductions',
      'Weekly progress reports',
      'Phone/video consultations',
      'Money-back guarantee',
    ],
    locked: [],
  },
};

// Feature check helper
function canAccess(plan, feature) {
  const tier = TIERS[plan] || TIERS.free;
  return !tier.locked.includes(feature);
}

// ── GET /api/subscriptions/tiers — get tier definitions ─────────────────────
const getTiers = async (req, res) => {
  res.json({ tiers: TIERS });
};

// ── GET /api/subscriptions/plans — get available plans ──────────────────────
const getPlans = async (req, res, next) => {
  try {
    res.json({ plans: TIERS });
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

    const plan = rows[0]?.plan || 'free';
    const tier = TIERS[plan] || TIERS.free;

    // Count today's job views for free users
    let viewsToday = 0;
    try {
      const { rows: viewRows } = await query(`
        SELECT COUNT(*) FROM job_views WHERE user_id = $1 AND viewed_at = CURRENT_DATE
      `, [req.user.id]);
      viewsToday = parseInt(viewRows[0].count);
    } catch (e) { /* table may not exist */ }

    // Get active chat sessions
    let activeChatExpiry = null;
    try {
      const { rows: chatRows } = await query(`
        SELECT expires_at FROM chat_sessions
        WHERE user_id = $1 AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
      `, [req.user.id]);
      if (chatRows[0]) activeChatExpiry = chatRows[0].expires_at;
    } catch (e) { /* table may not exist */ }

    res.json({
      subscription: rows[0] || { plan: 'free', status: 'active' },
      plan,
      tier: tier.name,
      features: tier.features,
      locked: tier.locked,
      viewsToday,
      viewLimit: plan === 'free' ? 5 : 999,
      canViewMore: plan !== 'free' || viewsToday < 5,
      activeChatExpiry,
    });
  } catch (err) { next(err); }
};

// ── POST /api/subscriptions — create/upgrade subscription ───────────────────
const subscribe = async (req, res, next) => {
  try {
    const { plan, gatewayRef } = req.body;
    const planConfig = { premium: 15000, gold: 45000 };
    const amount = planConfig[plan];
    if (!amount) return res.status(400).json({ error: 'Invalid plan. Choose "premium" or "gold".' });

    // Deactivate old subs
    await query(`UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`, [req.user.id]);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { rows } = await query(`
      INSERT INTO subscriptions (user_id, plan, amount, currency, expires_at, gateway_ref)
      VALUES ($1, $2, $3, 'NGN', $4, $5) RETURNING *
    `, [req.user.id, plan, amount, expiresAt, gatewayRef || null]);

    res.status(201).json({
      subscription: rows[0],
      tier: TIERS[plan],
      message: `Upgraded to ${TIERS[plan].name}!`,
    });
  } catch (err) { next(err); }
};

// ── POST /api/subscriptions/chat-session — start 1hr chat session ───────────
const startChatSession = async (req, res, next) => {
  try {
    const { agentId, bookingId } = req.body;
    const userId = req.user.id;

    // Check user has premium or gold
    const { rows: subs } = await query(`
      SELECT plan FROM subscriptions
      WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC LIMIT 1
    `, [userId]);

    const plan = subs[0]?.plan || 'free';
    if (plan === 'free') {
      return res.status(403).json({
        error: 'Subscription required to chat with agents',
        upgradeRequired: true,
        tiers: { premium: TIERS.premium, gold: TIERS.gold },
      });
    }

    // Check if already has active session (gold = unlimited)
    if (plan === 'gold') {
      // Gold users get unlimited chat, set expiry far in the future
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { rows } = await query(`
        INSERT INTO chat_sessions (user_id, agent_id, booking_id, expires_at)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [userId, agentId, bookingId || null, expiresAt]);

      return res.json({ session: rows[0], unlimited: true, message: 'Gold member — unlimited chat!' });
    }

    // Premium: check if existing session is still active
    const { rows: existing } = await query(`
      SELECT * FROM chat_sessions
      WHERE user_id = $1 AND agent_id = $2 AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
    `, [userId, agentId]);

    if (existing[0]) {
      return res.json({
        session: existing[0],
        remaining: Math.max(0, new Date(existing[0].expires_at) - Date.now()),
        message: 'Chat session still active',
      });
    }

    // Premium: create 1hr session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const { rows } = await query(`
      INSERT INTO chat_sessions (user_id, agent_id, booking_id, expires_at)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [userId, agentId, bookingId || null, expiresAt]);

    res.json({
      session: rows[0],
      remaining: 3600000, // 1hr in ms
      expiresAt,
      message: 'Chat session started — 1 hour remaining',
    });
  } catch (err) { next(err); }
};

// ── GET /api/subscriptions/chat-session/:agentId — check active session ─────
const checkChatSession = async (req, res, next) => {
  try {
    const { agentId } = req.params;

    const { rows: subs } = await query(`
      SELECT plan FROM subscriptions
      WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.id]);

    const plan = subs[0]?.plan || 'free';

    if (plan === 'free') {
      return res.json({ active: false, plan: 'free', upgradeRequired: true });
    }

    if (plan === 'gold') {
      return res.json({ active: true, plan: 'gold', unlimited: true });
    }

    // Premium: check session
    const { rows } = await query(`
      SELECT * FROM chat_sessions
      WHERE user_id = $1 AND agent_id = $2 AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.id, agentId]);

    if (rows[0]) {
      const remaining = Math.max(0, new Date(rows[0].expires_at) - Date.now());
      return res.json({ active: true, plan: 'premium', remaining, expiresAt: rows[0].expires_at });
    }

    return res.json({ active: false, plan: 'premium', expired: true, message: 'Chat session expired. Start a new session.' });
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

// ── Middleware: check feature access ────────────────────────────────────────
const requireFeature = (feature) => async (req, res, next) => {
  try {
    const { rows: subs } = await query(`
      SELECT plan FROM subscriptions
      WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.id]);

    const plan = subs[0]?.plan || 'free';
    if (!canAccess(plan, feature)) {
      return res.status(403).json({
        error: `This feature requires an upgrade`,
        feature,
        currentPlan: plan,
        requiredPlan: feature === 'agent_chat' ? 'premium' : 'gold',
        upgradeRequired: true,
        tiers: { premium: TIERS.premium, gold: TIERS.gold },
      });
    }
    req.userPlan = plan;
    next();
  } catch (err) { next(err); }
};

// ── Middleware: track job view and enforce limit ─────────────────────────────
const trackJobView = async (req, res, next) => {
  try {
    if (!req.user) { next(); return; }

    const { rows: subs } = await query(`
      SELECT plan FROM subscriptions
      WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.id]);

    const plan = subs[0]?.plan || 'free';
    req.userPlan = plan;

    if (plan !== 'free') { next(); return; }

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

    if (req.params.id) {
      await query(
        `INSERT INTO job_views (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [req.user.id, req.params.id]
      ).catch(() => {});
    }

    next();
  } catch (err) { next(err); }
};

module.exports = {
  getTiers, getPlans, getMySubscription, subscribe, cancel,
  startChatSession, checkChatSession,
  requireFeature, trackJobView,
  TIERS, canAccess,
};
