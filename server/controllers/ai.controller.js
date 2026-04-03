const { query } = require('../db');
const { v4: uuidv4 } = require('uuid');
const aiAgent = require('../services/ai-agent');
const aiJobs = require('../services/ai-jobs');

// ── POST /api/ai/chat — send message to AI agent ───────────────────────────
const chat = async (req, res, next) => {
  try {
    const { sessionId, message, travelPath, fromCountry, toCountry } = req.body;
    const userId = req.user?.id || null;

    // Get or create conversation
    let convId, context;
    const { rows: existing } = await query(
      `SELECT * FROM ai_conversations WHERE session_id = $1`, [sessionId]
    );

    if (existing.length) {
      convId = existing[0].id;
      context = {
        travel_path: existing[0].travel_path,
        from_country: existing[0].from_country,
        to_country: existing[0].to_country,
        purpose: existing[0].purpose,
      };
    } else {
      const newId = uuidv4();
      // Pre-set travel path if provided (from portal context)
      const initPath = travelPath || null;
      const initFrom = fromCountry || null;
      const initTo = toCountry || null;
      const { rows } = await query(
        `INSERT INTO ai_conversations (id, session_id, user_id, travel_path, from_country, to_country)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [newId, sessionId, userId,
         initPath ? initPath : null,
         initFrom, initTo]
      );
      convId = rows[0].id;
      context = {
        travel_path: initPath,
        from_country: initFrom,
        to_country: initTo,
      };
    }

    // Save user message
    await query(
      `INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
      [convId, message]
    );

    // Get conversation history
    const { rows: history } = await query(
      `SELECT role, content FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [convId]
    );

    // Generate AI response — route to travel or jobs AI based on service type
    const serviceType = req.body.service || context.purpose || null;
    const isJobsService = serviceType === 'jobs' || context.purpose === 'Employment';
    const { content: aiResponse, updates } = isJobsService
      ? await aiJobs.generateJobResponse(history, context)
      : await aiAgent.chat(history, context);

    // Save AI response
    await query(
      `INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
      [convId, aiResponse]
    );

    // Update conversation context
    const setClauses = [];
    const params = [];
    if (updates.travel_path) { params.push(updates.travel_path); setClauses.push(`travel_path = $${params.length}::travel_path`); }
    if (updates.from_country) { params.push(updates.from_country); setClauses.push(`from_country = $${params.length}`); }
    if (updates.to_country) { params.push(updates.to_country); setClauses.push(`to_country = $${params.length}`); }

    if (setClauses.length) {
      params.push(convId);
      await query(`UPDATE ai_conversations SET ${setClauses.join(', ')} WHERE id = $${params.length}`, params);
    }

    // Parse ready state from AI response
    let ready = false, travelData = null;
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        travelData = JSON.parse(jsonMatch[1]);
        ready = travelData.ready === true;
        // Save checklist and summary
        if (ready) {
          await query(
            `UPDATE ai_conversations SET doc_checklist = $1, summary = $2, status = 'ready' WHERE id = $3`,
            [JSON.stringify(travelData.checklist || []), `${travelData.fromCountry} → ${travelData.toCountry} (${travelData.travelPath})`, convId]
          );
        }
      } catch (e) { /* ignore parse errors */ }
    }

    // ── AI Learning: track popular routes ──
    const finalFrom = updates.from_country || context.from_country;
    const finalTo = updates.to_country || context.to_country;
    const finalPath = updates.travel_path || context.travel_path || req.body.travelPath;
    if (finalFrom && finalTo && finalPath) {
      query(`
        INSERT INTO popular_routes (from_country, to_country, category, search_count, last_searched)
        VALUES ($1, $2, $3, 1, NOW())
        ON CONFLICT (from_country, to_country, category)
        DO UPDATE SET search_count = popular_routes.search_count + 1, last_searched = NOW()
      `, [finalFrom, finalTo, finalPath]).catch(() => {});
    }

    // Clean response (remove JSON block for display)
    const cleanResponse = aiResponse.replace(/```json\n[\s\S]*?\n```/, '').trim();

    res.json({
      message: cleanResponse,
      conversationId: convId,
      ready,
      travelData,
      context: {
        ...context,
        ...updates,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/ai/conversation/:sessionId — get conversation history ─────────
const getConversation = async (req, res, next) => {
  try {
    const { rows: conv } = await query(
      `SELECT * FROM ai_conversations WHERE session_id = $1`, [req.params.sessionId]
    );
    if (!conv.length) return res.json({ conversation: null, messages: [] });

    const { rows: messages } = await query(
      `SELECT role, content, created_at FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conv[0].id]
    );

    res.json({ conversation: conv[0], messages });
  } catch (err) { next(err); }
};

// ── POST /api/ai/match — trigger agent matching after AI conversation ──────
const matchAgents = async (req, res, next) => {
  try {
    const { conversationId } = req.body;

    const { rows: conv } = await query(
      `SELECT * FROM ai_conversations WHERE id = $1`, [conversationId]
    );
    if (!conv.length) return res.status(404).json({ error: 'Conversation not found' });

    const c = conv[0];
    const travelPath = c.travel_path;

    if (!travelPath) return res.status(400).json({ error: 'Travel path not determined yet' });

    // Find matching agents scored by relevance
    const { rows: agents } = await query(`
      SELECT a.*,
        u.first_name, u.last_name, u.email AS user_email,
        COALESCE((SELECT array_agg(ap2.path::text) FROM agent_paths ap2 WHERE ap2.agent_id = a.id), '{}') AS paths,
        ap.is_primary,
        (
          CASE WHEN ap.is_primary THEN 30 ELSE 10 END +
          COALESCE(a.rating, 0) * 10 +
          LEAST(a.experience_yrs, 10) * 2 +
          LEAST(a.total_reviews, 50) * 0.5
        ) AS match_score
      FROM agents a
      JOIN agent_paths ap ON ap.agent_id = a.id
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.status = 'active' AND ap.path = $1::travel_path
      ORDER BY match_score DESC
      LIMIT 10
    `, [travelPath]);

    // Get matching fee
    const { rows: feeRows } = await query(
      `SELECT value FROM platform_config WHERE key = 'matching_fees'`
    );
    const fees = feeRows[0]?.value || {};
    const matchingFee = fees[travelPath] || 10000;

    // Create match records
    const matches = [];
    for (let i = 0; i < agents.length; i++) {
      const { rows } = await query(`
        INSERT INTO agent_matches (conversation_id, user_id, agent_id, score, rank, matching_fee)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING *
      `, [conversationId, req.user.id, agents[i].id, agents[i].match_score, i + 1, matchingFee]);
      if (rows.length) matches.push({ ...rows[0], agent: agents[i] });
    }

    res.json({
      matches,
      matchingFee,
      travelPath,
      fromCountry: c.from_country,
      toCountry: c.to_country,
    });
  } catch (err) { next(err); }
};

// ── POST /api/ai/match/:matchId/select — select and pay for agent ──────────
const selectAgent = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const { rows } = await query(
      `UPDATE agent_matches SET status = 'selected', paid_at = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'
      WHERE id = $1 AND user_id = $2 AND status = 'suggested'
      RETURNING *`,
      [matchId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Match not found' });

    const match = rows[0];

    // Notify the agent
    const { rows: agentRows } = await query(
      `SELECT user_id, display_name FROM agents WHERE id = $1`, [match.agent_id]
    );
    if (agentRows.length) {
      await query(`
        INSERT INTO notifications (user_id, title, body, type, meta)
        VALUES ($1, 'New booking request!', 'A traveller has selected you. You have 24 hours to accept.', 'match_request', $2)
      `, [agentRows[0].user_id, JSON.stringify({ matchId: match.id })]);
    }

    // Skip all other matches
    await query(
      `UPDATE agent_matches SET status = 'skipped' WHERE conversation_id = $1 AND id != $2 AND status = 'suggested'`,
      [match.conversation_id, matchId]
    );

    res.json({ match, message: 'Agent selected! They have 24 hours to accept.' });
  } catch (err) { next(err); }
};

// ── POST /api/ai/match/:matchId/accept — agent accepts match ───────────────
const acceptMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    // Verify agent owns this match
    const { rows: agentRows } = await query(
      `SELECT a.id FROM agents a WHERE a.user_id = $1`, [req.user.id]
    );
    if (!agentRows.length) return res.status(403).json({ error: 'Not an agent' });

    const { rows } = await query(
      `UPDATE agent_matches SET status = 'accepted', accepted_at = NOW()
      WHERE id = $1 AND agent_id = $2 AND status = 'selected'
      RETURNING *`,
      [matchId, agentRows[0].id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Match not found or already handled' });

    const match = rows[0];

    // Get conversation details
    const { rows: conv } = await query(
      `SELECT * FROM ai_conversations WHERE id = $1`, [match.conversation_id]
    );

    // Notify traveller
    await query(`
      INSERT INTO notifications (user_id, title, body, type, meta)
      VALUES ($1, 'Agent accepted!', 'Your agent has accepted your booking request. You can now proceed.', 'match_accepted', $2)
    `, [match.user_id, JSON.stringify({ matchId: match.id })]);

    res.json({ match, message: 'Match accepted! The traveller will be notified.' });
  } catch (err) { next(err); }
};

// ── POST /api/ai/match/:matchId/decline — agent declines match ─────────────
const declineMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { rows: agentRows } = await query(
      `SELECT a.id FROM agents a WHERE a.user_id = $1`, [req.user.id]
    );
    if (!agentRows.length) return res.status(403).json({ error: 'Not an agent' });

    const { rows } = await query(
      `UPDATE agent_matches SET status = 'declined', declined_at = NOW()
      WHERE id = $1 AND agent_id = $2 AND status = 'selected'
      RETURNING *`,
      [matchId, agentRows[0].id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Match not found' });

    // Notify traveller — free re-match
    await query(`
      INSERT INTO notifications (user_id, title, body, type, meta)
      VALUES ($1, 'Agent unavailable', 'Your selected agent is unavailable. You can choose another agent for free.', 'match_declined', $2)
    `, [rows[0].user_id, JSON.stringify({ matchId: rows[0].id, conversationId: rows[0].conversation_id })]);

    // Re-open other suggested matches
    await query(
      `UPDATE agent_matches SET status = 'suggested' WHERE conversation_id = $1 AND status = 'skipped'`,
      [rows[0].conversation_id]
    );

    res.json({ message: 'Match declined. Traveller can select another agent.' });
  } catch (err) { next(err); }
};

// ── GET /api/ai/matches — get user's matches ───────────────────────────────
const getMatches = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT m.*, a.display_name, a.bio, a.location, a.experience_yrs, a.rate_per_trip,
        a.rating, a.total_reviews, a.total_bookings, a.avatar_url,
        COALESCE((SELECT array_agg(ap.path::text) FROM agent_paths ap WHERE ap.agent_id = a.id), '{}') AS paths
      FROM agent_matches m
      JOIN agents a ON a.id = m.agent_id
      WHERE m.user_id = $1
      ORDER BY m.score DESC
    `, [req.user.id]);
    res.json({ matches: rows });
  } catch (err) { next(err); }
};

module.exports = { chat, getConversation, matchAgents, selectAgent, acceptMatch, declineMatch, getMatches };
