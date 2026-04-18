const { query } = require('../db');

const DEFAULT_STEPS = [
  { step: 1, title: 'Profile Setup', description: 'Complete your travel profile with personal and professional details', status: 'pending' },
  { step: 2, title: 'AI Consultation', description: 'Chat with our AI to determine the best immigration pathway', status: 'pending' },
  { step: 3, title: 'Agent Matched', description: 'Get matched with a certified immigration agent', status: 'pending' },
  { step: 4, title: 'Document Collection', description: 'Gather and prepare all required documents', status: 'pending' },
  { step: 5, title: 'Application Submission', description: 'Submit your visa or immigration application', status: 'pending' },
  { step: 6, title: 'Embassy Appointment', description: 'Schedule and attend your embassy or consulate appointment', status: 'pending' },
  { step: 7, title: 'Visa Decision', description: 'Await and receive your visa decision', status: 'pending' },
  { step: 8, title: 'Pre-Departure Prep', description: 'Prepare for travel — flights, accommodation, insurance', status: 'pending' },
  { step: 9, title: 'Arrival & Settlement', description: 'Arrive at your destination and settle in', status: 'pending' },
];

// ── POST /api/pathways — create a new immigration pathway ─────────────────
const createPathway = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { from_country, to_country, visa_type, travel_path, booking_id, estimated_weeks, notes } = req.body;

    if (!from_country || !to_country || !visa_type || !travel_path) {
      return res.status(400).json({ error: 'from_country, to_country, visa_type, and travel_path are required' });
    }

    const steps = DEFAULT_STEPS.map((s, i) => ({
      ...s,
      status: i === 0 ? 'in_progress' : 'pending',
    }));

    const { rows } = await query(`
      INSERT INTO immigration_pathways (user_id, booking_id, from_country, to_country, visa_type, travel_path, estimated_weeks, steps, next_action, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      userId,
      booking_id || null,
      from_country,
      to_country,
      visa_type,
      travel_path,
      estimated_weeks || null,
      JSON.stringify(steps),
      'Complete your travel profile to get started',
      notes || null,
    ]);

    res.status(201).json({ pathway: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/pathways — get user's pathways ───────────────────────────────
const getPathways = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let sql = `SELECT * FROM immigration_pathways WHERE user_id = $1`;
    const params = [userId];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const { rows } = await query(sql, params);
    res.json({ pathways: rows });
  } catch (err) { next(err); }
};

// ── GET /api/pathways/:id — get single pathway with steps ─────────────────
const getPathway = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { rows } = await query(
      `SELECT * FROM immigration_pathways WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Pathway not found' });

    // Get related document checks
    const { rows: documents } = await query(
      `SELECT * FROM document_checks WHERE pathway_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({ pathway: rows[0], documents });
  } catch (err) { next(err); }
};

// ── PATCH /api/pathways/:id/step — update current step and next_action ────
const updateStep = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { current_step, next_action } = req.body;

    // Fetch existing pathway
    const { rows: existing } = await query(
      `SELECT * FROM immigration_pathways WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!existing.length) return res.status(404).json({ error: 'Pathway not found' });

    const pathway = existing[0];
    const newStep = current_step !== undefined ? current_step : pathway.current_step;

    // Update steps array — mark completed, in_progress, pending
    let steps = pathway.steps || [];
    steps = steps.map((s) => {
      if (s.step < newStep) return { ...s, status: 'completed' };
      if (s.step === newStep) return { ...s, status: 'in_progress' };
      return { ...s, status: 'pending' };
    });

    // Determine pathway status
    let status = pathway.status;
    if (newStep > pathway.total_steps) {
      status = 'completed';
    } else if (newStep === pathway.total_steps && steps[newStep - 1]?.status === 'completed') {
      status = 'completed';
    }

    const { rows } = await query(`
      UPDATE immigration_pathways
      SET current_step = $1, steps = $2, next_action = $3, status = $4, updated_at = NOW()
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [
      Math.min(newStep, pathway.total_steps),
      JSON.stringify(steps),
      next_action || pathway.next_action,
      status,
      id,
      userId,
    ]);

    res.json({ pathway: rows[0] });
  } catch (err) { next(err); }
};

// ── PATCH /api/pathways/:id — update pathway details ──────────────────────
const updatePathway = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, estimated_weeks, notes, next_action, visa_type, booking_id } = req.body;

    const setClauses = [];
    const params = [];

    if (status !== undefined) { params.push(status); setClauses.push(`status = $${params.length}`); }
    if (estimated_weeks !== undefined) { params.push(estimated_weeks); setClauses.push(`estimated_weeks = $${params.length}`); }
    if (notes !== undefined) { params.push(notes); setClauses.push(`notes = $${params.length}`); }
    if (next_action !== undefined) { params.push(next_action); setClauses.push(`next_action = $${params.length}`); }
    if (visa_type !== undefined) { params.push(visa_type); setClauses.push(`visa_type = $${params.length}`); }
    if (booking_id !== undefined) { params.push(booking_id); setClauses.push(`booking_id = $${params.length}`); }

    if (!setClauses.length) return res.status(400).json({ error: 'No fields to update' });

    setClauses.push('updated_at = NOW()');
    params.push(id, userId);

    const { rows } = await query(
      `UPDATE immigration_pathways SET ${setClauses.join(', ')} WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING *`,
      params
    );

    if (!rows.length) return res.status(404).json({ error: 'Pathway not found' });

    res.json({ pathway: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { createPathway, getPathways, getPathway, updateStep, updatePathway };
