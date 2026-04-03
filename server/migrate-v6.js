require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
if (!process.env.DB_HOST && !process.env.DATABASE_URL) require('dotenv').config();

const { query } = require('./db');

async function migrateV6() {
  console.log('Running V6 migration (KYC fields for agents)...');

  // Add KYC columns to agents table
  const cols = [
    ['kyc_status', "VARCHAR(30) DEFAULT 'not_submitted'"],
    ['kyc_documents', 'JSONB DEFAULT \'[]\'::jsonb'],
    ['kyc_submitted_at', 'TIMESTAMPTZ'],
    ['kyc_reviewed_at', 'TIMESTAMPTZ'],
    ['kyc_reviewer_notes', 'TEXT'],
    ['business_registration', 'VARCHAR(255)'],
    ['tax_id', 'VARCHAR(100)'],
    ['bank_name', 'VARCHAR(100)'],
    ['bank_account_number', 'VARCHAR(50)'],
    ['bank_account_name', 'VARCHAR(100)'],
  ];

  for (const [col, type] of cols) {
    try {
      await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log(`  ✓ agents.${col}`);
    } catch (e) {
      if (e.message.includes('already exists')) console.log(`  - agents.${col} (exists)`);
      else console.error(`  ✗ agents.${col}:`, e.message);
    }
  }

  // Create documents table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      doc_type VARCHAR(50) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url TEXT,
      file_size INTEGER,
      status VARCHAR(30) DEFAULT 'pending',
      reviewer_notes TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ documents table');

  console.log('✅ V6 migration complete!');
  process.exit(0);
}

migrateV6().catch(e => { console.error(e); process.exit(1); });
