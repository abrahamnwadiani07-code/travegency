const { query } = require('../db');

// ── POST /api/reviews — submit a review for a completed booking ────────────────
const createReview = async (req, res, next) => {
  try {
    const { bookingId, agentId, rating, comment } = req.body;

    // Verify booking belongs to user and is completed
    const { rows: bRows } = await query(
      `SELECT id FROM bookings WHERE id = $1 AND traveller_id = $2 AND status = 'completed'`,
      [bookingId, req.user.id]
    );
    if (!bRows.length) {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }

    // Check no duplicate review
    const { rows: existing } = await query(
      `SELECT id FROM reviews WHERE booking_id = $1 AND user_id = $2`, [bookingId, req.user.id]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'You already reviewed this booking' });
    }

    const { rows } = await query(`
      INSERT INTO reviews (booking_id, agent_id, user_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [bookingId, agentId, req.user.id, rating, comment || null]);

    // Update agent rating
    await query(`
      UPDATE agents SET
        rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE agent_id = $1),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE agent_id = $1)
      WHERE id = $1
    `, [agentId]);

    res.status(201).json({ review: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/reviews/agent/:agentId — reviews for an agent ─────────────────────
const getAgentReviews = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT r.*, u.first_name || ' ' || u.last_name AS reviewer_name
      FROM reviews r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.agent_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.agentId]);
    res.json({ reviews: rows });
  } catch (err) { next(err); }
};

module.exports = { createReview, getAgentReviews };
