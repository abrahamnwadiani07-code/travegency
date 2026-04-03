/**
 * Tragency V4 Migration — Subscriptions, Enhanced Jobs
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { query, pool } = require('./db');

async function migrate() {
  console.log('🔄 Running Tragency V4 migrations…\n');

  try {
    // ── Subscriptions ────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        plan        VARCHAR(30) NOT NULL DEFAULT 'free',
        status      VARCHAR(30) DEFAULT 'active',
        amount      NUMERIC(10,2) DEFAULT 0,
        currency    VARCHAR(10) DEFAULT 'NGN',
        started_at  TIMESTAMPTZ DEFAULT NOW(),
        expires_at  TIMESTAMPTZ,
        gateway_ref TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Add source tracking to jobs ──────────────────────────────────────────
    await query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'`);
    await query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_id TEXT`);
    await query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_url TEXT`);
    await query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS remote BOOLEAN DEFAULT FALSE`);

    // ── Job fetch log (track daily fetches) ──────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS job_fetch_log (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source      VARCHAR(50) NOT NULL,
        country     VARCHAR(100),
        jobs_fetched INT DEFAULT 0,
        jobs_new     INT DEFAULT 0,
        status      VARCHAR(30) DEFAULT 'success',
        error       TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Daily job views tracking (for free tier limit) ───────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS job_views (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
        job_id     UUID REFERENCES jobs(id) ON DELETE CASCADE,
        viewed_at  DATE DEFAULT CURRENT_DATE,
        UNIQUE(user_id, job_id, viewed_at)
      );
    `);

    // ── Indexes ──────────────────────────────────────────────────────────────
    await query(`CREATE INDEX IF NOT EXISTS idx_subs_user      ON subscriptions(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_subs_status    ON subscriptions(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_jobs_source    ON jobs(source)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_jobs_source_id ON jobs(source_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_job_views_user ON job_views(user_id, viewed_at)`);

    // ── Subscription pricing config ──────────────────────────────────────────
    await query(`
      INSERT INTO platform_config (key, value) VALUES
        ('subscription_plans', '{
          "free": {"name":"Free","price":0,"currency":"NGN","jobs_per_day":5,"features":["Browse job titles","See companies","Basic country filter"]},
          "basic": {"name":"Basic","price":5000,"currency":"NGN","period":"monthly","jobs_per_day":999,"features":["Unlimited job views","Full salary details","Apply links","Email job alerts"]},
          "pro": {"name":"Pro","price":15000,"currency":"NGN","period":"monthly","jobs_per_day":999,"features":["Everything in Basic","AI Job Matching","Priority agent matching","Document review","Direct company intros"]}
        }')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `);

    console.log('✅ V4 migrations complete.\n');
  } catch (err) {
    console.error('❌ V4 Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
