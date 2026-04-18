// Load .env from parent dir (local dev) or from current dir / env vars (production)
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });
if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
  require('dotenv').config(); // fallback to server/.env or process env
}

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');

const routes              = require('./routes');
const { errorHandler, notFound } = require('./middleware/error');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security & logging ────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
// Raw body needed for Paystack webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Serve uploaded files ────────────────────────────────────────────────────
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    service: 'Tragency API',
    version: '1.0.0',
    time:    new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Tragency API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Database:    ${process.env.DB_NAME || 'via DATABASE_URL'}@${process.env.DB_HOST || 'cloud'}\n`);

  // ── Run new migrations ─────────────────────────────────────────────────
  const migrateV10 = require('./migrate-v10');
  migrateV10().then(() => {
    console.log('Migration v10 complete');
    const seedV10 = require('./seed-v10');
    seedV10().catch(e => console.error('Seed v10 error:', e.message));
  }).catch(e => console.error('Migration v10 error:', e.message));

  // ── Auto-fetch jobs every 12 hours ──────────────────────────────────────
  const { fetchAllJobs } = require('./services/job-fetcher');
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  // Fetch on startup (delayed 30s to let DB settle)
  setTimeout(() => {
    console.log('📥 Initial job fetch starting...');
    fetchAllJobs().catch(e => console.error('Job fetch error:', e.message));
  }, 30000);

  // Then every 12 hours
  setInterval(() => {
    console.log('📥 Scheduled job fetch (every 12hrs)...');
    fetchAllJobs().catch(e => console.error('Job fetch error:', e.message));
  }, TWELVE_HOURS);
});

module.exports = app;
