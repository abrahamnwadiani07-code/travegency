/**
 * Tragency V3 Migration — Jobs, Companies, News
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { query, pool } = require('./db');

async function migrate() {
  console.log('🔄 Running Tragency V3 migrations…\n');

  try {
    // ── Companies (visa sponsors) ────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS companies (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        VARCHAR(200) NOT NULL,
        country     VARCHAR(100) NOT NULL,
        industry    VARCHAR(100),
        website     TEXT,
        logo_url    TEXT,
        description TEXT,
        size        VARCHAR(30) DEFAULT 'enterprise',
        sponsors_visa BOOLEAN DEFAULT TRUE,
        visa_types  JSONB DEFAULT '[]',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Jobs ─────────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
        title           VARCHAR(300) NOT NULL,
        description     TEXT,
        country         VARCHAR(100) NOT NULL,
        city            VARCHAR(100),
        industry        VARCHAR(100),
        salary_min      NUMERIC(12,2),
        salary_max      NUMERIC(12,2),
        salary_currency VARCHAR(10) DEFAULT 'USD',
        visa_sponsored  BOOLEAN DEFAULT TRUE,
        visa_type       VARCHAR(100),
        experience_min  INT DEFAULT 0,
        qualification   VARCHAR(100),
        skills          JSONB DEFAULT '[]',
        employment_type VARCHAR(50) DEFAULT 'full-time',
        apply_url       TEXT,
        status          VARCHAR(30) DEFAULT 'active',
        posted_by       UUID REFERENCES users(id) ON DELETE SET NULL,
        expires_at      TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Job Applications ─────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id      UUID REFERENCES jobs(id) ON DELETE CASCADE,
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        status      VARCHAR(30) DEFAULT 'applied',
        cover_note  TEXT,
        resume_url  TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(job_id, user_id)
      );
    `);

    // ── News ─────────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS news (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title       VARCHAR(500) NOT NULL,
        summary     TEXT,
        content     TEXT,
        source      VARCHAR(200),
        source_url  TEXT,
        image_url   TEXT,
        category    VARCHAR(50) DEFAULT 'general',
        country     VARCHAR(100),
        is_featured BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMPTZ DEFAULT NOW(),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Indexes ──────────────────────────────────────────────────────────────
    await query(`CREATE INDEX IF NOT EXISTS idx_companies_country   ON companies(country)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_jobs_country        ON jobs(country)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_jobs_status         ON jobs(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_jobs_company        ON jobs(company_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_job_apps_user       ON job_applications(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_news_category       ON news(category)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_news_published      ON news(published_at DESC)`);

    console.log('✅ V3 migrations complete.\n');
  } catch (err) {
    console.error('❌ V3 Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
