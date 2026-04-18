const { query } = require('../db');

const GROQ_KEY = process.env.GROQ_API_KEY;

async function callGroq(systemPrompt, userMessage) {
  if (!GROQ_KEY) return null;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], max_tokens: 1500, temperature: 0.3 }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

// ── GET /api/scholarships — list scholarships with optional filters ───────
const getScholarships = async (req, res, next) => {
  try {
    const { country, degree_level, field_of_study, is_full_ride, search, page, limit } = req.query;

    let sql = `SELECT * FROM scholarships WHERE status = 'active'`;
    const params = [];

    if (country) {
      params.push(country);
      sql += ` AND LOWER(country) = LOWER($${params.length})`;
    }

    if (degree_level) {
      params.push(degree_level);
      sql += ` AND LOWER(degree_level) = LOWER($${params.length})`;
    }

    if (field_of_study) {
      params.push(`%${field_of_study}%`);
      sql += ` AND LOWER(field_of_study) LIKE LOWER($${params.length})`;
    }

    if (is_full_ride === 'true') {
      sql += ` AND is_full_ride = TRUE`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (LOWER(name) LIKE LOWER($${params.length}) OR LOWER(university) LIKE LOWER($${params.length}) OR LOWER(description) LIKE LOWER($${params.length}))`;
    }

    sql += ` ORDER BY is_full_ride DESC, created_at DESC`;

    // Pagination
    const pageNum = parseInt(page) || 1;
    const pageSize = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * pageSize;

    // Get total count
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
    const { rows: countRows } = await query(countSql, params);
    const total = parseInt(countRows[0].count);

    params.push(pageSize, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await query(sql, params);

    res.json({
      scholarships: rows,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/scholarships/match — AI-powered scholarship matching ─────────
const matchScholarships = async (req, res, next) => {
  try {
    const { country, qualification, field, degree_level, gpa } = req.query;

    if (!country && !qualification && !field) {
      return res.status(400).json({ error: 'Provide at least one of: country (your home country), qualification, field' });
    }

    // First get all active scholarships
    const { rows: allScholarships } = await query(
      `SELECT * FROM scholarships WHERE status = 'active' ORDER BY is_full_ride DESC`
    );

    // Try AI matching
    const systemPrompt = `You are a scholarship matching assistant. Given a student profile and a list of scholarships, rank the top 10 most suitable scholarships by match score.

You MUST respond in valid JSON format only, with no additional text. Use this structure:
{
  "matches": [
    { "name": "Scholarship Name", "score": <0-100>, "reason": "Why this is a good match" }
  ]
}

Consider: degree level alignment, field of study relevance, eligibility based on home country, and overall fit.`;

    const userMessage = [
      `Student Profile:`,
      `Home Country: ${country || 'Not specified'}`,
      `Qualification/Degree Level: ${qualification || degree_level || 'Not specified'}`,
      `Field of Study: ${field || 'Not specified'}`,
      gpa ? `GPA: ${gpa}` : '',
      '',
      `Available Scholarships:`,
      ...allScholarships.map((s, i) => `${i + 1}. ${s.name} — ${s.country}, ${s.university || 'Various'}, ${s.degree_level}, ${s.field_of_study || 'All Fields'}, ${s.is_full_ride ? 'Full Ride' : 'Partial'}, Amount: ${s.amount} ${s.currency}`),
    ].filter(Boolean).join('\n');

    const aiResponse = await callGroq(systemPrompt, userMessage);

    let matchedScholarships = [];

    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const aiMatches = parsed.matches || [];

          // Map AI matches back to full scholarship data
          for (const m of aiMatches) {
            const found = allScholarships.find(s =>
              s.name.toLowerCase().includes(m.name.toLowerCase().substring(0, 20)) ||
              m.name.toLowerCase().includes(s.name.toLowerCase().substring(0, 20))
            );
            if (found) {
              matchedScholarships.push({
                ...found,
                match_score: m.score,
                match_reason: m.reason,
              });
            }
          }
        }
      } catch (parseErr) {
        // Fall through to rule-based
      }
    }

    // Rule-based fallback
    if (!matchedScholarships.length) {
      matchedScholarships = allScholarships.map(s => {
        let score = 50;

        // Degree level match
        if (degree_level || qualification) {
          const target = (degree_level || qualification || '').toLowerCase();
          if (s.degree_level.toLowerCase().includes(target) || target.includes(s.degree_level.toLowerCase())) {
            score += 20;
          }
        }

        // Field match
        if (field && s.field_of_study) {
          const fieldLower = field.toLowerCase();
          const scholarshipField = s.field_of_study.toLowerCase();
          if (scholarshipField === 'all fields') {
            score += 10;
          } else if (scholarshipField.includes(fieldLower) || fieldLower.includes(scholarshipField.split(',')[0].trim())) {
            score += 25;
          }
        } else if (!field && s.field_of_study && s.field_of_study.toLowerCase() === 'all fields') {
          score += 10;
        }

        // Full ride bonus
        if (s.is_full_ride) score += 10;

        // Eligibility text check for country
        if (country && s.eligibility) {
          const eligLower = s.eligibility.toLowerCase();
          const countryLower = country.toLowerCase();
          if (eligLower.includes('international') || eligLower.includes(countryLower) || eligLower.includes('all countries') || eligLower.includes('developing')) {
            score += 15;
          }
        }

        return {
          ...s,
          match_score: Math.min(score, 100),
          match_reason: 'Matched based on your profile criteria',
        };
      });

      // Sort by score and take top 10
      matchedScholarships.sort((a, b) => b.match_score - a.match_score);
      matchedScholarships = matchedScholarships.slice(0, 10);
    }

    res.json({ matches: matchedScholarships });
  } catch (err) { next(err); }
};

// ── POST /api/scholarships — admin: add a scholarship ─────────────────────
const addScholarship = async (req, res, next) => {
  try {
    const {
      name, country, university, degree_level, field_of_study,
      amount, currency, coverage, deadline, eligibility,
      apply_url, description, is_full_ride,
    } = req.body;

    if (!name || !country || !degree_level) {
      return res.status(400).json({ error: 'name, country, and degree_level are required' });
    }

    const { rows } = await query(`
      INSERT INTO scholarships (name, country, university, degree_level, field_of_study, amount, currency, coverage, deadline, eligibility, apply_url, description, is_full_ride)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      name,
      country,
      university || null,
      degree_level,
      field_of_study || null,
      amount || null,
      currency || 'USD',
      coverage || null,
      deadline || null,
      eligibility || null,
      apply_url || null,
      description || null,
      is_full_ride || false,
    ]);

    res.status(201).json({ scholarship: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getScholarships, matchScholarships, addScholarship };
