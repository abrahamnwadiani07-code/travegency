const { query } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── File upload config ──────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'kyc');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${req.user.id}_${file.fieldname}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only JPG, PNG, PDF, and WebP files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

const kycUpload = upload.fields([
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
  { name: 'businessDoc', maxCount: 1 },
]);

// ── POST /api/kyc/submit — agent submits KYC documents ──────────────────────
const submitKYC = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      idType, idNumber, idCountry, idExpiry,
      businessRegistration, taxId,
      bankName, bankAccountNumber, bankAccountName,
    } = req.body;

    if (!idType || !idNumber || !idCountry) {
      return res.status(400).json({ error: 'ID type, number, and country are required' });
    }

    // Build document records
    const documents = [];
    const files = req.files || {};

    for (const [fieldName, label] of [['idFront', 'ID Front'], ['idBack', 'ID Back'], ['selfie', 'Selfie'], ['businessDoc', 'Business Document']]) {
      if (files[fieldName] && files[fieldName][0]) {
        const file = files[fieldName][0];
        const fileUrl = `/uploads/kyc/${file.filename}`;

        // Save to documents table
        const { rows } = await query(`
          INSERT INTO documents (user_id, doc_type, file_name, file_url, file_size, status)
          VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *
        `, [userId, label, file.originalname, fileUrl, file.size]);

        documents.push(rows[0]);
      }
    }

    // Update agent record with KYC data
    await query(`
      UPDATE agents SET
        kyc_status = 'submitted',
        kyc_submitted_at = NOW(),
        kyc_documents = $2::jsonb,
        business_registration = COALESCE($3, business_registration),
        tax_id = COALESCE($4, tax_id),
        bank_name = COALESCE($5, bank_name),
        bank_account_number = COALESCE($6, bank_account_number),
        bank_account_name = COALESCE($7, bank_account_name)
      WHERE user_id = $1
    `, [
      userId,
      JSON.stringify({
        idType, idNumber, idCountry, idExpiry,
        documents: documents.map(d => ({ id: d.id, type: d.doc_type, url: d.file_url })),
        submittedAt: new Date(),
      }),
      businessRegistration || null,
      taxId || null,
      bankName || null,
      bankAccountNumber || null,
      bankAccountName || null,
    ]);

    // Notify admins
    const { rows: admins } = await query(`SELECT id FROM users WHERE role = 'admin'`);
    for (const admin of admins) {
      await query(`
        INSERT INTO notifications (user_id, title, body, type)
        VALUES ($1, 'New KYC Submission', $2, 'kyc_submitted')
      `, [admin.id, `Agent ${req.user.first_name} ${req.user.last_name} has submitted KYC documents for review.`]).catch(() => {});
    }

    res.json({
      message: 'KYC documents submitted successfully. An admin will review your application.',
      documents,
      kycStatus: 'submitted',
    });
  } catch (err) { next(err); }
};

// ── GET /api/kyc/status — get agent's KYC status ────────────────────────────
const getKYCStatus = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT kyc_status, kyc_documents, kyc_submitted_at, kyc_reviewed_at, kyc_reviewer_notes
      FROM agents WHERE user_id = $1
    `, [req.user.id]);

    if (!rows.length) return res.json({ kycStatus: 'not_agent' });

    // Get uploaded documents
    let documents = [];
    try {
      const { rows: docs } = await query(`
        SELECT id, doc_type, file_name, file_url, status, reviewer_notes, created_at
        FROM documents WHERE user_id = $1 ORDER BY created_at DESC
      `, [req.user.id]);
      documents = docs;
    } catch (e) { /* ignore */ }

    res.json({
      kycStatus: rows[0].kyc_status || 'not_submitted',
      kycDocuments: rows[0].kyc_documents,
      submittedAt: rows[0].kyc_submitted_at,
      reviewedAt: rows[0].kyc_reviewed_at,
      reviewerNotes: rows[0].kyc_reviewer_notes,
      documents,
    });
  } catch (err) { next(err); }
};

// ── GET /api/kyc/documents/:userId — admin views agent's documents ──────────
const getDocuments = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const { rows: agent } = await query(`
      SELECT a.*, u.first_name, u.last_name, u.email, u.phone, u.country
      FROM agents a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.user_id = $1
    `, [userId]);

    if (!agent.length) return res.status(404).json({ error: 'Agent not found' });

    const { rows: documents } = await query(`
      SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC
    `, [userId]);

    res.json({ agent: agent[0], documents });
  } catch (err) { next(err); }
};

module.exports = { kycUpload, submitKYC, getKYCStatus, getDocuments };
