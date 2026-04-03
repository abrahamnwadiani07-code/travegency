import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PATHS } from '../data/paths';
import CountrySelect from '../components/CountrySelect';
import './Portal.css';

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function generateSessionId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getToken() {
  return localStorage.getItem('tragency_token');
}

const API = process.env.REACT_APP_API_URL || '/api';

/** Minimal markdown: **bold**, bullet lists, numbered lists, paragraphs */
function renderMarkdown(text) {
  if (!text) return null;
  // Strip any JSON blocks that leaked through
  const cleaned = text
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{["\s]*(?:ready|service|travelPath)["\s]*:[\s\S]*?\}\s*$/g, '')
    .replace(/\*\*Quick replies?:\*\*\s*.+/gi, '')
    .trim();
  if (!cleaned) return null;
  const lines = cleaned.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bullet list
    if (/^[\-\*]\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^[\-\*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[\-\*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={elements.length} className="chat-ul">
          {items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+[\.\)]\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+[\.\)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[\.\)]\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={elements.length} className="chat-ol">
          {items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
        </ol>
      );
      continue;
    }

    // Blank line = spacer
    if (line.trim() === '') {
      elements.push(<div key={elements.length} className="chat-spacer" />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(<p key={elements.length} className="chat-p">{renderInline(line)}</p>);
    i++;
  }

  return elements;
}

function renderInline(text) {
  // **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return p;
  });
}

/** Path-specific AI greeting */
function getGreeting(path) {
  const greetings = {
    education: `I'm your **Education Travel** specialist AI consultant. I'll help you plan your study abroad journey — from university selection to visa processing.\n\nLet's start! **Which country are you traveling from?**`,
    tourism: `Welcome! I'm your **Tourism** AI consultant. I'll help you plan an unforgettable trip with the perfect itinerary.\n\nTo get started, **which country are you based in?**`,
    medical: `I'm your **Medical Travel** specialist. I'll help coordinate your healthcare journey abroad — finding the right hospitals and handling all logistics.\n\n**Which country are you currently in?**`,
    business: `I'm your **Business Travel** AI consultant. I'll help streamline your corporate travel — from meetings logistics to visa permits.\n\nLet's begin. **What country are you traveling from?**`,
    relocation: `I'm your **Relocation** specialist AI. I'll guide you through the entire process of moving abroad — immigration, housing, and settlement.\n\n**Which country are you relocating from?**`,
    religious: `I'm your **Religious Travel** specialist. I'll help plan your spiritual journey — whether it's Hajj, Umrah, or other pilgrimages.\n\nLet me start by asking, **which country will you be traveling from?**`,
    family: `I'm your **Family Travel** AI consultant. I'll help plan a stress-free, kid-friendly trip for your whole family.\n\nLet's get started! **Which country is your family based in?**`,
  };
  return greetings[path.id] || `I'm your **${path.label} Travel** AI consultant. Let's plan your journey.\n\n**Which country are you traveling from?**`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Portal Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Portal() {
  const { pathId } = useParams();
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const path = PATHS[pathId];

  // ── State ──
  const [step, setStep] = useState(1); // 1=chat, 2=matching, 3=success
  const [sessionId] = useState(generateSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [travelData, setTravelData] = useState(null);
  const [ready, setReady] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Country selectors shown inline
  const [showFromCountry, setShowFromCountry] = useState(false);
  const [showToCountry, setShowToCountry] = useState(false);
  const [fromCountry, setFromCountry] = useState('');
  const [toCountry, setToCountry] = useState('');

  // Step 2: Matching
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [agentMatches, setAgentMatches] = useState([]);
  const [matchingFee, setMatchingFee] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectingAgent, setSelectingAgent] = useState(false);

  // Inline auth
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // login | register
  const [authForm, setAuthForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Initial greeting ──
  useEffect(() => {
    if (path) {
      setMessages([{ role: 'assistant', content: getGreeting(path) }]);
    }
  }, [pathId]); // eslint-disable-line

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // ── Path not found ──
  if (!path) {
    return (
      <div className="portal-page">
        <div className="portal-inner" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
          <h2 className="serif">Travel path not found</h2>
          <p style={{ marginTop: '1rem', color: 'var(--muted)' }}>
            The path "{pathId}" does not exist. Please select a valid travel path.
          </p>
          <Link to="/start" className="btn-hero-primary" style={{ display: 'inline-block', marginTop: '2rem' }}>
            Choose a Path &rarr;
          </Link>
        </div>
      </div>
    );
  }

  // ── Send chat message ──
  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setSending(true);

    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text,
          travelPath: pathId,
          fromCountry: fromCountry || undefined,
          toCountry: toCountry || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();

      if (data.conversationId) setConversationId(data.conversationId);

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);

      // Check context for country prompts
      if (data.context) {
        if (data.context.askFromCountry && !fromCountry) setShowFromCountry(true);
        if (data.context.askToCountry && !toCountry) setShowToCountry(true);
      }

      if (data.suggestions) setSuggestions(data.suggestions);
      if (data.ready) {
        setReady(true);
        if (data.travelData) setTravelData(data.travelData);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // ── Country selection handlers ──
  function handleFromCountry(country) {
    setFromCountry(country);
    setShowFromCountry(false);
    setMessages(prev => [...prev, { role: 'user', content: `I'm traveling from ${country}` }]);
    // Auto-send to AI
    sendCountryUpdate(country, toCountry);
  }

  function handleToCountry(country) {
    setToCountry(country);
    setShowToCountry(false);
    setMessages(prev => [...prev, { role: 'user', content: `My destination is ${country}` }]);
    sendCountryUpdate(fromCountry, country);
  }

  async function sendCountryUpdate(from, to) {
    setSending(true);
    try {
      const msg = from && to
        ? `I'm traveling from ${from} to ${to}`
        : from ? `I'm traveling from ${from}` : `My destination is ${to}`;
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: msg,
          travelPath: pathId,
          fromCountry: from || undefined,
          toCountry: to || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      if (data.context) {
        if (data.context.askFromCountry && !from) setShowFromCountry(true);
        if (data.context.askToCountry && !to) setShowToCountry(true);
      }
      if (data.suggestions) setSuggestions(data.suggestions);
      if (data.ready) {
        setReady(true);
        if (data.travelData) setTravelData(data.travelData);
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  // ── Find My Agent ──
  async function handleFindAgent() {
    if (!user) {
      setShowAuth(true);
      return;
    }
    await fetchMatches();
  }

  async function fetchMatches() {
    setStep(2);
    setMatchLoading(true);
    setMatchError('');
    try {
      const token = getToken();
      const res = await fetch(`${API}/ai/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId }),
      });
      if (!res.ok) throw new Error('Failed to find matching agents');
      const data = await res.json();
      setAgentMatches(data.matches || []);
      setMatchingFee(data.matchingFee || 0);
    } catch (err) {
      setMatchError(err.message);
    } finally {
      setMatchLoading(false);
    }
  }

  // ── Select agent ──
  async function handleSelectAgent(matchId) {
    setSelectingAgent(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/ai/match/${matchId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to select agent');
      const data = await res.json();
      setSelectedAgent(data.match || agentMatches.find(a => a.id === matchId || a._id === matchId));
      setStep(3);
    } catch (err) {
      setMatchError(err.message);
    } finally {
      setSelectingAgent(false);
    }
  }

  // ── Inline auth ──
  async function handleAuth(e) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      if (authTab === 'login') {
        await login(authForm.email, authForm.password);
      } else {
        await register({
          firstName: authForm.firstName,
          lastName: authForm.lastName,
          email: authForm.email,
          password: authForm.password,
          phone: authForm.phone,
        });
      }
      setShowAuth(false);
      // Now fetch matches
      await fetchMatches();
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  function updateAuth(field) {
    return (e) => setAuthForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  // ── Helpers ──
  function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function renderStars(rating) {
    const stars = [];
    const r = Math.round(rating || 0);
    for (let i = 1; i <= 5; i++) {
      stars.push(<span key={i} className={i <= r ? 'star-filled' : 'star-empty'}>{i <= r ? '\u2605' : '\u2606'}</span>);
    }
    return <span className="portal-stars">{stars}</span>;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const stepLabels = ['AI Consultation', 'Agent Matching', 'Booking'];

  return (
    <div className="portal-page">
      <div className="portal-inner">

        {/* ── Path Header ──────────────────────────────────────────────────── */}
        <div className="portal-header" style={{ '--path-color': path.color }}>
          <div className="ph-icon">{path.icon}</div>
          <div>
            <div className="ph-tag" style={{ color: path.color }}>{path.label} Travel</div>
            <h1 className="serif ph-title">Your {path.label} Journey</h1>
            <p className="ph-desc">{path.description}</p>
          </div>
        </div>

        {/* ── Step Indicator ───────────────────────────────────────────────── */}
        <div className="portal-steps">
          {stepLabels.map((s, i) => (
            <div key={i} className={`ps-step ${step > i + 1 ? 'ps-done' : ''} ${step === i + 1 ? 'ps-active' : ''}`}>
              <div className="ps-num">{step > i + 1 ? '\u2713' : i + 1}</div>
              <span className="ps-label">{s}</span>
              {i < stepLabels.length - 1 && <span className="ps-divider" />}
            </div>
          ))}
        </div>

        {/* ══ STEP 1: AI Chat ══════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="portal-chat anim-fadeUp">
            {/* Messages */}
            <div className="pc-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`pc-msg pc-msg--${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="pc-avatar" style={{ background: path.color }}>
                      <span>{path.icon}</span>
                    </div>
                  )}
                  <div className="pc-bubble">
                    {renderMarkdown(msg.content)}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <div className="pc-msg pc-msg--assistant">
                  <div className="pc-avatar" style={{ background: path.color }}>
                    <span>{path.icon}</span>
                  </div>
                  <div className="pc-bubble pc-typing">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              )}

              {/* Country selectors inline */}
              {showFromCountry && (
                <div className="pc-country-select anim-fadeUp">
                  <CountrySelect
                    value={fromCountry}
                    onChange={handleFromCountry}
                    label="Select your origin country"
                    placeholder="Where are you traveling from?"
                    filter="african"
                  />
                </div>
              )}

              {showToCountry && (
                <div className="pc-country-select anim-fadeUp">
                  <CountrySelect
                    value={toCountry}
                    onChange={handleToCountry}
                    label="Select your destination country"
                    placeholder="Where are you going?"
                    filter="destination"
                  />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Ready bar */}
            {ready && (
              <div className="pc-ready-bar">
                <span className="pc-ready-icon">✨</span>
                <p>I have all the information I need! Let's find your perfect agent.</p>
                <button className="pc-ready-btn" onClick={handleFindAgent}>
                  Find My Agent &rarr;
                </button>
              </div>
            )}

            {/* Input bar */}
            {/* Quick reply suggestions */}
            {suggestions.length > 0 && (
              <div style={{ display: 'flex', gap: 8, padding: '8px 20px', flexWrap: 'wrap', borderTop: '1px solid var(--offwhite2)' }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); setSuggestions([]); }}
                    style={{ padding: '6px 14px', background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.25)', borderRadius: 20, color: 'var(--gold)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                    onMouseOver={e => e.target.style.background = 'rgba(212,168,83,0.2)'}
                    onMouseOut={e => e.target.style.background = 'rgba(212,168,83,0.1)'}
                  >{s}</button>
                ))}
              </div>
            )}

            <form className="pc-input-bar" onSubmit={handleSend}>
              <textarea
                ref={inputRef}
                className="pc-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                disabled={sending}
              />
              <button type="submit" className="pc-send" disabled={!input.trim() || sending}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>

            {/* ── Inline Auth Modal ── */}
            {showAuth && (
              <div className="pc-auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}>
                <div className="pc-auth-card anim-fadeUp">
                  <button className="pc-auth-close" onClick={() => setShowAuth(false)}>&times;</button>
                  <h3 className="serif pc-auth-title">Sign in to continue</h3>
                  <p className="pc-auth-sub">Create an account or sign in to get matched with an agent.</p>

                  {/* Tabs */}
                  <div className="pc-auth-tabs">
                    <button
                      className={`pc-auth-tab ${authTab === 'login' ? 'active' : ''}`}
                      onClick={() => { setAuthTab('login'); setAuthError(''); }}
                    >
                      Sign In
                    </button>
                    <button
                      className={`pc-auth-tab ${authTab === 'register' ? 'active' : ''}`}
                      onClick={() => { setAuthTab('register'); setAuthError(''); }}
                    >
                      Create Account
                    </button>
                  </div>

                  {authError && <div className="pc-auth-error">{authError}</div>}

                  <form className="pc-auth-form" onSubmit={handleAuth}>
                    {authTab === 'register' && (
                      <div className="pc-auth-row">
                        <div className="fg">
                          <label>First name *</label>
                          <input value={authForm.firstName} onChange={updateAuth('firstName')} required />
                        </div>
                        <div className="fg">
                          <label>Last name *</label>
                          <input value={authForm.lastName} onChange={updateAuth('lastName')} required />
                        </div>
                      </div>
                    )}
                    <div className="fg">
                      <label>Email *</label>
                      <input type="email" value={authForm.email} onChange={updateAuth('email')} required />
                    </div>
                    <div className="fg">
                      <label>Password *</label>
                      <input type="password" value={authForm.password} onChange={updateAuth('password')} required minLength={8} />
                    </div>
                    {authTab === 'register' && (
                      <div className="fg">
                        <label>Phone</label>
                        <input value={authForm.phone} onChange={updateAuth('phone')} placeholder="+234..." />
                      </div>
                    )}
                    <button type="submit" className="pc-auth-submit" disabled={authLoading}>
                      {authLoading ? (
                        <><span className="pc-spinner" /> Processing...</>
                      ) : (
                        authTab === 'login' ? 'Sign In & Continue' : 'Create Account & Continue'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 2: Agent Matching ═══════════════════════════════════════ */}
        {step === 2 && (
          <div className="portal-matching anim-fadeUp">
            <h2 className="serif pm-title">Your Matched Agents</h2>
            <p className="pm-sub">
              Based on your consultation, we've found agents who specialize in {path.label.toLowerCase()} travel.
            </p>

            {matchingFee > 0 && (
              <div className="pm-fee">
                <span className="pm-fee-label">One-time matching fee</span>
                <span className="pm-fee-amount">{'\u20A6'}{Number(matchingFee).toLocaleString()}</span>
              </div>
            )}

            {matchLoading && (
              <div className="pm-loading">
                <div className="pm-loader" />
                <p>Finding the best agents for you...</p>
              </div>
            )}

            {matchError && (
              <div className="pm-error">
                <p>{matchError}</p>
                <button className="pc-ready-btn" onClick={fetchMatches}>Try Again</button>
              </div>
            )}

            {!matchLoading && !matchError && agentMatches.length === 0 && (
              <div className="pm-empty">
                <p>No agents found matching your criteria. Try adjusting your preferences.</p>
                <button className="btn-ghost" onClick={() => setStep(1)}>&larr; Back to Chat</button>
              </div>
            )}

            <div className="pm-grid">
              {agentMatches.map((agent) => (
                <div key={agent.id || agent._id} className="pm-card">
                  <div className="pm-card-top">
                    <div className="pm-avatar" style={{ background: path.color }}>
                      {getInitials(agent.display_name || agent.name)}
                    </div>
                    <div className="pm-card-info">
                      <h3 className="serif pm-agent-name">{agent.display_name || agent.name}</h3>
                      {agent.location && <p className="pm-agent-loc">{'\uD83D\uDCCD'} {agent.location}</p>}
                    </div>
                  </div>

                  <div className="pm-card-meta">
                    {agent.rating != null && (
                      <div className="pm-meta-item">
                        {renderStars(agent.rating)}
                        <span className="pm-rating-num">{Number(agent.rating).toFixed(1)}</span>
                      </div>
                    )}
                    {agent.experience && (
                      <div className="pm-meta-item">
                        <span className="pm-meta-label">Experience</span>
                        <span>{agent.experience}</span>
                      </div>
                    )}
                    {agent.rate != null && (
                      <div className="pm-meta-item">
                        <span className="pm-meta-label">Rate</span>
                        <span className="pm-rate">{'\u20A6'}{Number(agent.rate).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {agent.paths && agent.paths.length > 0 && (
                    <div className="pm-tags">
                      {agent.paths.map((p, i) => {
                        const pathData = PATHS[p];
                        return (
                          <span key={i} className="pm-tag" style={{ borderColor: pathData?.color || 'var(--offwhite3)', color: pathData?.color || 'var(--muted)' }}>
                            {pathData?.icon} {pathData?.label || p}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {agent.bio && <p className="pm-bio">{agent.bio}</p>}

                  <button
                    className="pm-select-btn"
                    onClick={() => handleSelectAgent(agent.id || agent._id)}
                    disabled={selectingAgent}
                  >
                    {selectingAgent ? 'Selecting...' : 'Select This Agent'}
                  </button>
                </div>
              ))}
            </div>

            <div className="portal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn-ghost" onClick={() => setStep(1)}>&larr; Back to Chat</button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Success ══════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="portal-success anim-fadeUp">
            <div className="ps-icon">{'\uD83C\uDF89'}</div>
            <h2 className="serif">Agent Selected!</h2>
            <p className="ps-sub-text">
              Your {path.label.toLowerCase()} travel agent has been notified and will reach out within <strong>24 hours</strong>.
            </p>

            {selectedAgent && (
              <div className="ps-agent-card">
                <div className="pm-avatar" style={{ background: path.color, margin: '0 auto 1rem' }}>
                  {getInitials(selectedAgent.display_name || selectedAgent.name)}
                </div>
                <h3 className="serif">{selectedAgent.display_name || selectedAgent.name}</h3>
                {selectedAgent.location && <p className="ps-agent-loc">{'\uD83D\uDCCD'} {selectedAgent.location}</p>}
                {selectedAgent.rating != null && (
                  <div className="ps-agent-rating">
                    {renderStars(selectedAgent.rating)}
                    <span>{Number(selectedAgent.rating).toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="ps-next-steps">
              <div className="ps-ns-item">
                <span className="ps-ns-icon">{'\uD83D\uDCE7'}</span>
                <div>
                  <strong>Check your email</strong>
                  <p>You'll receive a confirmation with your agent's details.</p>
                </div>
              </div>
              <div className="ps-ns-item">
                <span className="ps-ns-icon">{'\u23F0'}</span>
                <div>
                  <strong>Estimated response: 24 hours</strong>
                  <p>Your agent will contact you to begin planning.</p>
                </div>
              </div>
              <div className="ps-ns-item">
                <span className="ps-ns-icon">{'\uD83D\uDCCA'}</span>
                <div>
                  <strong>Track progress</strong>
                  <p>Monitor everything from your dashboard.</p>
                </div>
              </div>
            </div>

            <div className="portal-actions" style={{ justifyContent: 'center', marginTop: '2rem' }}>
              <button className="btn-hero-primary" onClick={() => navigate('/dashboard')}>
                Go to Dashboard &rarr;
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
