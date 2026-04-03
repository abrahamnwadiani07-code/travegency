const { query } = require('../db');

// ── GET /api/news — list news articles ──────────────────────────────────────
const getNews = async (req, res, next) => {
  try {
    const { category, country, featured, limit = 20, offset = 0 } = req.query;
    const params = [];
    let sql = `SELECT * FROM news WHERE 1=1`;

    if (category) { params.push(category); sql += ` AND category = $${params.length}`; }
    if (country) { params.push(country); sql += ` AND country = $${params.length}`; }
    if (featured === 'true') { sql += ` AND is_featured = TRUE`; }

    sql += ` ORDER BY published_at DESC`;
    params.push(parseInt(limit), parseInt(offset));
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await query(sql, params);
    res.json({ news: rows });
  } catch (err) { next(err); }
};

// ── GET /api/news/:id — single article ──────────────────────────────────────
const getArticle = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM news WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Article not found' });
    res.json({ article: rows[0] });
  } catch (err) { next(err); }
};

// ── POST /api/news — create article (admin) ────────────────────────────────
const createArticle = async (req, res, next) => {
  try {
    const { title, summary, content, source, sourceUrl, imageUrl, category, country, isFeatured } = req.body;
    const { rows } = await query(`
      INSERT INTO news (title, summary, content, source, source_url, image_url, category, country, is_featured)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [title, summary, content, source, sourceUrl, imageUrl, category || 'general', country, isFeatured || false]);
    res.status(201).json({ article: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/news/categories — distinct categories ──────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT DISTINCT category, COUNT(*) AS count FROM news GROUP BY category ORDER BY count DESC`);
    res.json({ categories: rows });
  } catch (err) { next(err); }
};

module.exports = { getNews, getArticle, createArticle, getCategories };
