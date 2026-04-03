const { query } = require('../db');

// ── POST /api/documents — upload document metadata ──────────────────────────
const uploadDocument = async (req, res, next) => {
  try {
    const { bookingId, docType, fileName, fileUrl, fileSize } = req.body;
    const { rows } = await query(`
      INSERT INTO documents (booking_id, user_id, doc_type, file_name, file_url, file_size)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [bookingId, req.user.id, docType, fileName, fileUrl, fileSize || 0]);
    res.status(201).json({ document: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/documents/booking/:bookingId — get docs for booking ────────────
const getDocuments = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT d.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON u.id = d.user_id
      WHERE d.booking_id = $1
      ORDER BY d.created_at DESC
    `, [req.params.bookingId]);
    res.json({ documents: rows });
  } catch (err) { next(err); }
};

// ── PATCH /api/documents/:id/review — agent/admin reviews doc ───────────────
const reviewDocument = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;
    const { rows } = await query(`
      UPDATE documents SET status = $1::doc_status, review_note = $2, reviewed_by = $3
      WHERE id = $4 RETURNING *
    `, [status, reviewNote || null, req.user.id, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { uploadDocument, getDocuments, reviewDocument };
