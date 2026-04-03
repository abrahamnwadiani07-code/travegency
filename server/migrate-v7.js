require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
if (!process.env.DB_HOST && !process.env.DATABASE_URL) require('dotenv').config();
const { query } = require('./db');

async function migrateV7() {
  console.log('Running V7 migration (visa requirements, agent sessions, message security, video calls)...');

  // 1. Visa requirements table
  await query(`
    CREATE TABLE IF NOT EXISTS visa_requirements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_country VARCHAR(100) NOT NULL,
      to_country VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      visa_type VARCHAR(100),
      processing_time VARCHAR(100),
      visa_fee VARCHAR(100),
      requirements JSONB DEFAULT '[]'::jsonb,
      documents JSONB DEFAULT '[]'::jsonb,
      application_url TEXT,
      embassy_url TEXT,
      notes TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(from_country, to_country, category)
    )
  `);
  console.log('  ✓ visa_requirements table');

  // 2. Agent sessions (1 month paid sessions)
  await query(`
    CREATE TABLE IF NOT EXISTS agent_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      traveller_id UUID NOT NULL REFERENCES users(id),
      agent_id UUID NOT NULL REFERENCES users(id),
      booking_id UUID REFERENCES bookings(id),
      status VARCHAR(30) DEFAULT 'active',
      amount NUMERIC(12,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'NGN',
      started_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      renewed_at TIMESTAMPTZ,
      reminder_sent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ agent_sessions table');

  // 3. Video call sessions
  await query(`
    CREATE TABLE IF NOT EXISTS video_calls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES agent_sessions(id),
      booking_id UUID REFERENCES bookings(id),
      caller_id UUID NOT NULL REFERENCES users(id),
      receiver_id UUID NOT NULL REFERENCES users(id),
      room_id VARCHAR(100) NOT NULL,
      status VARCHAR(30) DEFAULT 'pending',
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      duration_seconds INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ video_calls table');

  // Indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_visa_req_route ON visa_requirements(from_country, to_country, category)`).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_sessions_traveller ON agent_sessions(traveller_id, status)`).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions(agent_id, status)`).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_sessions_expiry ON agent_sessions(expires_at) WHERE status = 'active'`).catch(() => {});

  console.log('✅ V7 migration complete!');
  process.exit(0);
}

migrateV7().catch(e => { console.error(e); process.exit(1); });
