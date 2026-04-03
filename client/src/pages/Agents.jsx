import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { agents as agentsApi } from '../services/api';
import { PATHS } from '../data/paths';
import './Agents.css';

const PATH_LIST = Object.values(PATHS);

function stars(r) {
  return '★'.repeat(Math.floor(r || 0)) + '☆'.repeat(5 - Math.floor(r || 0));
}

export default function AgentsPage() {
  const [agentList, setAgentList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    agentsApi.list({ status: 'active' })
      .then(({ agents }) => setAgentList(agents || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = agentList.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.display_name?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q);
    const matchFilter = !filter || (a.paths || []).includes(filter);
    return matchSearch && matchFilter;
  });

  return (
    <div className="agents-page">

      {/* Header */}
      <div className="agents-hero">
        <div className="agents-hero-inner">
          <div className="ah-tag">
            <span className="hero-tag-dot" />
            All verified by Tragency
          </div>
          <h1 className="serif">Our Travel Agents</h1>
          <p>Every agent on Tragency is background-checked, licensed, and reviewed by our team before going live.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="agents-controls">
        <div className="agents-controls-inner">
          <div className="agents-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name or location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="path-filters">
            <button
              className={`pf-btn ${!filter ? 'pf-active' : ''}`}
              onClick={() => setFilter('')}
            >All paths</button>
            {PATH_LIST.map(p => (
              <button
                key={p.id}
                className={`pf-btn ${filter === p.id ? 'pf-active' : ''}`}
                onClick={() => setFilter(p.id)}
                style={{ '--pf-color': p.color }}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="agents-grid-wrap">
        <div className="agents-grid-inner">
          {loading && (
            <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}>
              <div className="ag-spinner" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="agents-empty">
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>🔍</div>
              <p>No agents found matching your search.</p>
              <button onClick={() => { setSearch(''); setFilter(''); }} style={{ marginTop:'1rem',background:'none',border:'1px solid var(--offwhite3)',borderRadius:8,padding:'8px 18px',cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:13 }}>
                Clear filters
              </button>
            </div>
          )}

          <div className="agents-grid">
            {filtered.map((a, i) => {
              const primaryPath = a.primary_path || a.paths?.[0];
              const pathInfo    = primaryPath ? PATHS[primaryPath] : null;
              return (
                <div
                  key={a.id}
                  className="agent-card anim-fadeUp"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Card top */}
                  <div className="ac-top" style={{ background: pathInfo?.color || 'var(--ink2)' }}>
                    <div className="ac-avatar">
                      {a.display_name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="ac-name">{a.display_name}</div>
                    <div className="ac-loc">📍 {a.location}</div>
                    <div className="ac-verified">✓ Verified Agent</div>
                  </div>

                  {/* Card body */}
                  <div className="ac-body">
                    {pathInfo && (
                      <div className="ac-paths">
                        <span className="ac-path-tag" style={{ color: pathInfo.color, borderColor: pathInfo.color + '40', background: pathInfo.color + '12' }}>
                          {pathInfo.icon} {pathInfo.label}
                        </span>
                        {(a.paths || []).filter(p => p !== primaryPath).map(p => {
                          const pi = PATHS[p];
                          return pi ? (
                            <span key={p} className="ac-path-tag" style={{ color:'var(--muted)',borderColor:'var(--offwhite3)' }}>
                              {pi.icon} {pi.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}

                    <div className="ac-stats">
                      <div className="acs"><span className="acs-val">{a.experience_yrs || 0}</span><span className="acs-lbl">Yrs exp</span></div>
                      <div className="acs"><span className="acs-val">${Number(a.rate_per_trip || 0).toLocaleString()}</span><span className="acs-lbl">Per trip</span></div>
                      <div className="acs"><span className="acs-val">{a.total_bookings || 0}</span><span className="acs-lbl">Trips</span></div>
                    </div>

                    <div className="ac-rating">
                      <span className="ac-stars">{stars(a.rating)}</span>
                      <span className="ac-rating-val">{a.rating || '—'}</span>
                      <span className="ac-reviews">({a.total_reviews || 0} reviews)</span>
                    </div>

                    {a.bio && <p className="ac-bio">{a.bio}</p>}

                    <Link to="/start" className="ac-book-btn">
                      Book This Agent →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && filtered.length > 0 && (
            <div className="agents-count">
              Showing {filtered.length} verified agent{filtered.length !== 1 ? 's' : ''}
              {filter ? ` for ${PATHS[filter]?.label}` : ''}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="agents-cta">
        <div className="agents-cta-inner">
          <h2 className="serif">Not sure which agent to pick?</h2>
          <p>Answer 2 quick questions and we'll match you with the perfect specialist.</p>
          <Link to="/start" className="btn-hero-primary" style={{ display:'inline-block' }}>Find My Agent →</Link>
        </div>
      </div>
    </div>
  );
}
