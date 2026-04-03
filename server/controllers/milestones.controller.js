const { query } = require('../db');

// ── POST /api/milestones — create milestone ─────────────────────────────────
const createMilestone = async (req, res, next) => {
  try {
    const { bookingId, title, description } = req.body;
    const { rows } = await query(`
      INSERT INTO milestones (booking_id, title, description, created_by)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [bookingId, title, description || null, req.user.id]);

    // Notify traveller
    const { rows: booking } = await query(`SELECT traveller_id, reference FROM bookings WHERE id = $1`, [bookingId]);
    if (booking.length) {
      await query(`
        INSERT INTO notifications (user_id, title, body, type, meta)
        VALUES ($1, 'Progress update', $2, 'milestone', $3)
      `, [booking[0].traveller_id, `${title} — Ref: ${booking[0].reference}`, JSON.stringify({ bookingId, milestoneId: rows[0].id })]);
    }

    res.status(201).json({ milestone: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/milestones/booking/:bookingId — get milestones ─────────────────
const getMilestones = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT m.*, u.first_name || ' ' || u.last_name AS created_by_name
      FROM milestones m
      LEFT JOIN users u ON u.id = m.created_by
      WHERE m.booking_id = $1
      ORDER BY m.created_at ASC
    `, [req.params.bookingId]);
    res.json({ milestones: rows });
  } catch (err) { next(err); }
};

// ── PATCH /api/milestones/:id/complete — mark complete ──────────────────────
const completeMilestone = async (req, res, next) => {
  try {
    const { rows } = await query(`
      UPDATE milestones SET status = 'completed', completed_at = NOW()
      WHERE id = $1 RETURNING *
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ milestone: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { createMilestone, getMilestones, completeMilestone };
