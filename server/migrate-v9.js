require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
if (!process.env.DB_HOST && !process.env.DATABASE_URL) require('dotenv').config();
const { query } = require('./db');

async function migrateV9() {
  console.log('Running V9 migration (AI learning + conversation insights)...');

  // AI learns from conversations — stores extracted insights
  await query(`
    CREATE TABLE IF NOT EXISTS ai_insights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID,
      user_id UUID,
      from_country VARCHAR(100),
      to_country VARCHAR(100),
      travel_path VARCHAR(50),
      profession VARCHAR(100),
      experience_years INTEGER,
      qualification VARCHAR(100),
      budget_range VARCHAR(100),
      timeline VARCHAR(100),
      concerns TEXT[],
      preferences JSONB DEFAULT '{}'::jsonb,
      outcome VARCHAR(30),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ ai_insights table');

  // Track popular routes for AI to learn from
  await query(`
    CREATE TABLE IF NOT EXISTS popular_routes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_country VARCHAR(100) NOT NULL,
      to_country VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      search_count INTEGER DEFAULT 1,
      last_searched TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(from_country, to_country, category)
    )
  `);
  console.log('  ✓ popular_routes table');

  console.log('✅ V9 migration complete!');
  process.exit(0);
}

migrateV9().catch(e => { console.error(e); process.exit(1); });
