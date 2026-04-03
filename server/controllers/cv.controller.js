const { query } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── File upload config ──────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'cv');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}_cv_${Date.now()}${ext}`);
  },
});

const cvUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, TXT files allowed'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('cv');

// ── CV Scoring Engine ───────────────────────────────────────────────────────
function reviewCV(text, fileName) {
  const lower = text.toLowerCase();
  const lines = text.split('\n').filter(l => l.trim());
  const wordCount = text.split(/\s+/).length;

  let score = 0;
  const strengths = [];
  const improvements = [];
  const feedback = [];

  // 1. Length check (max 15 points)
  if (wordCount >= 300 && wordCount <= 1200) {
    score += 15;
    strengths.push('Good CV length — concise but comprehensive');
  } else if (wordCount >= 150) {
    score += 8;
    improvements.push('CV could be more detailed. Aim for 300-1200 words.');
  } else {
    score += 3;
    improvements.push('CV is too short. Add more details about experience and skills.');
  }

  // 2. Contact info (max 10 points)
  const hasEmail = lower.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
  const hasPhone = lower.match(/\+?\d[\d\s\-.()]{7,}/);
  if (hasEmail) { score += 5; strengths.push('Email address included'); }
  else improvements.push('Add your email address');
  if (hasPhone) { score += 5; strengths.push('Phone number included'); }
  else improvements.push('Add your phone number');

  // 3. Key sections (max 25 points)
  const sections = {
    'education': /education|academic|degree|university|college|school|diploma|bachelor|master|phd/i,
    'experience': /experience|employment|work\s*history|career|professional|worked?\s*at/i,
    'skills': /skills|competenc|proficienc|technologies|tools|languages/i,
    'summary': /summary|objective|profile|about\s*me|overview|introduction/i,
  };
  let sectionCount = 0;
  for (const [name, pattern] of Object.entries(sections)) {
    if (pattern.test(text)) {
      score += 6;
      sectionCount++;
      strengths.push(`${name.charAt(0).toUpperCase() + name.slice(1)} section present`);
    } else {
      improvements.push(`Add a "${name}" section to your CV`);
    }
  }
  if (sectionCount >= 4) score += 1; // bonus

  // 4. Quantifiable achievements (max 10 points)
  const numbers = text.match(/\d+%|\$[\d,]+|£[\d,]+|€[\d,]+|\d+ (years?|months?|projects?|clients?|team|people|users?|customers?)/gi);
  if (numbers && numbers.length >= 3) {
    score += 10;
    strengths.push(`${numbers.length} quantifiable achievements found — great!`);
  } else if (numbers && numbers.length >= 1) {
    score += 5;
    improvements.push('Add more numbers and metrics to demonstrate impact (e.g., "increased sales by 30%")');
  } else {
    improvements.push('Include quantifiable achievements (e.g., "managed team of 5", "grew revenue by 40%")');
  }

  // 5. Action verbs (max 10 points)
  const actionVerbs = ['managed', 'led', 'developed', 'created', 'implemented', 'designed', 'built', 'launched', 'improved', 'increased', 'reduced', 'achieved', 'delivered', 'collaborated', 'analyzed', 'optimized', 'established', 'generated', 'trained', 'coordinated'];
  const foundVerbs = actionVerbs.filter(v => lower.includes(v));
  if (foundVerbs.length >= 5) {
    score += 10;
    strengths.push(`Strong action verbs used (${foundVerbs.slice(0, 5).join(', ')})`);
  } else if (foundVerbs.length >= 2) {
    score += 5;
    improvements.push('Use more action verbs to describe your achievements (managed, led, developed, etc.)');
  } else {
    improvements.push('Start bullet points with action verbs (managed, led, developed, created, etc.)');
  }

  // 6. Technical skills (max 10 points)
  const techSkills = ['python', 'javascript', 'java', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'excel', 'powerbi', 'tableau', 'salesforce', 'sap', 'photoshop', 'figma', 'autocad', 'matlab'];
  const foundSkills = techSkills.filter(s => lower.includes(s));
  if (foundSkills.length >= 3) {
    score += 10;
    strengths.push(`Technical skills mentioned (${foundSkills.join(', ')})`);
  } else if (foundSkills.length >= 1) {
    score += 5;
    feedback.push('List more specific technical skills relevant to your field');
  }

  // 7. Professional formatting (max 10 points)
  if (lines.length >= 15) { score += 5; strengths.push('Well-structured with multiple sections'); }
  else improvements.push('Structure your CV with clear sections and bullet points');

  const hasBullets = text.match(/^[\s]*[•\-\*]/m);
  if (hasBullets) { score += 5; strengths.push('Uses bullet points for readability'); }
  else improvements.push('Use bullet points to list achievements and responsibilities');

  // 8. No typo indicators (max 5 points)
  const commonTypos = ['teh', 'recieve', 'seperate', 'occured', 'accomodate', 'definately'];
  const hasTypos = commonTypos.some(t => lower.includes(t));
  if (!hasTypos) { score += 5; strengths.push('No obvious spelling errors detected'); }
  else improvements.push('Proofread your CV — spelling errors were detected');

  // 9. File format (max 5 points)
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pdf') { score += 5; strengths.push('PDF format — professional and preserves layout'); }
  else if (ext === '.docx' || ext === '.doc') { score += 3; feedback.push('Consider saving as PDF for consistent formatting'); }
  else { score += 1; improvements.push('Save your CV as PDF for professional presentation'); }

  // Cap at 100
  score = Math.min(score, 100);

  // Overall verdict
  let verdict = 'needs_work';
  if (score >= 75) verdict = 'excellent';
  else if (score >= 60) verdict = 'good';
  else if (score >= 40) verdict = 'fair';

  feedback.push(`Overall score: ${score}/100`);
  if (verdict === 'excellent') feedback.push('Your CV is strong and ready for applications!');
  else if (verdict === 'good') feedback.push('Your CV is solid. A few improvements would make it stand out more.');
  else if (verdict === 'fair') feedback.push('Your CV needs some work before applying. Focus on the improvements listed.');
  else feedback.push('Your CV needs significant improvements. Address the items listed before applying.');

  return { score, strengths, improvements, feedback, verdict };
}

// ── POST /api/cv/upload — upload and auto-review CV ─────────────────────────
const uploadAndReview = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No CV file uploaded' });

    const fileUrl = `/uploads/cv/${file.filename}`;
    let rawText = '';

    // Read file content (basic text extraction)
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt' || ext === '.rtf') {
      rawText = fs.readFileSync(file.path, 'utf-8');
    } else {
      // For PDF/DOC, we read whatever text we can extract
      // In production, use a PDF parser — for now, use filename + basic analysis
      try { rawText = fs.readFileSync(file.path, 'utf-8'); } catch (e) { rawText = ''; }
      // If binary, provide minimal review
      if (rawText.includes('%PDF') || rawText.length < 50 || /[\x00-\x08]/.test(rawText.substring(0, 100))) {
        rawText = `[PDF/DOC file uploaded: ${file.originalname}]`;
      }
    }

    // Run CV review
    const review = reviewCV(rawText, file.originalname);

    // If it's a binary file we can't parse, give a basic score based on file properties
    if (rawText.startsWith('[PDF/DOC')) {
      review.score = 50;
      review.verdict = 'fair';
      review.feedback = ['CV uploaded successfully. For a detailed review, please upload in TXT format or wait for our team to review.'];
      review.strengths = ['CV uploaded in professional format'];
      review.improvements = ['Upload in TXT format for automated scoring', 'Ensure CV has clear sections: Summary, Experience, Education, Skills'];
    }

    // Save review
    const { rows } = await query(`
      INSERT INTO cv_reviews (user_id, file_name, file_url, file_size, raw_text, score, feedback, strengths, improvements, overall_verdict, reviewed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *
    `, [
      req.user.id, file.originalname, fileUrl, file.size,
      rawText.substring(0, 5000),
      review.score, JSON.stringify(review.feedback),
      JSON.stringify(review.strengths), JSON.stringify(review.improvements),
      review.verdict,
    ]);

    res.json({
      review: rows[0],
      score: review.score,
      verdict: review.verdict,
      strengths: review.strengths,
      improvements: review.improvements,
      feedback: review.feedback,
      canApply: review.score >= 60,
      message: review.score >= 60
        ? 'Your CV is ready! You can now apply to jobs.'
        : 'Your CV needs improvements before applying. See the feedback below.',
    });
  } catch (err) { next(err); }
};

// ── GET /api/cv/reviews — get user's CV reviews ─────────────────────────────
const getReviews = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT * FROM cv_reviews WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10
    `, [req.user.id]);
    res.json({ reviews: rows });
  } catch (err) { next(err); }
};

// ── GET /api/cv/latest — get latest review ──────────────────────────────────
const getLatestReview = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT * FROM cv_reviews WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1
    `, [req.user.id]);
    if (!rows.length) return res.json({ review: null, canApply: false });
    res.json({
      review: rows[0],
      canApply: rows[0].score >= 60,
    });
  } catch (err) { next(err); }
};

module.exports = { cvUpload, uploadAndReview, getReviews, getLatestReview };
