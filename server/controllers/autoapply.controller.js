const { query } = require('../db');

// ── POST /api/autoapply/profile — save job seeker profile for auto-apply ────
const saveProfile = async (req, res, next) => {
  try {
    const { profession, experience, qualification, targetCountry, skills, cvUrl } = req.body;

    // Upsert profile in user's extra_data
    await query(`
      UPDATE users SET extra_data = extra_data || $1::jsonb WHERE id = $2
    `, [JSON.stringify({
      jobProfile: { profession, experience, qualification, targetCountry, skills, cvUrl, autoApply: true, updatedAt: new Date() }
    }), req.user.id]);

    res.json({ message: 'Job profile saved for auto-apply', profile: { profession, experience, qualification, targetCountry, skills, cvUrl } });
  } catch (err) { next(err); }
};

// ── GET /api/autoapply/profile — get job seeker profile ─────────────────────
const getProfile = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT extra_data->'jobProfile' AS profile FROM users WHERE id = $1`, [req.user.id]);
    res.json({ profile: rows[0]?.profile || null });
  } catch (err) { next(err); }
};

// ── POST /api/autoapply/run — run auto-apply for user (or all users) ────────
const runAutoApply = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.user.id;

    // Get user's job profile
    const { rows: userRows } = await query(`
      SELECT id, first_name, last_name, email, extra_data->'jobProfile' AS profile
      FROM users WHERE id = $1
    `, [userId]);

    if (!userRows.length || !userRows[0].profile) {
      return res.status(400).json({ error: 'No job profile found. Save your profile first.' });
    }

    const profile = userRows[0].profile;
    const user = userRows[0];

    // Check subscription
    const { rows: subs } = await query(`
      SELECT plan FROM subscriptions
      WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
      AND plan = 'pro' ORDER BY created_at DESC LIMIT 1
    `, [userId]);

    if (!subs.length && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Pro subscription required for auto-apply', upgradeRequired: true });
    }

    // Find matching jobs not yet applied to
    const params = [userId];
    let sql = `
      SELECT j.id, j.title, j.country, j.city, j.apply_url, c.name AS company_name
      FROM jobs j
      LEFT JOIN companies c ON c.id = j.company_id
      WHERE j.status = 'active'
        AND j.visa_sponsored = TRUE
        AND j.id NOT IN (SELECT job_id FROM job_applications WHERE user_id = $1)
    `;

    if (profile.targetCountry) {
      params.push(profile.targetCountry);
      sql += ` AND j.country = $${params.length}`;
    }
    if (profile.experience) {
      params.push(profile.experience);
      sql += ` AND j.experience_min <= $${params.length}`;
    }

    sql += ` ORDER BY j.created_at DESC LIMIT 50`;

    const { rows: matchingJobs } = await query(sql, params);

    // Auto-apply to each
    let applied = 0;
    for (const job of matchingJobs) {
      try {
        await query(`
          INSERT INTO job_applications (job_id, user_id, status, cover_note)
          VALUES ($1, $2, 'applied', $3)
          ON CONFLICT (job_id, user_id) DO NOTHING
        `, [job.id, userId, `Auto-applied by Tragency for ${user.first_name} ${user.last_name} — ${profile.profession} with ${profile.experience} years experience.`]);
        applied++;
      } catch (e) { /* skip duplicates */ }
    }

    // Notify user
    if (applied > 0) {
      await query(`
        INSERT INTO notifications (user_id, title, body, type, meta)
        VALUES ($1, 'Auto-Apply Complete', $2, 'auto_apply', $3)
      `, [userId, `We auto-applied to ${applied} jobs matching your profile in ${profile.targetCountry}.`,
          JSON.stringify({ applied, country: profile.targetCountry })]);
    }

    res.json({
      message: `Auto-applied to ${applied} jobs`,
      applied,
      totalMatching: matchingJobs.length,
      profile,
    });
  } catch (err) { next(err); }
};

// ── GET /api/autoapply/stats — auto-apply statistics ────────────────────────
const getStats = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) AS total_applied,
        COUNT(*) FILTER (WHERE status = 'applied') AS pending,
        COUNT(*) FILTER (WHERE status = 'shortlisted') AS shortlisted,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS this_week
      FROM job_applications WHERE user_id = $1
    `, [req.user.id]);
    res.json({ stats: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { saveProfile, getProfile, runAutoApply, getStats };
