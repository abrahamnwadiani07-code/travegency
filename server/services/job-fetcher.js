/**
 * Tragency Live Job Fetcher
 * Fetches jobs from multiple free APIs daily
 *
 * Sources:
 * 1. Arbeitnow — European visa-sponsored jobs (free, no key)
 * 2. Remotive — Remote jobs globally (free, no key)
 * 3. Adzuna — 16 countries (needs free API key — add ADZUNA_APP_ID + ADZUNA_APP_KEY to .env)
 * 4. JSearch — LinkedIn/Indeed aggregator (needs RapidAPI key — add JSEARCH_API_KEY to .env)
 */

const { query } = require('../db');

const COUNTRY_CODES = {
  'United Kingdom': 'gb', 'United States': 'us', 'Canada': 'ca',
  'Germany': 'de', 'Australia': 'au', 'France': 'fr',
  'India': 'in', 'Netherlands': 'nl', 'Italy': 'it',
  'Spain': 'es', 'Poland': 'pl', 'Brazil': 'br',
  'Singapore': 'sg', 'New Zealand': 'nz', 'Austria': 'at',
  'South Africa': 'za',
};

// ── Arbeitnow (European visa-sponsored jobs) ────────────────────────────────
async function fetchArbeitnow() {
  const source = 'arbeitnow';
  let fetched = 0, inserted = 0;

  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
    const data = await res.json();
    const jobs = data.data || [];
    fetched = jobs.length;

    for (const job of jobs) {
      const exists = await query(`SELECT id FROM jobs WHERE source = $1 AND source_id = $2`, [source, job.slug]);
      if (exists.rows.length) continue;

      const country = job.location?.includes('Germany') ? 'Germany'
                    : job.location?.includes('Netherlands') ? 'Netherlands'
                    : job.location?.includes('Austria') ? 'Austria'
                    : job.location?.includes('Switzerland') ? 'Switzerland'
                    : job.location?.includes('UK') || job.location?.includes('London') ? 'United Kingdom'
                    : job.location?.includes('France') || job.location?.includes('Paris') ? 'France'
                    : 'Germany';

      const isSponsored = job.visa_sponsorship === true || (job.tags || []).some(t => t.toLowerCase().includes('visa'));
      const isRemote = job.remote === true || (job.tags || []).some(t => t.toLowerCase().includes('remote'));

      await query(`
        INSERT INTO jobs (title, description, country, city, industry, visa_sponsored, visa_type,
          skills, employment_type, apply_url, source, source_id, source_url, remote, status)
        VALUES ($1, $2, $3, $4, 'Technology', $5, $6, $7, 'full-time', $8, $9, $10, $11, $12, 'active')
        ON CONFLICT DO NOTHING
      `, [
        job.title, job.description?.substring(0, 2000) || job.title,
        country, job.location || country,
        isSponsored, isSponsored ? 'EU Blue Card' : null,
        JSON.stringify(job.tags || []),
        job.url, source, job.slug, job.url,
        isRemote,
      ]);
      inserted++;
    }

    await logFetch(source, null, fetched, inserted, 'success');
    console.log(`  [Arbeitnow] Fetched: ${fetched}, New: ${inserted}`);
  } catch (err) {
    await logFetch(source, null, fetched, inserted, 'error', err.message);
    console.error(`  [Arbeitnow] Error: ${err.message}`);
  }
}

// ── Remotive (Remote jobs globally) ─────────────────────────────────────────
async function fetchRemotive() {
  const source = 'remotive';
  let fetched = 0, inserted = 0;

  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=100');
    const data = await res.json();
    const jobs = data.jobs || [];
    fetched = jobs.length;

    for (const job of jobs) {
      const exists = await query(`SELECT id FROM jobs WHERE source = $1 AND source_id = $2`, [source, String(job.id)]);
      if (exists.rows.length) continue;

      const country = job.candidate_required_location?.includes('USA') ? 'United States'
                    : job.candidate_required_location?.includes('UK') ? 'United Kingdom'
                    : job.candidate_required_location?.includes('Canada') ? 'Canada'
                    : job.candidate_required_location?.includes('Europe') ? 'Germany'
                    : job.candidate_required_location?.includes('Worldwide') ? 'Remote'
                    : 'Remote';

      const industry = job.category || 'Technology';

      await query(`
        INSERT INTO jobs (title, description, country, city, industry, visa_sponsored, visa_type,
          skills, employment_type, apply_url, source, source_id, source_url, remote, status,
          salary_currency)
        VALUES ($1, $2, $3, $4, $5, FALSE, NULL, $6, $7, $8, $9, $10, $11, TRUE, 'active', 'USD')
        ON CONFLICT DO NOTHING
      `, [
        job.title,
        (job.description || job.title).substring(0, 2000),
        country, job.candidate_required_location || 'Remote',
        industry,
        JSON.stringify(job.tags || []),
        job.job_type || 'full-time',
        job.url, source, String(job.id), job.url,
      ]);
      inserted++;
    }

    await logFetch(source, null, fetched, inserted, 'success');
    console.log(`  [Remotive] Fetched: ${fetched}, New: ${inserted}`);
  } catch (err) {
    await logFetch(source, null, fetched, inserted, 'error', err.message);
    console.error(`  [Remotive] Error: ${err.message}`);
  }
}

// ── Adzuna (16 countries — needs API key) ───────────────────────────────────
async function fetchAdzuna() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.log('  [Adzuna] Skipped — set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env');
    return;
  }

  const source = 'adzuna';
  const countries = ['gb', 'us', 'ca', 'de', 'au', 'fr', 'in', 'nl', 'nz', 'sg', 'za', 'at', 'pl', 'br', 'it'];
  const countryNames = { gb: 'United Kingdom', us: 'United States', ca: 'Canada', de: 'Germany', au: 'Australia', fr: 'France', 'in': 'India', nl: 'Netherlands', nz: 'New Zealand', sg: 'Singapore', za: 'South Africa', at: 'Austria', pl: 'Poland', br: 'Brazil', it: 'Italy' };

  for (const cc of countries) {
    let fetched = 0, inserted = 0;
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/${cc}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=visa+sponsorship&content-type=application/json`;
      const res = await fetch(url);
      const data = await res.json();
      const jobs = data.results || [];
      fetched = jobs.length;

      for (const job of jobs) {
        const exists = await query(`SELECT id FROM jobs WHERE source = $1 AND source_id = $2`, [source, job.id]);
        if (exists.rows.length) continue;

        const isSponsored = (job.title + ' ' + (job.description || '')).toLowerCase().includes('visa') ||
                           (job.title + ' ' + (job.description || '')).toLowerCase().includes('sponsor');

        await query(`
          INSERT INTO jobs (title, description, country, city, industry, visa_sponsored, visa_type,
            salary_min, salary_max, salary_currency, apply_url, source, source_id, source_url, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
          ON CONFLICT DO NOTHING
        `, [
          job.title, (job.description || '').substring(0, 2000),
          countryNames[cc], job.location?.display_name || countryNames[cc],
          job.category?.label || 'General',
          isSponsored, isSponsored ? 'Work Visa' : null,
          job.salary_min || null, job.salary_max || null,
          cc === 'gb' ? 'GBP' : cc === 'us' ? 'USD' : cc === 'ca' ? 'CAD' : cc === 'au' ? 'AUD' : cc === 'de' ? 'EUR' : 'USD',
          job.redirect_url, source, String(job.id), job.redirect_url,
        ]);
        inserted++;
      }

      await logFetch(source, countryNames[cc], fetched, inserted, 'success');
      console.log(`  [Adzuna:${cc}] Fetched: ${fetched}, New: ${inserted}`);
    } catch (err) {
      await logFetch(source, countryNames[cc], fetched, inserted, 'error', err.message);
      console.error(`  [Adzuna:${cc}] Error: ${err.message}`);
    }
  }
}

// ── Log fetch results ───────────────────────────────────────────────────────
async function logFetch(source, country, fetched, newJobs, status, error) {
  try {
    await query(
      `INSERT INTO job_fetch_log (source, country, jobs_fetched, jobs_new, status, error) VALUES ($1,$2,$3,$4,$5,$6)`,
      [source, country, fetched, newJobs, status, error || null]
    );
  } catch (e) { /* ignore log errors */ }
}

// ── Mark old jobs as expired ────────────────────────────────────────────────
async function expireOldJobs() {
  try {
    const { rowCount } = await query(`
      UPDATE jobs SET status = 'expired'
      WHERE source != 'manual' AND created_at < NOW() - INTERVAL '30 days' AND status = 'active'
    `);
    console.log(`  [Cleanup] Expired ${rowCount} old jobs`);
  } catch (err) {
    console.error(`  [Cleanup] Error: ${err.message}`);
  }
}

// ── Main fetch function (run daily) ─────────────────────────────────────────
async function fetchAllJobs() {
  console.log('\n📥 Fetching live jobs…\n');
  await fetchArbeitnow();
  await fetchRemotive();
  await fetchAdzuna();
  await expireOldJobs();
  console.log('\n✅ Job fetch complete.\n');
}

module.exports = { fetchAllJobs, fetchArbeitnow, fetchRemotive, fetchAdzuna, expireOldJobs };
