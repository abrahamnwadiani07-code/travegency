require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
if (!process.env.DB_HOST && !process.env.DATABASE_URL) require('dotenv').config();
const { query } = require('./db');

async function migrateV8() {
  console.log('Running V8 migration (jobs enhancements + CV reviews)...');

  // Add missing columns to jobs
  const jobCols = [
    ['company_name', 'VARCHAR(255)'],
    ['remote', 'BOOLEAN DEFAULT FALSE'],
    ['source', "VARCHAR(50) DEFAULT 'manual'"],
    ['source_id', 'VARCHAR(255)'],
    ['source_url', 'TEXT'],
  ];
  for (const [col, type] of jobCols) {
    try { await query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ${col} ${type}`); console.log(`  ✓ jobs.${col}`); }
    catch (e) { if (!e.message.includes('already exists')) console.error(`  ✗ jobs.${col}:`, e.message); }
  }

  // CV reviews table
  await query(`
    CREATE TABLE IF NOT EXISTS cv_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      file_name VARCHAR(255),
      file_url TEXT,
      file_size INTEGER,
      raw_text TEXT,
      score INTEGER DEFAULT 0,
      feedback JSONB DEFAULT '[]'::jsonb,
      strengths JSONB DEFAULT '[]'::jsonb,
      improvements JSONB DEFAULT '[]'::jsonb,
      overall_verdict VARCHAR(20) DEFAULT 'pending',
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ cv_reviews table');

  // Job fetch log
  await query(`
    CREATE TABLE IF NOT EXISTS job_fetch_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source VARCHAR(50),
      country VARCHAR(100),
      jobs_fetched INTEGER DEFAULT 0,
      jobs_new INTEGER DEFAULT 0,
      status VARCHAR(30),
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ job_fetch_log table');

  // Unique constraint for source jobs
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source_unique ON jobs(source, source_id) WHERE source IS NOT NULL AND source_id IS NOT NULL`).catch(() => {});

  console.log('✅ V8 migration complete!');
  process.exit(0);
}

migrateV8().catch(e => { console.error(e); process.exit(1); });
