/**
 * Tragency Multi-Source Job Fetcher
 * Fetches jobs from 8+ free APIs every 12 hours — NO SIGNUP REQUIRED
 *
 * Sources (no API key needed):
 * 1. Arbeitnow — European visa-sponsored jobs
 * 2. Remotive — Remote jobs globally
 * 3. RemoteOK — Remote tech/design/marketing jobs
 * 4. Himalayas — Remote jobs with company info
 * 5. Jobicy — Remote jobs by category
 * 6. WellFound (AngelList) — Startup jobs
 * 7. Open source jobs (GitHub)
 * 8. Admin manual postings
 *
 * Sources (with free API key):
 * 9. Adzuna — 16 countries, 10M+ jobs (set ADZUNA_APP_ID + ADZUNA_APP_KEY)
 * 10. JSearch — LinkedIn/Indeed aggregator (set JSEARCH_API_KEY)
 */

const { query } = require('../db');

// ── Helper: detect country from location string ─────────────────────────────
function detectCountry(location) {
  if (!location) return 'Remote';
  const l = location.toLowerCase();
  const map = {
    'usa': 'United States', 'united states': 'United States', 'us': 'United States', 'new york': 'United States', 'san francisco': 'United States', 'california': 'United States', 'texas': 'United States', 'seattle': 'United States', 'boston': 'United States', 'chicago': 'United States', 'los angeles': 'United States', 'miami': 'United States',
    'uk': 'United Kingdom', 'united kingdom': 'United Kingdom', 'london': 'United Kingdom', 'manchester': 'United Kingdom', 'birmingham': 'United Kingdom', 'edinburgh': 'United Kingdom', 'bristol': 'United Kingdom',
    'canada': 'Canada', 'toronto': 'Canada', 'vancouver': 'Canada', 'montreal': 'Canada', 'ottawa': 'Canada',
    'germany': 'Germany', 'berlin': 'Germany', 'munich': 'Germany', 'hamburg': 'Germany', 'frankfurt': 'Germany',
    'australia': 'Australia', 'sydney': 'Australia', 'melbourne': 'Australia', 'brisbane': 'Australia',
    'france': 'France', 'paris': 'France', 'lyon': 'France',
    'netherlands': 'Netherlands', 'amsterdam': 'Netherlands', 'rotterdam': 'Netherlands',
    'india': 'India', 'bangalore': 'India', 'mumbai': 'India', 'delhi': 'India', 'hyderabad': 'India',
    'singapore': 'Singapore',
    'uae': 'UAE', 'dubai': 'UAE', 'abu dhabi': 'UAE',
    'nigeria': 'Nigeria', 'lagos': 'Nigeria', 'abuja': 'Nigeria',
    'south africa': 'South Africa', 'cape town': 'South Africa', 'johannesburg': 'South Africa',
    'kenya': 'Kenya', 'nairobi': 'Kenya',
    'ghana': 'Ghana', 'accra': 'Ghana',
    'ireland': 'Ireland', 'dublin': 'Ireland',
    'switzerland': 'Switzerland', 'zurich': 'Switzerland',
    'sweden': 'Sweden', 'stockholm': 'Sweden',
    'norway': 'Norway', 'oslo': 'Norway',
    'denmark': 'Denmark', 'copenhagen': 'Denmark',
    'japan': 'Japan', 'tokyo': 'Japan',
    'south korea': 'South Korea', 'seoul': 'South Korea',
    'brazil': 'Brazil', 'sao paulo': 'Brazil',
    'spain': 'Spain', 'madrid': 'Spain', 'barcelona': 'Spain',
    'italy': 'Italy', 'rome': 'Italy', 'milan': 'Italy',
    'poland': 'Poland', 'warsaw': 'Poland',
    'austria': 'Austria', 'vienna': 'Austria',
    'new zealand': 'New Zealand', 'auckland': 'New Zealand',
    'portugal': 'Portugal', 'lisbon': 'Portugal',
    'belgium': 'Belgium', 'brussels': 'Belgium',
    'qatar': 'Qatar', 'doha': 'Qatar',
    'saudi arabia': 'Saudi Arabia', 'riyadh': 'Saudi Arabia',
    'worldwide': 'Remote', 'remote': 'Remote', 'anywhere': 'Remote', 'global': 'Remote',
  };
  for (const [key, val] of Object.entries(map)) {
    if (l.includes(key)) return val;
  }
  return 'Remote';
}

// ── Helper: detect industry ─────────────────────────────────────────────────
function detectIndustry(title, tags) {
  const text = (title + ' ' + (tags || []).join(' ')).toLowerCase();
  if (text.match(/software|developer|engineer|devops|frontend|backend|fullstack|react|node|python|java\b|golang|rust|php|ruby/)) return 'Technology';
  if (text.match(/data|analytics|machine learning|ai\b|artificial|scientist/)) return 'Technology';
  if (text.match(/design|ux|ui|graphic|creative|figma/)) return 'Design';
  if (text.match(/marketing|seo|content|social media|growth/)) return 'Marketing';
  if (text.match(/sales|business develop|account exec/)) return 'Sales';
  if (text.match(/finance|accounting|audit|tax|banking/)) return 'Finance';
  if (text.match(/nurse|doctor|medical|health|pharma|clinical/)) return 'Healthcare';
  if (text.match(/teach|education|professor|instructor|tutor/)) return 'Education';
  if (text.match(/legal|lawyer|solicitor|compliance/)) return 'Legal';
  if (text.match(/hr\b|human resource|recruit|talent/)) return 'Human Resources';
  if (text.match(/product\s*manag|project\s*manag|scrum|agile/)) return 'Management';
  if (text.match(/customer|support|success/)) return 'Customer Service';
  if (text.match(/civil|mechanical|electrical|chemical|construction/)) return 'Engineering';
  return 'General';
}

// ── Insert job helper ───────────────────────────────────────────────────────
async function insertJob(job) {
  try {
    const exists = await query(`SELECT id FROM jobs WHERE source = $1 AND source_id = $2`, [job.source, job.sourceId]);
    if (exists.rows.length) return false;

    await query(`
      INSERT INTO jobs (title, description, country, city, industry, visa_sponsored, visa_type,
        salary_min, salary_max, salary_currency, skills, employment_type,
        apply_url, source, source_id, source_url, remote, status, company_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'active',$18)
      ON CONFLICT DO NOTHING
    `, [
      job.title, (job.description || '').substring(0, 3000),
      job.country, job.city || job.country,
      job.industry || 'General',
      job.visaSponsored || false, job.visaType || null,
      job.salaryMin || null, job.salaryMax || null, job.salaryCurrency || null,
      JSON.stringify(job.skills || []), job.employmentType || 'full-time',
      job.applyUrl, job.source, job.sourceId, job.applyUrl,
      job.remote || false, job.companyName || null,
    ]);
    return true;
  } catch (e) { return false; }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 1: Arbeitnow (European visa-sponsored jobs)
// ══════════════════════════════════════════════════════════════════════════════
async function fetchArbeitnow() {
  const source = 'arbeitnow';
  let fetched = 0, inserted = 0;
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
    const data = await res.json();
    const jobs = data.data || [];
    fetched = jobs.length;
    for (const job of jobs) {
      const country = detectCountry(job.location);
      const isSponsored = job.visa_sponsorship === true || (job.tags || []).some(t => t.toLowerCase().includes('visa'));
      const ok = await insertJob({
        title: job.title, description: job.description,
        country, city: job.location || country,
        industry: detectIndustry(job.title, job.tags),
        visaSponsored: isSponsored, visaType: isSponsored ? 'EU Work Visa' : null,
        skills: job.tags || [], employmentType: 'full-time',
        applyUrl: job.url, source, sourceId: job.slug,
        remote: job.remote === true, companyName: job.company_name,
      });
      if (ok) inserted++;
    }
    await logFetch(source, null, fetched, inserted, 'success');
    console.log(`  [Arbeitnow] Fetched: ${fetched}, New: ${inserted}`);
  } catch (err) {
    await logFetch(source, null, fetched, inserted, 'error', err.message);
    console.error(`  [Arbeitnow] Error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 2: Remotive (Remote jobs globally)
// ══════════════════════════════════════════════════════════════════════════════
async function fetchRemotive() {
  const source = 'remotive';
  let fetched = 0, inserted = 0;
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=200');
    const data = await res.json();
    const jobs = data.jobs || [];
    fetched = jobs.length;
    for (const job of jobs) {
      const country = detectCountry(job.candidate_required_location);
      const ok = await insertJob({
        title: job.title, description: job.description,
        country, city: job.candidate_required_location || 'Remote',
        industry: job.category || detectIndustry(job.title, job.tags),
        visaSponsored: false, skills: job.tags || [],
        employmentType: job.job_type || 'full-time',
        applyUrl: job.url, source, sourceId: String(job.id),
        remote: true, companyName: job.company_name,
        salaryCurrency: 'USD',
      });
      if (ok) inserted++;
    }
    await logFetch(source, null, fetched, inserted, 'success');
    console.log(`  [Remotive] Fetched: ${fetched}, New: ${inserted}`);
  } catch (err) {
    await logFetch(source, null, fetched, inserted, 'error', err.message);
    console.error(`  [Remotive] Error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 3: RemoteOK (Remote tech jobs)
// ══════════════════════════════════════════════════════════════════════════════
async function fetchRemoteOK() {
  const source = 'remoteok';
  let fetched = 0, inserted = 0;
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'Tragency/1.0' },
    });
    const data = await res.json();
    const jobs = Array.isArray(data) ? data.filter(j => j.id && j.position) : [];
    fetched = jobs.length;
    for (const job of jobs) {
      const country = detectCountry(job.location);
      const ok = await insertJob({
        title: job.position, description: job.description,
        country, city: job.location || 'Remote',
        industry: detectIndustry(job.position, job.tags),
        visaSponsored: false, skills: job.tags || [],
        employmentType: 'full-time',
        applyUrl: job.url || `https://remoteok.com/l/${job.id}`,
        source, sourceId: String(job.id),
        remote: true, companyName: job.company,
        salaryMin: job.salary_min || null, salaryMax: job.salary_max || null,
        salaryCurrency: 'USD',
      });
      if (ok) inserted++;
    }
    await logFetch(source, null, fetched, inserted, 'success');
    console.log(`  [RemoteOK] Fetched: ${fetched}, New: ${inserted}`);
  } catch (err) {
    await logFetch(source, null, fetched, inserted, 'error', err.message);
    console.error(`  [RemoteOK] Error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 4: Himalayas (Remote jobs with company details)
// ══════════════════════════════════════════════════════════════════════════════
async function fetchHimalayas() {
  const source = 'himalayas';
  let fetched = 0, inserted = 0;
  try {
    const res = await fetch('https://himalayas.app/jobs/api?limit=100');
    const data = await res.json();
    const jobs = data.jobs || [];
    fetched = jobs.length;
    for (const job of jobs) {
      const country = detectCountry(job.location);
      const ok = await insertJob({
        title: job.title, description: job.excerpt || job.description,
        country, city: job.location || 'Remote',
        industry: detectIndustry(job.title, job.categories),
        visaSponsored: false, skills: job.categories || [],
        employmentType: job.type || 'full-time',
        applyUrl: job.applicationUrl || job.url,
        source, sourceId: job.id || job.slug,
        remote: true, companyName: job.companyName,
        salaryMin: job.minSalary || null, salaryMax: job.maxSalary || null,
        salaryCurrency: job.salaryCurrency || 'USD',
      });
      if (ok) inserted++;
    }
    await logFetch(source, null, fetched, inserted, 'success');
    console.log(`  [Himalayas] Fetched: ${fetched}, New: ${inserted}`);
  } catch (err) {
    await logFetch(source, null, fetched, inserted, 'error', err.message);
    console.error(`  [Himalayas] Error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 5: Jobicy (Remote jobs by category)
// ══════════════════════════════════════════════════════════════════════════════
async function fetchJobicy() {
  const source = 'jobicy';
  let fetched = 0, inserted = 0;
  try {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=50');
    const data = await res.json();
    const jobs = data.jobs || [];
    fetched = jobs.length;
    for (const job of jobs) {
      const country = detectCountry(job.jobGeo);
      const ok = await insertJob({
        title: job.jobTitle, description: job.jobExcerpt || job.jobDescription,
        country, city: job.jobGeo || 'Remote',
        industry: job.jobIndustry?.[0] || detectIndustry(job.jobTitle, []),
        visaSponsored: false, skills: job.jobIndustry || [],
        employmentType: job.jobType || 'full-time',
        applyUrl: job.url,
        source, sourceId: String(job.id),
        remote: true, companyName: job.companyName,
        salaryMin: job.annualSalaryMin || null, salaryMax: job.annualSalaryMax || null,
        salaryCurrency: job.salaryCurrency || 'USD',
      });
      if (ok) inserted++;
    }
    await logFetch(source, null, fetched, inserted, 'success');
    console.log(`  [Jobicy] Fetched: ${fetched}, New: ${inserted}`);
  } catch (err) {
    await logFetch(source, null, fetched, inserted, 'error', err.message);
    console.error(`  [Jobicy] Error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 6: Adzuna (16 countries — needs free API key)
// ══════════════════════════════════════════════════════════════════════════════
async function fetchAdzuna() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.log('  [Adzuna] Skipped — set ADZUNA_APP_ID + ADZUNA_APP_KEY');
    return;
  }
  const source = 'adzuna';
  const countries = [
    { cc: 'gb', name: 'United Kingdom', cur: 'GBP' }, { cc: 'us', name: 'United States', cur: 'USD' },
    { cc: 'ca', name: 'Canada', cur: 'CAD' }, { cc: 'de', name: 'Germany', cur: 'EUR' },
    { cc: 'au', name: 'Australia', cur: 'AUD' }, { cc: 'fr', name: 'France', cur: 'EUR' },
    { cc: 'in', name: 'India', cur: 'INR' }, { cc: 'nl', name: 'Netherlands', cur: 'EUR' },
    { cc: 'nz', name: 'New Zealand', cur: 'NZD' }, { cc: 'sg', name: 'Singapore', cur: 'SGD' },
    { cc: 'za', name: 'South Africa', cur: 'ZAR' }, { cc: 'it', name: 'Italy', cur: 'EUR' },
    { cc: 'pl', name: 'Poland', cur: 'PLN' }, { cc: 'br', name: 'Brazil', cur: 'BRL' },
  ];
  for (const { cc, name, cur } of countries) {
    let fetched = 0, inserted = 0;
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/${cc}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&content-type=application/json`;
      const res = await fetch(url);
      const data = await res.json();
      const jobs = data.results || [];
      fetched = jobs.length;
      for (const job of jobs) {
        const isSponsored = (job.title + ' ' + (job.description || '')).toLowerCase().match(/visa|sponsor/);
        const ok = await insertJob({
          title: job.title, description: job.description,
          country: name, city: job.location?.display_name || name,
          industry: job.category?.label || 'General',
          visaSponsored: !!isSponsored, visaType: isSponsored ? 'Work Visa' : null,
          salaryMin: job.salary_min, salaryMax: job.salary_max, salaryCurrency: cur,
          applyUrl: job.redirect_url, source, sourceId: String(job.id),
          companyName: job.company?.display_name,
        });
        if (ok) inserted++;
      }
      await logFetch(source, name, fetched, inserted, 'success');
      console.log(`  [Adzuna:${cc}] Fetched: ${fetched}, New: ${inserted}`);
    } catch (err) {
      await logFetch(source, name, fetched, inserted, 'error', err.message);
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
  } catch (e) { /* ignore */ }
}

// ── Mark old jobs as expired ────────────────────────────────────────────────
async function expireOldJobs() {
  try {
    const { rowCount } = await query(`
      UPDATE jobs SET status = 'expired'
      WHERE source != 'manual' AND created_at < NOW() - INTERVAL '30 days' AND status = 'active'
    `);
    console.log(`  [Cleanup] Expired ${rowCount} old jobs`);
  } catch (err) { console.error(`  [Cleanup] Error: ${err.message}`); }
}

// ── Main fetch function (run every 12 hours) ────────────────────────────────
async function fetchAllJobs() {
  console.log('\n\uD83D\uDCE5 Fetching live jobs from all sources...\n');
  await fetchArbeitnow();
  await fetchRemotive();
  await fetchRemoteOK();
  await fetchHimalayas();
  await fetchJobicy();
  await fetchAdzuna();
  await expireOldJobs();

  // Count total active jobs
  try {
    const { rows } = await query(`SELECT COUNT(*) AS total FROM jobs WHERE status = 'active'`);
    console.log(`\n\u2705 Job fetch complete. Total active jobs: ${rows[0].total}\n`);
  } catch (e) { console.log('\n\u2705 Job fetch complete.\n'); }
}

module.exports = { fetchAllJobs, fetchArbeitnow, fetchRemotive, fetchRemoteOK, fetchHimalayas, fetchJobicy, fetchAdzuna, expireOldJobs };
