const { query } = require('../db');

// ── GET /api/jobs — list jobs with filters ──────────────────────────────────
const getJobs = async (req, res, next) => {
  try {
    const { country, industry, visa_sponsored, search, experience, qualification, limit = 50, offset = 0 } = req.query;
    const params = [];
    let sql = `
      SELECT j.*, c.name AS company_name, c.logo_url AS company_logo, c.website AS company_website,
             c.size AS company_size, c.sponsors_visa AS company_sponsors
      FROM jobs j
      LEFT JOIN companies c ON c.id = j.company_id
      WHERE j.status = 'active'
    `;

    if (country) { params.push(country); sql += ` AND j.country = $${params.length}`; }
    if (industry) { params.push(industry); sql += ` AND j.industry = $${params.length}`; }
    if (visa_sponsored === 'true') { sql += ` AND j.visa_sponsored = TRUE`; }
    if (experience) { params.push(parseInt(experience)); sql += ` AND j.experience_min <= $${params.length}`; }
    if (qualification) { params.push(qualification); sql += ` AND (j.qualification = $${params.length} OR j.qualification = 'any')`; }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (j.title ILIKE $${params.length} OR j.description ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }

    sql += ` ORDER BY j.created_at DESC`;
    params.push(parseInt(limit), parseInt(offset));
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) FROM jobs j LEFT JOIN companies c ON c.id = j.company_id WHERE j.status = 'active'`;
    const countParams = [];
    if (country) { countParams.push(country); countSql += ` AND j.country = $${countParams.length}`; }
    if (industry) { countParams.push(industry); countSql += ` AND j.industry = $${countParams.length}`; }
    if (visa_sponsored === 'true') countSql += ` AND j.visa_sponsored = TRUE`;
    const { rows: countRows } = await query(countSql, countParams);

    res.json({ jobs: rows, total: parseInt(countRows[0].count) });
  } catch (err) { next(err); }
};

// ── GET /api/jobs/:id — single job ──────────────────────────────────────────
const getJob = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT j.*, c.name AS company_name, c.logo_url AS company_logo, c.website AS company_website,
             c.description AS company_description, c.size AS company_size, c.visa_types AS company_visa_types
      FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
      WHERE j.id = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json({ job: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/companies — list visa-sponsoring companies ─────────────────────
const getCompanies = async (req, res, next) => {
  try {
    const { country, industry, search, limit = 50, offset = 0 } = req.query;
    const params = [];
    let sql = `SELECT c.*, (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id AND j.status = 'active') AS active_jobs FROM companies c WHERE c.sponsors_visa = TRUE`;

    if (country) { params.push(country); sql += ` AND c.country = $${params.length}`; }
    if (industry) { params.push(industry); sql += ` AND c.industry = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (c.name ILIKE $${params.length} OR c.description ILIKE $${params.length})`; }

    sql += ` ORDER BY c.name`;
    params.push(parseInt(limit), parseInt(offset));
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await query(sql, params);
    res.json({ companies: rows });
  } catch (err) { next(err); }
};

// ── POST /api/jobs — create job listing (admin/agent) ───────────────────────
const createJob = async (req, res, next) => {
  try {
    const { companyId, title, description, country, city, industry, salaryMin, salaryMax, salaryCurrency,
            visaSponsored, visaType, experienceMin, qualification, skills, employmentType, applyUrl, expiresAt } = req.body;

    const { rows } = await query(`
      INSERT INTO jobs (company_id, title, description, country, city, industry, salary_min, salary_max, salary_currency,
        visa_sponsored, visa_type, experience_min, qualification, skills, employment_type, apply_url, posted_by, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *
    `, [companyId, title, description, country, city, industry, salaryMin, salaryMax, salaryCurrency || 'USD',
        visaSponsored !== false, visaType, experienceMin || 0, qualification || 'any',
        JSON.stringify(skills || []), employmentType || 'full-time', applyUrl, req.user.id, expiresAt]);

    res.status(201).json({ job: rows[0] });
  } catch (err) { next(err); }
};

// ── POST /api/jobs/:id/apply — apply for job ────────────────────────────────
const applyJob = async (req, res, next) => {
  try {
    const { coverNote, resumeUrl } = req.body;
    const { rows } = await query(`
      INSERT INTO job_applications (job_id, user_id, cover_note, resume_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.params.id, req.user.id, coverNote || null, resumeUrl || null]);
    res.status(201).json({ application: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already applied to this job' });
    next(err);
  }
};

// ── GET /api/jobs/my-applications — user's applications ─────────────────────
const getMyApplications = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT ja.*, j.title, j.country, j.city, j.salary_min, j.salary_max, j.salary_currency,
             c.name AS company_name
      FROM job_applications ja
      JOIN jobs j ON j.id = ja.job_id
      LEFT JOIN companies c ON c.id = j.company_id
      WHERE ja.user_id = $1
      ORDER BY ja.created_at DESC
    `, [req.user.id]);
    res.json({ applications: rows });
  } catch (err) { next(err); }
};

module.exports = { getJobs, getJob, getCompanies, createJob, applyJob, getMyApplications };
