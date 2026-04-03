require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
if (!process.env.DB_HOST && !process.env.DATABASE_URL) require('dotenv').config();

const { query } = require('./db');

async function migrateV5() {
  console.log('Running V5 migration (chat sessions & tier system)...');

  await query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      agent_id UUID REFERENCES users(id),
      booking_id UUID REFERENCES bookings(id),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ chat_sessions table');

  // Add index for quick lookups
  await query(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, expires_at)`).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON chat_sessions(agent_id, expires_at)`).catch(() => {});

  console.log('✅ V5 migration complete!');
  process.exit(0);
}

migrateV5().catch(e => { console.error(e); process.exit(1); });
