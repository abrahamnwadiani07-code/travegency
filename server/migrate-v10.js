require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
if (!process.env.DB_HOST && !process.env.DATABASE_URL) require('dotenv').config();
const { query } = require('./db');

async function migrateV10() {
  console.log('Running V10 migration (immigration pathways, document checks, visa predictions, scholarships, cost of living)...');

  // Immigration pathway tracker
  await query(`
    CREATE TABLE IF NOT EXISTS immigration_pathways (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
      from_country VARCHAR(100) NOT NULL,
      to_country VARCHAR(100) NOT NULL,
      visa_type VARCHAR(100) NOT NULL,
      travel_path VARCHAR(50) NOT NULL,
      current_step INTEGER NOT NULL DEFAULT 1,
      total_steps INTEGER NOT NULL DEFAULT 9,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      estimated_weeks INTEGER,
      steps JSONB DEFAULT '[]'::jsonb,
      next_action TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ immigration_pathways table');

  // AI document checker results
  await query(`
    CREATE TABLE IF NOT EXISTS document_checks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pathway_id UUID REFERENCES immigration_pathways(id) ON DELETE SET NULL,
      document_name VARCHAR(255) NOT NULL,
      document_type VARCHAR(100) NOT NULL,
      file_url TEXT,
      ai_score INTEGER,
      ai_feedback JSONB DEFAULT '[]'::jsonb,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      checked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ document_checks table');

  // Visa success predictions
  await query(`
    CREATE TABLE IF NOT EXISTS visa_predictions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_country VARCHAR(100) NOT NULL,
      to_country VARCHAR(100) NOT NULL,
      visa_type VARCHAR(100) NOT NULL,
      travel_purpose VARCHAR(100) NOT NULL,
      probability INTEGER NOT NULL,
      factors JSONB DEFAULT '[]'::jsonb,
      improvements JSONB DEFAULT '[]'::jsonb,
      profile_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ visa_predictions table');

  // Scholarship database
  await query(`
    CREATE TABLE IF NOT EXISTS scholarships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(500) NOT NULL,
      country VARCHAR(100) NOT NULL,
      university VARCHAR(300),
      degree_level VARCHAR(50) NOT NULL,
      field_of_study VARCHAR(200),
      amount VARCHAR(100),
      currency VARCHAR(10) DEFAULT 'USD',
      coverage TEXT,
      deadline VARCHAR(100),
      eligibility TEXT,
      apply_url TEXT,
      description TEXT,
      is_full_ride BOOLEAN DEFAULT FALSE,
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ scholarships table');

  // Cost of living comparison data
  await query(`
    CREATE TABLE IF NOT EXISTS cost_of_living (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      city VARCHAR(100) NOT NULL,
      country VARCHAR(100) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      rent_1br INTEGER,
      rent_3br INTEGER,
      groceries_monthly INTEGER,
      transport_monthly INTEGER,
      utilities_monthly INTEGER,
      internet_monthly INTEGER,
      dining_out INTEGER,
      healthcare_monthly INTEGER,
      avg_salary INTEGER,
      quality_of_life_score INTEGER,
      safety_score INTEGER,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(city, country)
    )
  `);
  console.log('  ✓ cost_of_living table');

  console.log('✅ V10 migration complete!');
}

module.exports = migrateV10;

if (require.main === module) {
  migrateV10().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
