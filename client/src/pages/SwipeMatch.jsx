import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { PATHS } from '../data/paths';
import './SwipeMatch.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function getToken() {
  return localStorage.getItem('tragency_token');
}

function stars(r) {
  return '\u2605'.repeat(Math.floor(r || 0)) + '\u2606'.repeat(5 - Math.floor(r || 0));
}

function initials(name) {
  return (name || 'AG')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatNaira(n) {
  return '\u20A6' + Number(n || 0).toLocaleString();
}

const AVATAR_COLORS = ['#6366f1', '#06b6d4', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
function avatarColor(id) {
  let hash = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function SwipeMatch() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const conversationId = location.state?.conversationId || searchParams.get('conversationId') || searchParams.get('cid');

  /* ---------- State ---------- */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchingFee, setMatchingFee] = useState(0);
  const [travelPath, setTravelPath] = useState(null);
  const [fromCountry, setFromCountry] = useState('');
  const [toCountry, setToCountry] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null); // 'left' | 'right'
  const [animating, setAnimating] = useState(false);
  const [likedAgent, setLikedAgent] = useState(null); // full profile view
  const [selecting, setSelecting] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ---------- Auth check ---------- */
  const token = getToken();
  const isLoggedIn = !!token;

  /* ---------- Fetch matches ---------- */
  useEffect(() => {
    if (!isLoggedIn || !conversationId) {
      setLoading(false);
      return;
    }

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    fetch(`${API_BASE}/ai/match`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ conversationId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load matches');
        return r.json();
      })
      .then((data) => {
        setMatches(data.matches || []);
        setMatchingFee(data.matchingFee || 0);
        setTravelPath(data.travelPath || null);
        setFromCountry(data.fromCountry || '');
        setToCountry(data.toCountry || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isLoggedIn, conversationId, token]);

  /* ---------- Swipe handlers ---------- */
  const handleSwipe = useCallback(
    (dir) => {
      if (animating || !matches.length) return;
      setAnimating(true);
      setSwipeDir(dir);

      setTimeout(() => {
        if (dir === 'right') {
          // Liked this agent — show full profile
          setLikedAgent(matches[currentIdx]);
        } else {
          // Skip — advance to next
          setCurrentIdx((prev) => prev + 1);
        }
        setSwipeDir(null);
        setAnimating(false);
      }, 350);
    },
    [animating, matches, currentIdx]
  );

  /* ---------- Select agent ---------- */
  const handleSelect = async () => {
    if (!likedAgent || selecting) return;
    setSelecting(true);

    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/ai/match/${likedAgent.id}/select`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Selection failed');
      }
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSelecting(false);
    }
  };

  /* ---------- Go back from profile to cards ---------- */
  const handleBackToCards = () => {
    setLikedAgent(null);
    setCurrentIdx((prev) => prev + 1);
  };

  /* ---------- Keyboard shortcuts ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (likedAgent || success || animating) return;
      if (e.key === 'ArrowLeft') handleSwipe('left');
      if (e.key === 'ArrowRight') handleSwipe('right');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSwipe, likedAgent, success, animating]);

  /* ---------- Derived ---------- */
  const pathInfo = travelPath ? PATHS[travelPath] : null;
  const currentAgent = matches[currentIdx];
  const exhausted = currentIdx >= matches.length && matches.length > 0;

  /* =================================================================== */
  /*  RENDERS                                                             */
  /* =================================================================== */

  /* --- Not logged in --- */
  if (!isLoggedIn) {
    return (
      <div className="swipe-page">
        <div className="swipe-auth">
          <div className="swipe-auth-icon">🔒</div>
          <h2 className="serif">Sign in to continue</h2>
          <p>You need an account to view your matched agents.</p>
          <div className="swipe-auth-btns">
            <Link to="/login" className="sm-btn sm-btn-gold">Log In</Link>
            <Link to="/register" className="sm-btn sm-btn-outline">Create Account</Link>
          </div>
        </div>
      </div>
    );
  }

  /* --- No conversation id --- */
  if (!conversationId) {
    return (
      <div className="swipe-page">
        <div className="swipe-auth">
          <div className="swipe-auth-icon">💬</div>
          <h2 className="serif">No conversation found</h2>
          <p>Start a conversation first so we can match you with the right agents.</p>
          <Link to="/start" className="sm-btn sm-btn-gold">Start a Conversation</Link>
        </div>
      </div>
    );
  }

  /* --- Loading --- */
  if (loading) {
    return (
      <div className="swipe-page">
        <div className="swipe-loading">
          <div className="sm-spinner" />
          <p>Finding your perfect agents...</p>
        </div>
      </div>
    );
  }

  /* --- Error --- */
  if (error && !success) {
    return (
      <div className="swipe-page">
        <div className="swipe-auth">
          <div className="swipe-auth-icon">⚠️</div>
          <h2 className="serif">Something went wrong</h2>
          <p>{error}</p>
          <button className="sm-btn sm-btn-gold" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* --- No matches --- */
  if (matches.length === 0) {
    return (
      <div className="swipe-page">
        <div className="swipe-auth">
          <div className="swipe-auth-icon">🔍</div>
          <h2 className="serif">No agents available</h2>
          <p>No agents available for this route. Try a different path.</p>
          <Link to="/start" className="sm-btn sm-btn-gold">Try Another Path</Link>
        </div>
      </div>
    );
  }

  /* --- Success state --- */
  if (success) {
    return (
      <div className="swipe-page">
        <div className="swipe-success">
          <div className="ss-confetti">
            <span className="ss-dot ss-dot-1" />
            <span className="ss-dot ss-dot-2" />
            <span className="ss-dot ss-dot-3" />
            <span className="ss-dot ss-dot-4" />
            <span className="ss-dot ss-dot-5" />
            <span className="ss-dot ss-dot-6" />
            <span className="ss-dot ss-dot-7" />
            <span className="ss-dot ss-dot-8" />
          </div>
          <div className="ss-check">✓</div>
          <h2 className="serif">Agent Selected!</h2>
          <p className="ss-agent">You selected <strong>{likedAgent?.display_name}</strong></p>
          <p className="ss-note">Agent notified! They have 24 hours to accept.</p>
          <p className="ss-sub">You'll receive a notification once they respond. In the meantime, sit tight.</p>
          <Link to="/dashboard" className="sm-btn sm-btn-gold">Go to Dashboard →</Link>
        </div>
      </div>
    );
  }

  /* --- Agent full profile (liked) --- */
  if (likedAgent) {
    const a = likedAgent;
    const agentColor = avatarColor(a.agent_id || a.id);
    return (
      <div className="swipe-page">
        <div className="swipe-header">
          <div className="swipe-header-inner">
            <button className="sm-back-btn" onClick={handleBackToCards}>← Back to cards</button>
          </div>
        </div>

        <div className="swipe-profile">
          <div className="sp-card">
            <div className="sp-top" style={{ background: agentColor }}>
              <div className="sp-avatar" style={{ background: 'rgba(255,255,255,0.18)' }}>
                {initials(a.display_name)}
              </div>
              <h2 className="serif sp-name">{a.display_name}</h2>
              <div className="sp-loc">📍 {a.location}</div>
              <div className="sp-rating">
                <span className="sp-stars">{stars(a.rating)}</span>
                <span className="sp-rating-val">{a.rating || '—'}</span>
                <span className="sp-reviews">({a.total_reviews || 0} reviews)</span>
              </div>
            </div>

            <div className="sp-body">
              <div className="sp-stats">
                <div className="sp-stat">
                  <span className="sp-stat-val">{a.experience_yrs || 0}</span>
                  <span className="sp-stat-lbl">Years Exp.</span>
                </div>
                <div className="sp-stat">
                  <span className="sp-stat-val">{formatNaira(a.rate_per_trip)}</span>
                  <span className="sp-stat-lbl">Per Trip</span>
                </div>
                <div className="sp-stat">
                  <span className="sp-stat-val">{a.total_bookings || 0}</span>
                  <span className="sp-stat-lbl">Bookings</span>
                </div>
                <div className="sp-stat">
                  <span className="sp-stat-val">{a.total_reviews || 0}</span>
                  <span className="sp-stat-lbl">Reviews</span>
                </div>
              </div>

              {a.bio && (
                <div className="sp-section">
                  <h4>About</h4>
                  <p>{a.bio}</p>
                </div>
              )}

              {a.paths && a.paths.length > 0 && (
                <div className="sp-section">
                  <h4>Travel Paths</h4>
                  <div className="sp-paths">
                    {a.paths.map((p) => {
                      const pi = PATHS[p];
                      return pi ? (
                        <span key={p} className="sp-path-tag" style={{ color: pi.color, borderColor: pi.color + '40', background: pi.color + '12' }}>
                          {pi.icon} {pi.label}
                        </span>
                      ) : (
                        <span key={p} className="sp-path-tag">{p}</span>
                      );
                    })}
                  </div>
                </div>
              )}

              {a.score != null && (
                <div className="sp-section">
                  <h4>Match Score</h4>
                  <div className="sp-score-bar">
                    <div className="sp-score-fill" style={{ width: `${Math.min(a.score, 100)}%` }} />
                  </div>
                  <span className="sp-score-val">{a.score}% match</span>
                </div>
              )}

              <div className="sp-fee">
                Matching fee: {formatNaira(matchingFee)} (one-time)
              </div>

              <button
                className="sm-btn sm-btn-gold sm-btn-lg sp-select-btn"
                onClick={handleSelect}
                disabled={selecting}
              >
                {selecting ? 'Processing...' : `Select & Pay ${formatNaira(a.matching_fee || matchingFee)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --- Card Stack (main swipe UI) --- */
  if (exhausted) {
    return (
      <div className="swipe-page">
        <div className="swipe-auth">
          <div className="swipe-auth-icon">🤷</div>
          <h2 className="serif">You've seen all agents</h2>
          <p>You've gone through all matched agents. Start over or try a different path.</p>
          <div className="swipe-auth-btns">
            <button className="sm-btn sm-btn-gold" onClick={() => setCurrentIdx(0)}>Start Over</button>
            <Link to="/start" className="sm-btn sm-btn-outline">New Search</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="swipe-page">
      {/* Header */}
      <div className="swipe-header">
        <div className="swipe-header-inner">
          <div className="sh-top-row">
            <h1 className="serif sh-title">Find Your Perfect Agent</h1>
          </div>
          <div className="sh-route">
            {pathInfo && <span className="sh-path-icon">{pathInfo.icon}</span>}
            <span className="sh-path-label">{pathInfo?.label || 'Travel'}</span>
            {fromCountry && toCountry && (
              <span className="sh-route-text">
                {fromCountry} → {toCountry}
              </span>
            )}
          </div>
          <div className="sh-fee">
            Matching fee: <strong>{formatNaira(matchingFee)}</strong> (one-time)
          </div>
        </div>
      </div>

      {/* Counter */}
      <div className="swipe-counter">
        Agent {currentIdx + 1} of {matches.length}
      </div>

      {/* Card Stack */}
      <div className="swipe-stack">
        {/* Background cards for depth */}
        {matches[currentIdx + 2] && (
          <div className="swipe-card swipe-card-bg2">
            <div className="sc-placeholder" />
          </div>
        )}
        {matches[currentIdx + 1] && (
          <div className="swipe-card swipe-card-bg1">
            <div className="sc-placeholder" />
          </div>
        )}

        {/* Active card */}
        {currentAgent && (
          <div
            className={`swipe-card swipe-card-active ${swipeDir === 'left' ? 'sc-exit-left' : ''} ${swipeDir === 'right' ? 'sc-exit-right' : ''}`}
            key={currentAgent.id}
          >
            <div className="sc-top" style={{ background: avatarColor(currentAgent.agent_id || currentAgent.id) }}>
              <div className="sc-avatar">
                {initials(currentAgent.display_name)}
              </div>
              <div className="sc-name">{currentAgent.display_name}</div>
              <div className="sc-loc">📍 {currentAgent.location}</div>
            </div>

            <div className="sc-body">
              <div className="sc-rating">
                <span className="sc-stars">{stars(currentAgent.rating)}</span>
                <span className="sc-rating-num">{currentAgent.rating || '—'}</span>
                <span className="sc-review-count">({currentAgent.total_reviews || 0})</span>
              </div>

              <div className="sc-stats">
                <div className="sc-stat">
                  <span className="sc-stat-val">{currentAgent.experience_yrs || 0}</span>
                  <span className="sc-stat-lbl">Years</span>
                </div>
                <div className="sc-stat">
                  <span className="sc-stat-val">{formatNaira(currentAgent.rate_per_trip)}</span>
                  <span className="sc-stat-lbl">Per Trip</span>
                </div>
                <div className="sc-stat">
                  <span className="sc-stat-val">{currentAgent.total_bookings || 0}</span>
                  <span className="sc-stat-lbl">Bookings</span>
                </div>
              </div>

              {currentAgent.bio && (
                <p className="sc-bio">{currentAgent.bio}</p>
              )}

              {currentAgent.paths && currentAgent.paths.length > 0 && (
                <div className="sc-paths">
                  {currentAgent.paths.map((p) => {
                    const pi = PATHS[p];
                    return pi ? (
                      <span key={p} className="sc-path-tag" style={{ color: pi.color, borderColor: pi.color + '40', background: pi.color + '12' }}>
                        {pi.icon} {pi.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="swipe-actions">
        <button
          className="sa-btn sa-skip"
          onClick={() => handleSwipe('left')}
          disabled={animating}
          title="Skip"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <button
          className="sa-btn sa-like"
          onClick={() => handleSwipe('right')}
          disabled={animating}
          title="Like"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      <div className="swipe-hint">
        Use ← → arrow keys or tap the buttons
      </div>
    </div>
  );
}
