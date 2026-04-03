/**
 * Tragency — Daily Job Fetcher
 * Run: npm run fetch-jobs
 * Or set up a cron job: 0 6 * * * node /path/to/server/fetch-jobs.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { fetchAllJobs } = require('./services/job-fetcher');
const { pool } = require('./db');

(async () => {
  try {
    await fetchAllJobs();
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
