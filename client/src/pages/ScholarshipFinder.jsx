import React, { useState } from 'react';
import { COUNTRIES } from '../data/countries';
import './ScholarshipFinder.css';

const API = process.env.REACT_APP_API_URL || '/api';

function getToken() {
  return localStorage.getItem('tragency_token');
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function getFlag(country) {
  if (!country) return '';
  const c = COUNTRIES.find(
    ct => ct.name.toLowerCase() === country.toLowerCase() || ct.code.toLowerCase() === country.toLowerCase()
  );
  return c ? c.flag : '';
}

function formatAmount(amount) {
  if (!amount) return 'Varies';
  if (typeof amount === 'number') return `$${amount.toLocaleString()}`;
  return amount;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function ScholarshipFinder() {
  const [filters, setFilters] = useState({
    country: '',
    degree: '',
    field: '',
    search: '',
  });
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiMatching, setAiMatching] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  function upd(field, value) {
    setFilters(f => ({ ...f, [field]: value }));
  }

  async function browse(pg = 1) {
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (filters.country) params.set('country', filters.country);
      if (filters.degree) params.set('degree', filters.degree);
      if (filters.field) params.set('field', filters.field);
      if (filters.search) params.set('search', filters.search);
      params.set('page', pg);
      params.set('limit', 12);

      const res = await fetch(`${API}/scholarships?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setScholarships(data.scholarships || data.results || []);
        setTotal(data.total || data.count || 0);
        setPage(pg);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function aiMatch() {
    setAiMatching(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (filters.country) params.set('country', filters.country);
      if (filters.degree) params.set('qualification', filters.degree);
      if (filters.field) params.set('field', filters.field);

      const res = await fetch(`${API}/scholarships/match?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setScholarships(data.scholarships || data.results || data.matches || []);
        setTotal(data.total || (data.scholarships || data.results || data.matches || []).length);
        setPage(1);
      }
    } catch (e) { console.error(e); }
    finally { setAiMatching(false); }
  }

  function handleSubmit(e) {
    e.preventDefault();
    browse(1);
  }

  const totalPages = Math.ceil(total / 12) || 1;

  return (
    <div className="sf-page">
      <div className="sf-container">

        {/* Header */}
        <div className="sf-header">
          <div className="sf-header-icon">🎓</div>
          <div>
            <h1 className="serif">Scholarship & Grant Finder</h1>
            <p className="sf-header-sub">Discover funding opportunities tailored to your profile</p>
          </div>
        </div>

        {/* Filter Bar */}
        <form className="sf-card sf-filters" onSubmit={handleSubmit}>
          <div className="sf-filter-grid">
            <div className="sf-field">
              <label>Country</label>
              <select value={filters.country} onChange={e => upd('country', e.target.value)}>
                <option value="">All Countries</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
              </select>
            </div>
            <div className="sf-field">
              <label>Degree Level</label>
              <select value={filters.degree} onChange={e => upd('degree', e.target.value)}>
                <option value="">Any</option>
                <option value="Bachelors">Bachelors</option>
                <option value="Masters">Masters</option>
                <option value="PhD">PhD</option>
              </select>
            </div>
            <div className="sf-field">
              <label>Field of Study</label>
              <input
                type="text"
                value={filters.field}
                onChange={e => upd('field', e.target.value)}
                placeholder="e.g., Computer Science"
              />
            </div>
            <div className="sf-field">
              <label>Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={e => upd('search', e.target.value)}
                placeholder="Keyword..."
              />
            </div>
          </div>
          <div className="sf-filter-actions">
            <button type="submit" className="sf-btn-browse" disabled={loading}>
              {loading ? 'Searching...' : '🔍 Search'}
            </button>
            <button type="button" className="sf-btn-ai" onClick={aiMatch} disabled={aiMatching}>
              {aiMatching ? (
                <><span className="sf-btn-spin" /> Matching...</>
              ) : (
                '✨ AI Match'
              )}
            </button>
          </div>
        </form>

        {/* Results Count */}
        {hasSearched && (
          <p className="sf-results-count">
            Found <strong>{total}</strong> scholarship{total !== 1 ? 's' : ''} matching your profile
          </p>
        )}

        {/* Loading */}
        {(loading || aiMatching) && (
          <div className="sf-loading">
            <div className="sf-spinner" />
            <p>{aiMatching ? 'AI is finding your best matches...' : 'Searching scholarships...'}</p>
          </div>
        )}

        {/* Scholarship Grid */}
        {!loading && !aiMatching && scholarships.length > 0 && (
          <div className="sf-grid">
            {scholarships.map((s, i) => {
              const isExpanded = expanded === i;
              const deadline = daysUntil(s.deadline);
              return (
                <div key={s._id || i} className={`sf-scholarship ${isExpanded ? 'sf-expanded' : ''}`}>
                  <div className="sf-sch-top">
                    <div className="sf-sch-header">
                      {s.fullRide && <span className="sf-badge-full">Full Ride</span>}
                      <h3 className="sf-sch-name">{s.name || s.title}</h3>
                      {s.university && <p className="sf-sch-uni">{s.university}</p>}
                    </div>
                    <div className="sf-sch-meta">
                      <span className="sf-sch-country">{getFlag(s.country)} {s.country}</span>
                      <span className="sf-sch-amount">{formatAmount(s.amount)}</span>
                    </div>
                    {s.coverage && <p className="sf-sch-coverage">{s.coverage}</p>}
                    {s.deadline && (
                      <div className={`sf-sch-deadline ${deadline !== null && deadline < 30 ? 'sf-deadline-soon' : ''}`}>
                        📅 Deadline: {new Date(s.deadline).toLocaleDateString()}
                        {deadline !== null && deadline > 0 && <span className="sf-days-left"> ({deadline} days left)</span>}
                        {deadline !== null && deadline <= 0 && <span className="sf-expired"> (Expired)</span>}
                      </div>
                    )}
                    <button className="sf-expand-btn" onClick={() => setExpanded(isExpanded ? null : i)}>
                      {isExpanded ? 'Show Less ▲' : 'Show More ▼'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="sf-sch-details">
                      {s.description && (
                        <div className="sf-detail-section">
                          <h4>Description</h4>
                          <p>{s.description}</p>
                        </div>
                      )}
                      {s.eligibility && (
                        <div className="sf-detail-section">
                          <h4>Eligibility</h4>
                          <p>{s.eligibility}</p>
                        </div>
                      )}
                      {s.applyLink && (
                        <a href={s.applyLink} target="_blank" rel="noopener noreferrer" className="sf-apply-link">
                          Apply Now →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !aiMatching && hasSearched && scholarships.length === 0 && (
          <div className="sf-empty">
            <div className="sf-empty-icon">🔎</div>
            <h3 className="serif">No scholarships found</h3>
            <p>Try adjusting your filters or use AI Match for personalized results.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && !aiMatching && (
          <div className="sf-pagination">
            <button className="sf-page-btn" disabled={page <= 1} onClick={() => browse(page - 1)}>← Prev</button>
            <span className="sf-page-info">Page {page} of {totalPages}</span>
            <button className="sf-page-btn" disabled={page >= totalPages} onClick={() => browse(page + 1)}>Next →</button>
          </div>
        )}

      </div>
    </div>
  );
}
