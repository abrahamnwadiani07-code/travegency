const { query } = require('../db');
const { v4: uuidv4 } = require('uuid');

// ── Message security: block contact info sharing ────────────────────────────
const BLOCKED_PATTERNS = [
  /\b\d{10,15}\b/g,                          // phone numbers (10-15 digits)
  /\+\d{1,4}[\s.-]?\d{4,14}/g,              // international phone
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
  /(?:whatsapp|wa\.me|whats\s*app)\s*[:\s]?\s*[\d+]/gi,     // whatsapp
  /(?:instagram|ig|insta)\s*[:\s]?\s*@?\w+/gi,               // instagram
  /(?:telegram|tg)\s*[:\s]?\s*@?\w+/gi,                      // telegram
  /(?:facebook|fb)\s*[:\s]?\s*[\/\w]+/gi,                    // facebook
  /(?:twitter|x\.com)\s*[:\s]?\s*@?\w+/gi,                   // twitter/x
  /(?:linkedin)\s*[:\s]?\s*[\/\w]+/gi,                       // linkedin
  /(?:snapchat|snap)\s*[:\s]?\s*@?\w+/gi,                    // snapchat
  /(?:tiktok)\s*[:\s]?\s*@?\w+/gi,                           // tiktok
  /(?:skype)\s*[:\s]?\s*[\w.]+/gi,                           // skype
  /(?:zoom\.us|meet\.google)\s*[\/\w]+/gi,                   // zoom/meet links
];

function sanitizeMessage(text) {
  let sanitized = text;
  let blocked = false;
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(sanitized)) {
      blocked = true;
      sanitized = sanitized.replace(pattern, '[BLOCKED — keep conversations on Tragency for your safety]');
    }
    pattern.lastIndex = 0; // reset regex
  }
  return { sanitized, blocked };
}

// ── GET /api/sessions/active — get user's active sessions ───────────────────
const getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows } = await query(`
      SELECT s.*,
        CASE WHEN s.traveller_id = $1 THEN au.first_name || ' ' || au.last_name ELSE tu.first_name || ' ' || tu.last_name END AS other_name,
        CASE WHEN s.traveller_id = $1 THEN au.email ELSE tu.email END AS other_email,
        CASE WHEN s.traveller_id = $1 THEN 'agent' ELSE 'traveller' END AS other_role,
        b.reference AS booking_ref, b.destination, b.travel_path
      FROM agent_sessions s
      LEFT JOIN users tu ON tu.id = s.traveller_id
      LEFT JOIN users au ON au.id = s.agent_id
      LEFT JOIN bookings b ON b.id = s.booking_id
      WHERE (s.traveller_id = $1 OR s.agent_id = $1)
      ORDER BY s.created_at DESC
    `, [userId]);

    // Mark expired sessions
    const now = new Date();
    const sessions = rows.map(s => ({
      ...s,
      isExpired: new Date(s.expires_at) < now && s.status === 'active',
      timeLeft: Math.max(0, new Date(s.expires_at) - now),
    }));

    res.json({ sessions });
  } catch (err) { next(err); }
};

// ── POST /api/sessions/start — start 1hr free chat or pay for 1 month ──────
const startSession = async (req, res, next) => {
  try {
    const { agentId, bookingId, type } = req.body; // type: 'trial' (1hr) or 'monthly'
    const travellerId = req.user.id;

    if (!agentId) return res.status(400).json({ error: 'agentId required' });

    // Check existing active session
    const { rows: existing } = await query(`
      SELECT * FROM agent_sessions
      WHERE traveller_id = $1 AND agent_id = $2 AND status = 'active' AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
    `, [travellerId, agentId]);

    if (existing[0]) {
      return res.json({
        session: existing[0],
        timeLeft: Math.max(0, new Date(existing[0].expires_at) - Date.now()),
        message: 'Session already active',
      });
    }

    // Determine duration and cost
    let expiresAt = new Date();
    let amount = 0;

    if (type === 'monthly') {
      // Check payment/subscription
      const { rows: subs } = await query(`
        SELECT plan FROM subscriptions
        WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC LIMIT 1
      `, [travellerId]);

      const plan = subs[0]?.plan || 'free';
      if (plan === 'gold') {
        // Gold users get unlimited — 1 year session
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        amount = 0;
      } else {
        // Monthly session — 30 days
        expiresAt.setDate(expiresAt.getDate() + 30);
        amount = 15000;
      }
    } else {
      // Trial — 1 hour
      expiresAt.setHours(expiresAt.getHours() + 1);
      amount = 0;
    }

    const { rows } = await query(`
      INSERT INTO agent_sessions (traveller_id, agent_id, booking_id, amount, expires_at, status)
      VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *
    `, [travellerId, agentId, bookingId || null, amount, expiresAt]);

    // Notify agent
    await query(`
      INSERT INTO notifications (user_id, title, body, type)
      VALUES ($1, 'New Session Started', $2, 'session_started')
    `, [agentId, `A traveller has started a ${type === 'monthly' ? '1-month' : '1-hour trial'} session with you.`]).catch(() => {});

    res.json({
      session: rows[0],
      timeLeft: expiresAt - Date.now(),
      expiresAt,
      message: type === 'monthly' ? '1-month session activated!' : '1-hour trial started',
    });
  } catch (err) { next(err); }
};

// ── POST /api/sessions/:id/renew — renew for another month ─────────────────
const renewSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows: session } = await query(`SELECT * FROM agent_sessions WHERE id = $1`, [id]);
    if (!session.length) return res.status(404).json({ error: 'Session not found' });
    if (session[0].traveller_id !== req.user.id) return res.status(403).json({ error: 'Not your session' });

    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    const { rows } = await query(`
      UPDATE agent_sessions SET expires_at = $2, status = 'active', renewed_at = NOW(), reminder_sent = FALSE
      WHERE id = $1 RETURNING *
    `, [id, newExpiry]);

    // Notify agent
    await query(`
      INSERT INTO notifications (user_id, title, body, type)
      VALUES ($1, 'Session Renewed', 'Your session has been renewed for another month!', 'session_renewed')
    `, [session[0].agent_id]).catch(() => {});

    res.json({ session: rows[0], message: 'Session renewed for 30 days!' });
  } catch (err) { next(err); }
};

// ── POST /api/sessions/check-expiry — cron job: check expired sessions ──────
const checkExpiry = async (req, res, next) => {
  try {
    // Send reminders for sessions expiring in 3 days
    const { rows: expiring } = await query(`
      SELECT s.*, u.first_name, u.last_name
      FROM agent_sessions s
      LEFT JOIN users u ON u.id = s.traveller_id
      WHERE s.status = 'active' AND s.reminder_sent = FALSE
        AND s.expires_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
    `);

    for (const s of expiring) {
      await query(`
        INSERT INTO notifications (user_id, title, body, type, meta)
        VALUES ($1, 'Session Expiring Soon', $2, 'session_expiring', $3)
      `, [s.traveller_id,
          `Your session with your agent expires in 3 days. Renew now to keep your conversation going.`,
          JSON.stringify({ sessionId: s.id, agentId: s.agent_id })]).catch(() => {});

      await query(`UPDATE agent_sessions SET reminder_sent = TRUE WHERE id = $1`, [s.id]);
    }

    // Grey out expired sessions
    const { rows: expired } = await query(`
      UPDATE agent_sessions SET status = 'expired'
      WHERE status = 'active' AND expires_at < NOW()
      RETURNING *
    `);

    for (const s of expired) {
      await query(`
        INSERT INTO notifications (user_id, title, body, type)
        VALUES ($1, 'Session Expired', 'Your agent session has expired. Renew to continue your conversation.', 'session_expired')
      `, [s.traveller_id]).catch(() => {});
    }

    res.json({ reminders: expiring.length, expired: expired.length });
  } catch (err) { next(err); }
};

// ── POST /api/sessions/message — send message with security filter ──────────
const sendSecureMessage = async (req, res, next) => {
  try {
    const { bookingId, body: rawBody } = req.body;
    if (!bookingId || !rawBody?.trim()) return res.status(400).json({ error: 'bookingId and message body required' });

    // Sanitize message
    const { sanitized, blocked } = sanitizeMessage(rawBody.trim());

    // Save message
    const { rows } = await query(`
      INSERT INTO messages (booking_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *
    `, [bookingId, req.user.id, sanitized]);

    if (blocked) {
      res.json({
        message: rows[0],
        warning: 'Some content was blocked. For your safety, please keep all communication on Tragency.',
      });
    } else {
      res.json({ message: rows[0] });
    }
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
// VIDEO CALLS (Jitsi Meet)
// ══════════════════════════════════════════════════════════════════════════════

// ── POST /api/sessions/video/start — create video call room ─────────────────
const startVideoCall = async (req, res, next) => {
  try {
    const { sessionId, receiverId, bookingId } = req.body;
    const callerId = req.user.id;

    // Check active session exists
    if (sessionId) {
      const { rows: session } = await query(`
        SELECT * FROM agent_sessions WHERE id = $1 AND status = 'active' AND expires_at > NOW()
      `, [sessionId]);
      if (!session.length) return res.status(403).json({ error: 'No active session. Please renew your session first.' });
    }

    // Generate unique room ID
    const roomId = `tragency-${uuidv4().slice(0, 8)}`;

    const { rows } = await query(`
      INSERT INTO video_calls (session_id, booking_id, caller_id, receiver_id, room_id, status, started_at)
      VALUES ($1, $2, $3, $4, $5, 'active', NOW()) RETURNING *
    `, [sessionId || null, bookingId || null, callerId, receiverId, roomId]);

    // Notify receiver
    await query(`
      INSERT INTO notifications (user_id, title, body, type, meta)
      VALUES ($1, 'Incoming Video Call', $2, 'video_call', $3)
    `, [receiverId, `${req.user.first_name} is calling you. Join now!`,
        JSON.stringify({ callId: rows[0].id, roomId, bookingId })]).catch(() => {});

    res.json({
      call: rows[0],
      roomId,
      joinUrl: `https://meet.jit.si/${roomId}`,
      embedUrl: `https://meet.jit.si/${roomId}#config.prejoinPageEnabled=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false`,
    });
  } catch (err) { next(err); }
};

// ── POST /api/sessions/video/:id/end — end video call ───────────────────────
const endVideoCall = async (req, res, next) => {
  try {
    const { rows } = await query(`
      UPDATE video_calls SET status = 'ended', ended_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::integer
      WHERE id = $1 RETURNING *
    `, [req.params.id]);
    res.json({ call: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/sessions/video/active — get active calls for user ──────────────
const getActiveCalls = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT vc.*, u.first_name || ' ' || u.last_name AS caller_name
      FROM video_calls vc
      LEFT JOIN users u ON u.id = vc.caller_id
      WHERE (vc.caller_id = $1 OR vc.receiver_id = $1) AND vc.status = 'active'
      ORDER BY vc.created_at DESC
    `, [req.user.id]);

    res.json({
      calls: rows.map(c => ({
        ...c,
        joinUrl: `https://meet.jit.si/${c.room_id}`,
      })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/visa/:from/:to/:category — get visa requirements ──────────────
const getVisaRequirements = async (req, res, next) => {
  try {
    const { from, to, category } = req.params;
    const { rows } = await query(`
      SELECT * FROM visa_requirements
      WHERE from_country ILIKE $1 AND to_country ILIKE $2 AND category = $3
    `, [from, to, category]);

    if (!rows.length) {
      return res.json({
        found: false,
        message: `We don't have specific visa data for ${from} → ${to} (${category}) yet. Our agents can provide personalized guidance.`,
      });
    }

    res.json({ found: true, visa: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/visa/search — search visa requirements ─────────────────────────
const searchVisa = async (req, res, next) => {
  try {
    const { from, to, category } = req.query;
    const params = [];
    let sql = `SELECT * FROM visa_requirements WHERE 1=1`;
    if (from) { params.push(from); sql += ` AND from_country ILIKE $${params.length}`; }
    if (to) { params.push(to); sql += ` AND to_country ILIKE $${params.length}`; }
    if (category) { params.push(category); sql += ` AND category = $${params.length}`; }
    sql += ` ORDER BY from_country, to_country, category`;
    const { rows } = await query(sql, params);
    res.json({ results: rows, count: rows.length });
  } catch (err) { next(err); }
};

module.exports = {
  getActiveSessions, startSession, renewSession, checkExpiry,
  sendSecureMessage, sanitizeMessage,
  startVideoCall, endVideoCall, getActiveCalls,
  getVisaRequirements, searchVisa,
};
