import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CountrySelect from '../components/CountrySelect';
import { jobs as jobsApi, companies as companiesApi } from '../services/api';
import './Jobs.css';

const FLAGS = {
  'United Kingdom': '\u{1F1EC}\u{1F1E7}', 'UK': '\u{1F1EC}\u{1F1E7}',
  'United States': '\u{1F1FA}\u{1F1F8}', 'USA': '\u{1F1FA}\u{1F1F8}',
  'Canada': '\u{1F1E8}\u{1F1E6}',
  'Germany': '\u{1F1E9}\u{1F1EA}',
  'Australia': '\u{1F1E6}\u{1F1FA}',
  'UAE': '\u{1F1E6}\u{1F1EA}', 'United Arab Emirates': '\u{1F1E6}\u{1F1EA}',
};

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Consulting', 'Energy',
  'Automotive', 'Retail', 'Telecom', 'Mining', 'Aerospace',
];

const EXPERIENCE_OPTIONS = [
  { label: 'Any Experience', value: '' },
  { label: '0-2 years', value: '0-2' },
  { label: '3-5 years', value: '3-5' },
  { label: '5-10 years', value: '5-10' },
  { label: '10+ years', value: '10+' },
];

const LOGO_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

function getLogoColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}

function flag(country) {
  return FLAGS[country] || '\u{1F30D}';
}

function formatSalary(min, max, currency) {
  const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '\u00A3' : currency === 'EUR' ? '\u20AC'
    : currency === 'CAD' ? 'C$' : currency === 'AUD' ? 'A$' : currency === 'AED' ? 'AED ' : (currency || '') + ' ';
  const fmt = (n) => {
    if (!n) return null;
    return n >= 1000 ? `${sym}${Math.round(n / 1000)}k` : `${sym}${n}`;
  };
  const lo = fmt(min);
  const hi = fmt(max);
  if (lo && hi) return `${lo} \u2013 ${hi}`;
  if (lo) return `${lo}+`;
  if (hi) return `Up to ${hi}`;
  return null;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export default function JobsPage() {
  const [jobsList, setJobsList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [compLoading, setCompLoading] = useState(true);

  // filters
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [search, setSearch] = useState('');
  const [experience, setExperience] = useState('');
  const [visaOnly, setVisaOnly] = useState(true);

  // detail modal
  const [selectedJob, setSelectedJob] = useState(null);

  // company filter
  const [companyFilter, setCompanyFilter] = useState('');

  // apply state
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState({});

  const isLoggedIn = !!localStorage.getItem('tragency_token');

  /* ── fetch jobs ────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (country) params.country = country;
    if (industry) params.industry = industry;
    if (search) params.search = search;
    if (experience) params.experience = experience;
    if (visaOnly) params.visa_sponsored = 'true';
    if (companyFilter) params.company = companyFilter;

    jobsApi.list(params)
      .then((res) => {
        setJobsList(res.jobs || []);
        setTotal(res.total || (res.jobs || []).length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [country, industry, search, experience, visaOnly, companyFilter]);

  /* ── fetch companies ──────────────────────────────────────── */
  useEffect(() => {
    setCompLoading(true);
    const params = { limit: 20 };
    if (country) params.country = country;
    if (industry) params.industry = industry;

    companiesApi.list(params)
      .then((res) => setCompaniesList(res.companies || []))
      .catch(console.error)
      .finally(() => setCompLoading(false));
  }, [country, industry]);

  /* ── debounced search ─────────────────────────────────────── */
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ── apply ────────────────────────────────────────────────── */
  const handleApply = async (jobId) => {
    if (applying) return;
    setApplying(true);
    try {
      await jobsApi.apply(jobId, {});
      setApplied((prev) => ({ ...prev, [jobId]: true }));
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="jobs-page">

      {/* ════ Hero ════ */}
      <section className="jobs-hero">
        <div className="jobs-hero-inner">
          <div className="jobs-hero-badge">
            <span className="jhb-dot" />
            Visa Sponsorship Jobs
          </div>
          <h1 className="serif jobs-hero-title">
            Jobs with <span className="jobs-hero-hl">Visa Sponsorship</span>
          </h1>
          <p className="jobs-hero-sub">
            Discover companies around the world that sponsor work visas. Find your next
            career move abroad with verified sponsorship opportunities.
          </p>
          <div className="jobs-hero-stats">
            <div className="jhs-item">
              <strong>84+</strong>
              <span>Companies</span>
            </div>
            <div className="jhs-divider" />
            <div className="jhs-item">
              <strong>6</strong>
              <span>Countries</span>
            </div>
            <div className="jhs-divider" />
            <div className="jhs-item">
              <strong>45+</strong>
              <span>Active Jobs</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════ Filters ════ */}
      <section className="jobs-filters">
        <div className="jobs-filters-inner">
          <div className="jf-row">
            <div className="jf-field jf-country">
              <CountrySelect
                value={country}
                onChange={(v) => { setCountry(v); setCompanyFilter(''); }}
                label="Country"
                placeholder="All countries"
              />
            </div>

            <div className="jf-field">
              <label className="jf-label">Industry</label>
              <select
                className="jf-select"
                value={industry}
                onChange={(e) => { setIndustry(e.target.value); setCompanyFilter(''); }}
              >
                <option value="">All industries</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div className="jf-field jf-search">
              <label className="jf-label">Search</label>
              <div className="jf-search-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Job title, company name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>

            <div className="jf-field">
              <label className="jf-label">Experience</label>
              <select
                className="jf-select"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                {EXPERIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="jf-field jf-toggle-wrap">
              <label className="jf-toggle">
                <input
                  type="checkbox"
                  checked={visaOnly}
                  onChange={(e) => setVisaOnly(e.target.checked)}
                />
                <span className="jf-toggle-track">
                  <span className="jf-toggle-thumb" />
                </span>
                <span className="jf-toggle-text">Visa Sponsored Only</span>
              </label>
            </div>
          </div>

          {companyFilter && (
            <div className="jf-active-filter">
              Filtered by company: <strong>{companyFilter}</strong>
              <button onClick={() => setCompanyFilter('')} className="jf-clear">&times;</button>
            </div>
          )}
        </div>
      </section>

      {/* ════ Results ════ */}
      <section className="jobs-results">
        <div className="jobs-results-inner">
          <div className="jobs-results-header">
            <h2 className="jobs-count">
              {loading ? 'Loading...' : `${total} job${total !== 1 ? 's' : ''} found`}
            </h2>
          </div>

          {loading ? (
            <div className="jobs-loading">
              <div className="jobs-spinner" />
            </div>
          ) : jobsList.length === 0 ? (
            <div className="jobs-empty">
              <div className="jobs-empty-icon">&#128270;</div>
              <h3>No jobs found</h3>
              <p>Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="jobs-grid">
              {jobsList.map((job) => (
                <div
                  key={job.id}
                  className={`job-card ${selectedJob?.id === job.id ? 'job-card--active' : ''}`}
                  onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                >
                  <div className="jc-header">
                    <div className="jc-logo" style={{ background: getLogoColor(job.company_name) }}>
                      {(job.company_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="jc-company-info">
                      <span className="jc-company">{job.company_name}</span>
                      <span className="jc-posted">{timeAgo(job.created_at)}</span>
                    </div>
                  </div>

                  <h3 className="serif jc-title">{job.title}</h3>

                  <div className="jc-meta">
                    <span className="jc-location">
                      {flag(job.country)} {job.city}{job.country ? `, ${job.country}` : ''}
                    </span>
                    {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
                      <span className="jc-salary">
                        {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                      </span>
                    )}
                  </div>

                  <div className="jc-badges">
                    {job.visa_type && (
                      <span className="jc-badge jc-badge--visa">{job.visa_type}</span>
                    )}
                    {job.employment_type && (
                      <span className="jc-badge jc-badge--type">{job.employment_type}</span>
                    )}
                    {job.experience_min != null && (
                      <span className="jc-badge jc-badge--exp">
                        {job.experience_min}+ yrs exp
                      </span>
                    )}
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="jc-skills">
                      {job.skills.slice(0, 5).map((s) => (
                        <span key={s} className="jc-skill">{s}</span>
                      ))}
                      {job.skills.length > 5 && (
                        <span className="jc-skill jc-skill--more">+{job.skills.length - 5}</span>
                      )}
                    </div>
                  )}

                  <div className="jc-footer">
                    <span className="jc-details-link">View Details &rarr;</span>
                  </div>

                  {/* ── Expanded Detail ── */}
                  {selectedJob?.id === job.id && (
                    <div className="jc-detail" onClick={(e) => e.stopPropagation()}>
                      <div className="jcd-section">
                        <h4>Job Description</h4>
                        <p>{job.description || 'No description provided.'}</p>
                      </div>

                      {job.qualification && (
                        <div className="jcd-section">
                          <h4>Requirements</h4>
                          <p>{job.qualification}</p>
                        </div>
                      )}

                      <div className="jcd-section">
                        <h4>Company</h4>
                        <p>
                          <strong>{job.company_name}</strong>
                          {job.country && <> &mdash; {flag(job.country)} {job.country}</>}
                        </p>
                      </div>

                      {job.skills && job.skills.length > 0 && (
                        <div className="jcd-section">
                          <h4>Skills</h4>
                          <div className="jc-skills jc-skills--detail">
                            {job.skills.map((s) => <span key={s} className="jc-skill">{s}</span>)}
                          </div>
                        </div>
                      )}

                      <div className="jcd-actions">
                        {isLoggedIn ? (
                          <button
                            className="jcd-apply-btn"
                            disabled={applying || applied[job.id]}
                            onClick={() => handleApply(job.id)}
                          >
                            {applied[job.id] ? 'Applied \u2713' : applying ? 'Applying...' : 'Apply Now'}
                          </button>
                        ) : (
                          <Link to="/login" className="jcd-apply-btn jcd-apply-btn--signin">
                            Sign in to Apply
                          </Link>
                        )}
                        {job.apply_url && (
                          <a
                            href={job.apply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="jcd-ext-link"
                          >
                            Apply on Company Site &rarr;
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════ Companies Section ════ */}
      <section className="jobs-companies">
        <div className="jobs-companies-inner">
          <h2 className="serif jobs-section-title">Companies That Sponsor Visas</h2>
          <p className="jobs-section-sub">
            Explore employers actively sponsoring work visas for international talent.
          </p>

          {compLoading ? (
            <div className="jobs-loading">
              <div className="jobs-spinner" />
            </div>
          ) : companiesList.length === 0 ? (
            <div className="jobs-empty">
              <p>No companies found for the selected filters.</p>
            </div>
          ) : (
            <div className="companies-grid">
              {companiesList.map((co) => (
                <div
                  key={co.id}
                  className={`company-card ${companyFilter === co.name ? 'company-card--active' : ''}`}
                  onClick={() => setCompanyFilter(companyFilter === co.name ? '' : co.name)}
                >
                  <div className="cc-logo" style={{ background: getLogoColor(co.name) }}>
                    {(co.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="cc-info">
                    <h4 className="cc-name">{co.name}</h4>
                    <span className="cc-country">{flag(co.country)} {co.country}</span>
                    {co.industry && <span className="cc-industry">{co.industry}</span>}
                  </div>
                  <div className="cc-right">
                    {co.active_jobs != null && (
                      <span className="cc-jobs-count">
                        {co.active_jobs} job{co.active_jobs !== 1 ? 's' : ''}
                      </span>
                    )}
                    {co.visa_types && co.visa_types.length > 0 && (
                      <div className="cc-visa-types">
                        {co.visa_types.slice(0, 2).map((v) => (
                          <span key={v} className="cc-visa-tag">{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
