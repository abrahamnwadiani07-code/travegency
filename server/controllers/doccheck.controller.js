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

const DOC_SYSTEM_PROMPT = `You are an immigration document reviewer. Analyze the document and provide: 1) Score out of 10, 2) List of issues found, 3) Suggestions for improvement. Be specific and helpful.

You MUST respond in valid JSON format only, with no additional text. Use this exact structure:
{
  "score": <number 1-10>,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "summary": "Brief overall assessment"
}`;

// ── POST /api/documents/check — AI document analysis ──────────────────────
const checkDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { document_name, document_type, file_url, pathway_id, content_description, visa_type, destination_country } = req.body;

    if (!document_name || !document_type) {
      return res.status(400).json({ error: 'document_name and document_type are required' });
    }

    // Build context for AI analysis
    const userMessage = [
      `Document Name: ${document_name}`,
      `Document Type: ${document_type}`,
      destination_country ? `Destination Country: ${destination_country}` : '',
      visa_type ? `Visa Type: ${visa_type}` : '',
      content_description ? `Content Description: ${content_description}` : '',
      file_url ? `File URL provided: Yes` : 'File URL provided: No',
      '',
      'Please analyze this document for immigration purposes. Check for:',
      '- Completeness and validity',
      '- Common mistakes or missing information',
      '- Formatting and presentation issues',
      '- Compliance with typical immigration requirements',
      '- Translation or notarization needs',
    ].filter(Boolean).join('\n');

    let aiScore = null;
    let aiFeedback = [];
    let status = 'pending';

    const aiResponse = await callGroq(DOC_SYSTEM_PROMPT, userMessage);

    if (aiResponse) {
      try {
        // Try to parse JSON from the AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiScore = Math.max(1, Math.min(10, parseInt(parsed.score) || 5));
          aiFeedback = [
            { type: 'summary', content: parsed.summary || 'Document reviewed' },
            ...(parsed.issues || []).map(issue => ({ type: 'issue', content: issue })),
            ...(parsed.suggestions || []).map(sug => ({ type: 'suggestion', content: sug })),
          ];
          status = 'checked';
        }
      } catch (parseErr) {
        // If JSON parse fails, store raw response as feedback
        aiFeedback = [{ type: 'raw', content: aiResponse }];
        aiScore = 5;
        status = 'checked';
      }
    } else {
      // No AI available — provide basic rule-based checks
      const basicChecks = [];

      if (!file_url) {
        basicChecks.push({ type: 'issue', content: 'No file uploaded — document cannot be fully verified without the actual file' });
      }

      if (document_type === 'passport') {
        basicChecks.push({ type: 'suggestion', content: 'Ensure passport has at least 6 months validity beyond your travel date' });
        basicChecks.push({ type: 'suggestion', content: 'Check that all pages are legible and undamaged' });
        basicChecks.push({ type: 'suggestion', content: 'Verify your name matches exactly across all documents' });
      } else if (document_type === 'bank_statement') {
        basicChecks.push({ type: 'suggestion', content: 'Statement should cover at least the last 6 months' });
        basicChecks.push({ type: 'suggestion', content: 'Ensure it is on official bank letterhead with stamp or digital verification' });
        basicChecks.push({ type: 'suggestion', content: 'Large unexplained deposits may raise questions — be prepared to explain them' });
      } else if (document_type === 'employment_letter') {
        basicChecks.push({ type: 'suggestion', content: 'Letter should include your position, salary, employment start date, and leave approval' });
        basicChecks.push({ type: 'suggestion', content: 'Must be on company letterhead with authorized signature' });
        basicChecks.push({ type: 'suggestion', content: 'Include company registration number and contact details' });
      } else if (document_type === 'transcript' || document_type === 'degree') {
        basicChecks.push({ type: 'suggestion', content: 'Ensure document is certified or notarized if required by the destination country' });
        basicChecks.push({ type: 'suggestion', content: 'Check if official translation is needed for non-English documents' });
        basicChecks.push({ type: 'suggestion', content: 'Include WES or IQAS evaluation if applying to Canada' });
      } else if (document_type === 'photo') {
        basicChecks.push({ type: 'suggestion', content: 'Photo must meet the specific size requirements of the destination country' });
        basicChecks.push({ type: 'suggestion', content: 'Background should be plain white or light-colored' });
        basicChecks.push({ type: 'suggestion', content: 'Recent photo taken within the last 6 months, no glasses, neutral expression' });
      } else {
        basicChecks.push({ type: 'suggestion', content: 'Ensure all documents are clear, legible, and up to date' });
        basicChecks.push({ type: 'suggestion', content: 'Check if notarization or apostille is required' });
        basicChecks.push({ type: 'suggestion', content: 'Verify name consistency across all submitted documents' });
      }

      aiFeedback = [
        { type: 'summary', content: 'Basic document review completed (AI unavailable — rule-based checks applied)' },
        ...basicChecks,
      ];
      aiScore = file_url ? 6 : 4;
      status = 'checked';
    }

    const { rows } = await query(`
      INSERT INTO document_checks (user_id, pathway_id, document_name, document_type, file_url, ai_score, ai_feedback, status, checked_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `, [
      userId,
      pathway_id || null,
      document_name,
      document_type,
      file_url || null,
      aiScore,
      JSON.stringify(aiFeedback),
      status,
    ]);

    res.status(201).json({ check: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/documents/checks — get user's document checks ────────────────
const getDocumentChecks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pathway_id, status } = req.query;

    let sql = `SELECT * FROM document_checks WHERE user_id = $1`;
    const params = [userId];

    if (pathway_id) {
      params.push(pathway_id);
      sql += ` AND pathway_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const { rows } = await query(sql, params);
    res.json({ checks: rows });
  } catch (err) { next(err); }
};

module.exports = { checkDocument, getDocumentChecks };
