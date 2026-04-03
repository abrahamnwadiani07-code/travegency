/**
 * Tragency — Full DB Migration
 * Run: npm run migrate
 *
 * Tables:
 *  users        — travellers who register through portals
 *  agents       — verified travel agents
 *  agent_paths  — which travel paths each agent covers
 *  bookings     — trip bookings linking traveller + agent
 *  payments     — escrow payment records
 *  messages     — in-app messaging between traveller & agent
 *  notifications— system notifications
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { query, pool } = require('./db');

async function migrate() {
  console.log('🔄 Running Tragency migrations…\n');

  try {
    // ── Extensions ──────────────────────────────────────────────────────────
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ── ENUM types ───────────────────────────────────────────────────────────
    await query(`
      DO $$ BEGIN
        CREATE TYPE travel_path AS ENUM (
          'education', 'tourism', 'medical', 'business',
          'relocation', 'religious', 'family'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE booking_status AS ENUM (
          'pending', 'agent_assigned', 'confirmed',
          'in_progress', 'completed', 'cancelled', 'disputed'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM (
          'unpaid', 'in_escrow', 'released', 'refunded', 'disputed'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE agent_status AS ENUM (
          'pending_review', 'active', 'suspended', 'rejected'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('traveller', 'agent', 'admin');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── USERS ────────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        role          user_role        NOT NULL DEFAULT 'traveller',
        first_name    VARCHAR(100)     NOT NULL,
        last_name     VARCHAR(100)     NOT NULL,
        email         VARCHAR(255)     NOT NULL UNIQUE,
        phone         VARCHAR(30),
        password_hash TEXT             NOT NULL,
        country       VARCHAR(100),
        travel_path   travel_path,
        destination   VARCHAR(150),
        travel_date   DATE,
        notes         TEXT,
        extra_data    JSONB            DEFAULT '{}',
        is_verified   BOOLEAN          DEFAULT FALSE,
        verify_token  TEXT,
        reset_token   TEXT,
        reset_expires TIMESTAMPTZ,
        last_login    TIMESTAMPTZ,
        created_at    TIMESTAMPTZ      DEFAULT NOW(),
        updated_at    TIMESTAMPTZ      DEFAULT NOW()
      );
    `);

    // ── AGENTS ───────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS agents (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
        display_name    VARCHAR(150)  NOT NULL,
        bio             TEXT,
        location        VARCHAR(150),
        experience_yrs  INT           DEFAULT 0,
        rate_per_trip   NUMERIC(10,2) DEFAULT 0,
        rating          NUMERIC(3,2)  DEFAULT 0,
        total_reviews   INT           DEFAULT 0,
        total_bookings  INT           DEFAULT 0,
        status          agent_status  DEFAULT 'pending_review',
        verified_at     TIMESTAMPTZ,
        verified_by     UUID,
        avatar_url      TEXT,
        documents       JSONB         DEFAULT '[]',
        created_at      TIMESTAMPTZ   DEFAULT NOW(),
        updated_at      TIMESTAMPTZ   DEFAULT NOW()
      );
    `);

    // ── AGENT PATHS (many-to-many) ────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS agent_paths (
        agent_id    UUID REFERENCES agents(id) ON DELETE CASCADE,
        path        travel_path NOT NULL,
        is_primary  BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (agent_id, path)
      );
    `);

    // ── BOOKINGS ─────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        reference       VARCHAR(30)     NOT NULL UNIQUE,
        traveller_id    UUID REFERENCES users(id) ON DELETE SET NULL,
        agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,
        travel_path     travel_path     NOT NULL,
        service         VARCHAR(150)    NOT NULL,
        destination     VARCHAR(150)    NOT NULL,
        travel_date     DATE,
        amount          NUMERIC(12,2)   NOT NULL DEFAULT 0,
        platform_fee    NUMERIC(12,2)   NOT NULL DEFAULT 0,
        agent_payout    NUMERIC(12,2)   NOT NULL DEFAULT 0,
        status          booking_status  DEFAULT 'pending',
        notes           TEXT,
        extra_data      JSONB           DEFAULT '{}',
        confirmed_at    TIMESTAMPTZ,
        completed_at    TIMESTAMPTZ,
        cancelled_at    TIMESTAMPTZ,
        cancelled_by    UUID,
        cancel_reason   TEXT,
        created_at      TIMESTAMPTZ     DEFAULT NOW(),
        updated_at      TIMESTAMPTZ     DEFAULT NOW()
      );
    `);

    // ── PAYMENTS ─────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
        payer_id        UUID REFERENCES users(id) ON DELETE SET NULL,
        amount          NUMERIC(12,2)   NOT NULL,
        currency        VARCHAR(10)     DEFAULT 'NGN',
        gateway         VARCHAR(50)     DEFAULT 'paystack',
        gateway_ref     TEXT,
        gateway_data    JSONB           DEFAULT '{}',
        status          payment_status  DEFAULT 'unpaid',
        escrow_held_at  TIMESTAMPTZ,
        released_at     TIMESTAMPTZ,
        refunded_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ     DEFAULT NOW(),
        updated_at      TIMESTAMPTZ     DEFAULT NOW()
      );
    `);

    // ── MESSAGES ─────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id  UUID REFERENCES bookings(id) ON DELETE CASCADE,
        sender_id   UUID REFERENCES users(id) ON DELETE SET NULL,
        body        TEXT NOT NULL,
        is_read     BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        title       VARCHAR(200) NOT NULL,
        body        TEXT,
        type        VARCHAR(50)  DEFAULT 'info',
        is_read     BOOLEAN      DEFAULT FALSE,
        meta        JSONB        DEFAULT '{}',
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      );
    `);

    // ── REVIEWS ──────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
        agent_id    UUID REFERENCES agents(id) ON DELETE CASCADE,
        user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
        rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment     TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── INDEXES ───────────────────────────────────────────────────────────────
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_path         ON users(travel_path)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bookings_traveller ON bookings(traveller_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bookings_agent     ON bookings(agent_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bookings_status    ON bookings(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_booking   ON payments(booking_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_booking   ON messages(booking_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notif_user         ON notifications(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_reviews_agent      ON reviews(agent_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_reviews_booking    ON reviews(booking_id)`);

    // ── updated_at trigger ────────────────────────────────────────────────────
    await query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);

    for (const tbl of ['users', 'agents', 'bookings', 'payments']) {
      await query(`
        DROP TRIGGER IF EXISTS trg_${tbl}_updated_at ON ${tbl};
        CREATE TRIGGER trg_${tbl}_updated_at
          BEFORE UPDATE ON ${tbl}
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      `);
    }

    console.log('✅ All migrations complete.\n');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
