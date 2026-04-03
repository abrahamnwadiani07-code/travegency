/**
 * Tragency V2 Migration — AI Agent, Matching, Documents, Milestones
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { query, pool } = require('./db');

async function migrate() {
  console.log('🔄 Running Tragency V2 migrations…\n');

  try {
    // ── AI Conversations ─────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id    VARCHAR(100) NOT NULL,
        user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
        status        VARCHAR(30) DEFAULT 'active',
        travel_path   travel_path,
        from_country  VARCHAR(100),
        to_country    VARCHAR(100),
        purpose       VARCHAR(100),
        summary       TEXT,
        doc_checklist JSONB DEFAULT '[]',
        eligibility   JSONB DEFAULT '{}',
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
        role            VARCHAR(20) NOT NULL,
        content         TEXT NOT NULL,
        metadata        JSONB DEFAULT '{}',
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Agent Matching ───────────────────────────────────────────────────────
    await query(`
      DO $$ BEGIN
        CREATE TYPE match_status AS ENUM (
          'suggested', 'liked', 'skipped', 'selected', 'paid', 'accepted', 'declined', 'expired'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS agent_matches (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
        user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
        agent_id        UUID REFERENCES agents(id) ON DELETE CASCADE,
        score           NUMERIC(5,2) DEFAULT 0,
        status          match_status DEFAULT 'suggested',
        rank            INT DEFAULT 0,
        matching_fee    NUMERIC(10,2) DEFAULT 0,
        paid_at         TIMESTAMPTZ,
        accepted_at     TIMESTAMPTZ,
        declined_at     TIMESTAMPTZ,
        expires_at      TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Documents ────────────────────────────────────────────────────────────
    await query(`
      DO $$ BEGIN
        CREATE TYPE doc_status AS ENUM ('pending', 'approved', 'rejected', 'reupload_requested');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS documents (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id   UUID REFERENCES bookings(id) ON DELETE CASCADE,
        user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
        doc_type     VARCHAR(100) NOT NULL,
        file_name    VARCHAR(255) NOT NULL,
        file_url     TEXT NOT NULL,
        file_size    INT DEFAULT 0,
        status       doc_status DEFAULT 'pending',
        reviewed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
        review_note  TEXT,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Milestones (progress tracking) ───────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id  UUID REFERENCES bookings(id) ON DELETE CASCADE,
        title       VARCHAR(200) NOT NULL,
        description TEXT,
        status      VARCHAR(30) DEFAULT 'pending',
        completed_at TIMESTAMPTZ,
        created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Matching fee config ──────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS platform_config (
        key    VARCHAR(100) PRIMARY KEY,
        value  JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Insert default matching fees
    await query(`
      INSERT INTO platform_config (key, value) VALUES
        ('matching_fees', '{"education":15000,"tourism":5000,"medical":20000,"business":15000,"relocation":25000,"religious":10000,"family":10000}'),
        ('matching_fee_default', '10000')
      ON CONFLICT (key) DO NOTHING
    `);

    // ── Indexes ──────────────────────────────────────────────────────────────
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_conv_session   ON ai_conversations(session_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_conv_user      ON ai_conversations(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_msg_conv       ON ai_messages(conversation_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_matches_user      ON agent_matches(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_matches_agent     ON agent_matches(agent_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_docs_booking      ON documents(booking_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_milestones_booking ON milestones(booking_id)`);

    console.log('✅ V2 migrations complete.\n');
  } catch (err) {
    console.error('❌ V2 Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
