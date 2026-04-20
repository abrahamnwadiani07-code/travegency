import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './JobsPortal.css';

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
    .replace(/\{["\s]*(?:ready|service|travelPath|profession)["\s]*:[\s\S]*?\}\s*$/g, '')
    .replace(/\*\*Quick replies?:\*\*\s*.+/gi, '')
    .trim();
  if (!cleaned) return null;
  const lines = cleaned.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bullet list
    if (/^[-*]\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
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
    if (/^\d+[.)]\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
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
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return p;
  });
}

/* ── Plans ─────────────────────────────────────────────────────────────────── */

const PLANS = [
  {
    id: 'board',
    apiPlan: 'premium',
    icon: '\uD83D\uDCCB',
    title: 'Job Board',
    price: 15000,
    period: '/mo',
    recommended: false,
    features: [
      'Browse visa-sponsored jobs',
      'Filter by country & profession',
      'Save & bookmark listings',
      'Email alerts for new matches',
      'Access employer profiles',
    ],
    cta: 'Subscribe',
    redirect: '/jobs',
  },
  {
    id: 'autoapply',
    apiPlan: 'gold',
    icon: '\uD83E\uDD16',
    title: 'Auto-Apply',
    price: 45000,
    period: '/mo',
    recommended: true,
    features: [
      'Everything in Job Board',
      'AI auto-applies on your behalf',
      'Resume optimization per job',
      'Application tracking dashboard',
      'Priority support',
      'Weekly progress reports',
    ],
    cta: 'Subscribe',
    redirect: '/dashboard',
  },
  {
    id: 'agent',
    apiPlan: null,
    icon: '\uD83E\uDD1D',
    title: 'Agent Placement',
    price: 25000,
    period: '',
    recommended: false,
    features: [
      'Dedicated placement agent',
      'Interview preparation',
      'Visa application support',
      'Salary negotiation help',
      'End-to-end relocation guidance',
      'Money-back guarantee',
    ],
    cta: 'Get Matched',
    redirect: '/dashboard',
  },
];

const JOB_GREETING = `I'm your **Job & Visa Sponsorship** AI consultant. I'll help you find international jobs with visa sponsorship tailored to your profile.\n\nLet's get started! **What is your profession or field of work?**`;

/* ═══════════════════════════════════════════════════════════════════════════
   JobsPortal Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function JobsPortal() {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();

  // ── State ──
  const [step, setStep] = useState(1); // 1=chat, 2=plans, 3=payment/auth, 4=success
  const [sessionId] = useState(generateSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [jobContext, setJobContext] = useState(null); // AI-extracted profile data
  const [ready, setReady] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');

  // Inline auth
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [authForm, setAuthForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Auto-apply setup (step 4 for auto-apply plan)
  const [profileForm, setProfileForm] = useState({
    profession: '',
    experience: '',
    qualification: '',
    targetCountry: '',
    skills: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [autoApplyResult, setAutoApplyResult] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Initial greeting ──
  useEffect(() => {
    setMessages([{ role: 'assistant', content: JOB_GREETING }]);
  }, []);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // ── Pre-fill profile form from AI context ──
  useEffect(() => {
    if (jobContext) {
      setProfileForm(prev => ({
        profession: jobContext.profession || prev.profession,
        experience: jobContext.experience || prev.experience,
        qualification: jobContext.qualification || prev.qualification,
        targetCountry: jobContext.targetCountry || prev.targetCountry,
        skills: jobContext.skills || prev.skills,
      }));
    }
  }, [jobContext]);

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
          service: 'jobs',
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();

      if (data.conversationId) setConversationId(data.conversationId);

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);

      if (data.context) {
        setJobContext(data.context);
      }
      if (data.travelData) {
        setJobContext(prev => ({ ...prev, ...data.travelData }));
      }

      if (data.suggestions) setSuggestions(data.suggestions);
      if (data.ready) {
        setReady(true);
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

  // ── Choose plan ──
  function handleChoosePlan(plan) {
    setSelectedPlan(plan);
    setSubscribeError('');

    if (!user) {
      setShowAuth(true);
      return;
    }

    processSubscription(plan);
  }

  // ── Process subscription ──
  async function processSubscription(plan) {
    if (!plan.apiPlan) {
      // Agent placement — go straight to success
      setStep(4);
      setSuccessMessage('agent');
      return;
    }

    setStep(3);
    setSubscribing(true);
    setSubscribeError('');

    try {
      const token = getToken();
      const res = await fetch(`${API}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: plan.apiPlan }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Subscription failed');
      }

      await res.json();
      setStep(4);
      setSuccessMessage(plan.id);
    } catch (err) {
      setSubscribeError(err.message || 'Something went wrong');
    } finally {
      setSubscribing(false);
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
      // Now process subscription
      if (selectedPlan) {
        processSubscription(selectedPlan);
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  function updateAuth(field) {
    return (e) => setAuthForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  function updateProfile(field) {
    return (e) => setProfileForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  // ── Save auto-apply profile & run ──
  async function handleAutoApplySetup(e) {
    e.preventDefault();
    setProfileSaving(true);

    try {
      const token = getToken();

      // Save profile
      const profileRes = await fetch(`${API}/autoapply/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });

      if (!profileRes.ok) throw new Error('Failed to save profile');

      // Run auto-apply
      const runRes = await fetch(`${API}/autoapply/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!runRes.ok) throw new Error('Failed to run auto-apply');
      const runData = await runRes.json();
      setAutoApplyResult(runData);
    } catch (err) {
      setSubscribeError(err.message || 'Auto-apply setup failed');
    } finally {
      setProfileSaving(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const stepLabels = ['AI Consultation', 'Choose Plan', 'Payment', 'Access'];

  return (
    <div className="jp-page">
      <div className="jp-inner">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="jp-header">
          <div className="jp-header-icon">{'\uD83D\uDCBC'}</div>
          <div>
            <div className="jp-tag">Jobs Service</div>
            <h1 className="serif jp-title">{'\uD83D\uDCBC'} Jobs & Visa Sponsorship</h1>
            <p className="jp-desc">Find jobs abroad with visa sponsorship &mdash; powered by AI</p>
          </div>
        </div>

        {/* ── Step Indicator ──────────────────────────────────────────────── */}
        <div className="jp-steps">
          {stepLabels.map((s, i) => (
            <div key={i} className={`jp-step ${step > i + 1 ? 'jp-done' : ''} ${step === i + 1 ? 'jp-active' : ''}`}>
              <div className="jp-step-num">{step > i + 1 ? '\u2713' : i + 1}</div>
              <span className="jp-step-label">{s}</span>
              {i < stepLabels.length - 1 && <span className="jp-step-divider" />}
            </div>
          ))}
        </div>

        {/* ══ STEP 1: AI Chat ══════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="jp-chat anim-fadeUp">
            {/* Messages */}
            <div className="jp-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`jp-msg jp-msg--${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="jp-avatar">
                      <span>{'\uD83D\uDCBC'}</span>
                    </div>
                  )}
                  <div className="jp-bubble">
                    {renderMarkdown(msg.content)}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <div className="jp-msg jp-msg--assistant">
                  <div className="jp-avatar">
                    <span>{'\uD83D\uDCBC'}</span>
                  </div>
                  <div className="jp-bubble jp-typing">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Ready bar */}
            {ready && (
              <div className="jp-ready-bar">
                <span className="jp-ready-icon">{'\u2728'}</span>
                <p>Great! I have your profile. Let's find the right plan for you.</p>
                <button className="jp-ready-btn" onClick={() => setStep(2)}>
                  View Plans &rarr;
                </button>
              </div>
            )}

            {/* Input bar */}
            {suggestions.length > 0 && (
              <div style={{ display: 'flex', gap: 8, padding: '8px 20px', flexWrap: 'wrap', borderTop: '1px solid var(--offwhite2)' }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); setSuggestions([]); }}
                    style={{ padding: '6px 14px', background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.25)', borderRadius: 20, color: 'var(--gold)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                  >{s}</button>
                ))}
              </div>
            )}
            <form className="jp-input-bar" onSubmit={handleSend}>
              <textarea
                ref={inputRef}
                className="jp-input"
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
              <button type="submit" className="jp-send" disabled={!input.trim() || sending}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* ══ STEP 2: Service Selection ════════════════════════════════════ */}
        {step === 2 && (
          <div className="jp-plans anim-fadeUp">
            <h2 className="serif jp-plans-title">Choose Your Plan</h2>
            <p className="jp-plans-sub">
              Select the service level that fits your job search needs.
            </p>

            <div className="jp-plans-grid">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`jp-plan-card ${plan.recommended ? 'jp-plan-recommended' : ''}`}
                >
                  {plan.recommended && (
                    <div className="jp-plan-badge">RECOMMENDED</div>
                  )}

                  <div className="jp-plan-icon">{plan.icon}</div>
                  <h3 className="serif jp-plan-name">{plan.title}</h3>

                  <div className="jp-plan-price">
                    <span className="jp-plan-currency">{'\u20A6'}</span>
                    <span className="jp-plan-amount">{Number(plan.price).toLocaleString()}</span>
                    {plan.period && <span className="jp-plan-period">{plan.period}</span>}
                  </div>

                  <ul className="jp-plan-features">
                    {plan.features.map((f, i) => (
                      <li key={i}>
                        <span className="jp-check">{'\u2713'}</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`jp-plan-cta ${plan.recommended ? 'jp-plan-cta-gold' : ''}`}
                    onClick={() => handleChoosePlan(plan)}
                  >
                    {plan.cta} &rarr;
                  </button>
                </div>
              ))}
            </div>

            <div className="jp-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn-ghost" onClick={() => setStep(1)}>&larr; Back to Chat</button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Payment / Processing ═════════════════════════════════ */}
        {step === 3 && (
          <div className="jp-payment anim-fadeUp">
            <div className="jp-payment-card">
              {subscribing && (
                <div className="jp-payment-loading">
                  <div className="jp-loader" />
                  <p>Processing your subscription...</p>
                </div>
              )}

              {subscribeError && !subscribing && (
                <div className="jp-payment-error">
                  <div className="jp-error-icon">{'\u26A0\uFE0F'}</div>
                  <h3 className="serif">Payment Failed</h3>
                  <p>{subscribeError}</p>
                  <button className="jp-ready-btn" onClick={() => selectedPlan && processSubscription(selectedPlan)}>
                    Try Again
                  </button>
                  <button className="btn-ghost" onClick={() => setStep(2)} style={{ marginTop: '0.75rem' }}>
                    &larr; Back to Plans
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ STEP 4: Success / Access ═════════════════════════════════════ */}
        {step === 4 && (
          <div className="jp-success anim-fadeUp">

            {/* ── Job Board success ── */}
            {successMessage === 'board' && (
              <div className="jp-success-content">
                <div className="jp-success-icon">{'\uD83C\uDF89'}</div>
                <h2 className="serif">Access Granted!</h2>
                <p className="jp-success-sub">
                  Your <strong>Job Board</strong> subscription is active. Browse visa-sponsored jobs from around the world.
                </p>
                <Link to="/jobs" className="jp-ready-btn" style={{ display: 'inline-block', textDecoration: 'none', marginTop: '1.5rem' }}>
                  Browse Jobs &rarr;
                </Link>
              </div>
            )}

            {/* ── Agent Placement success ── */}
            {successMessage === 'agent' && (
              <div className="jp-success-content">
                <div className="jp-success-icon">{'\uD83E\uDD1D'}</div>
                <h2 className="serif">Request Submitted!</h2>
                <p className="jp-success-sub">
                  A dedicated placement agent will be matched to you within <strong>24 hours</strong>. You'll be contacted via email.
                </p>
                <div className="jp-next-steps">
                  <div className="jp-ns-item">
                    <span className="jp-ns-icon">{'\uD83D\uDCE7'}</span>
                    <div>
                      <strong>Check your email</strong>
                      <p>Your agent match confirmation is on its way.</p>
                    </div>
                  </div>
                  <div className="jp-ns-item">
                    <span className="jp-ns-icon">{'\u23F0'}</span>
                    <div>
                      <strong>Response within 24 hours</strong>
                      <p>Your placement agent will reach out to begin the process.</p>
                    </div>
                  </div>
                </div>
                <Link to="/dashboard" className="jp-ready-btn" style={{ display: 'inline-block', textDecoration: 'none', marginTop: '1.5rem' }}>
                  Go to Dashboard &rarr;
                </Link>
              </div>
            )}

            {/* ── Auto-Apply success & setup ── */}
            {successMessage === 'autoapply' && !autoApplyResult && (
              <div className="jp-success-content">
                <div className="jp-success-icon">{'\uD83E\uDD16'}</div>
                <h2 className="serif">Auto-Apply Activated!</h2>
                <p className="jp-success-sub">
                  Set up your profile so we can start applying to jobs on your behalf.
                </p>

                <form className="jp-profile-form" onSubmit={handleAutoApplySetup}>
                  <div className="jp-form-group">
                    <label>Profession / Job Title *</label>
                    <input
                      value={profileForm.profession}
                      onChange={updateProfile('profession')}
                      placeholder="e.g. Software Engineer"
                      required
                    />
                  </div>
                  <div className="jp-form-row">
                    <div className="jp-form-group">
                      <label>Years of Experience *</label>
                      <input
                        value={profileForm.experience}
                        onChange={updateProfile('experience')}
                        placeholder="e.g. 5 years"
                        required
                      />
                    </div>
                    <div className="jp-form-group">
                      <label>Qualification *</label>
                      <input
                        value={profileForm.qualification}
                        onChange={updateProfile('qualification')}
                        placeholder="e.g. B.Sc Computer Science"
                        required
                      />
                    </div>
                  </div>
                  <div className="jp-form-group">
                    <label>Target Country *</label>
                    <input
                      value={profileForm.targetCountry}
                      onChange={updateProfile('targetCountry')}
                      placeholder="e.g. Canada, UK, Germany"
                      required
                    />
                  </div>
                  <div className="jp-form-group">
                    <label>Key Skills</label>
                    <input
                      value={profileForm.skills}
                      onChange={updateProfile('skills')}
                      placeholder="e.g. React, Node.js, Python (comma-separated)"
                    />
                  </div>

                  {subscribeError && (
                    <div className="jp-form-error">{subscribeError}</div>
                  )}

                  <button type="submit" className="jp-ready-btn jp-btn-full" disabled={profileSaving}>
                    {profileSaving ? (
                      <><span className="jp-spinner" /> Setting up...</>
                    ) : (
                      'Start Auto-Applying \u2192'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ── Auto-Apply results ── */}
            {successMessage === 'autoapply' && autoApplyResult && (
              <div className="jp-success-content">
                <div className="jp-success-icon">{'\uD83C\uDF89'}</div>
                <h2 className="serif">Auto-Apply Running!</h2>
                <div className="jp-apply-stats">
                  <div className="jp-stat">
                    <span className="jp-stat-num">{autoApplyResult.applied || 0}</span>
                    <span className="jp-stat-label">Jobs Applied</span>
                  </div>
                  <div className="jp-stat">
                    <span className="jp-stat-num">{autoApplyResult.totalMatching || 0}</span>
                    <span className="jp-stat-label">Total Matching</span>
                  </div>
                </div>
                <p className="jp-success-sub">
                  We've applied to <strong>{autoApplyResult.applied || 0} jobs</strong> on your behalf! Track your applications from the dashboard.
                </p>
                <Link to="/dashboard" className="jp-ready-btn" style={{ display: 'inline-block', textDecoration: 'none', marginTop: '1rem' }}>
                  Go to Dashboard &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Inline Auth Modal ─────────────────────────────────────────── */}
        {showAuth && (
          <div className="jp-auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}>
            <div className="jp-auth-card anim-fadeUp">
              <button className="jp-auth-close" onClick={() => setShowAuth(false)}>&times;</button>
              <h3 className="serif jp-auth-title">Sign in to continue</h3>
              <p className="jp-auth-sub">Create an account or sign in to subscribe.</p>

              {/* Tabs */}
              <div className="jp-auth-tabs">
                <button
                  className={`jp-auth-tab ${authTab === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthTab('login'); setAuthError(''); }}
                >
                  Sign In
                </button>
                <button
                  className={`jp-auth-tab ${authTab === 'register' ? 'active' : ''}`}
                  onClick={() => { setAuthTab('register'); setAuthError(''); }}
                >
                  Create Account
                </button>
              </div>

              {authError && <div className="jp-auth-error">{authError}</div>}

              <form className="jp-auth-form" onSubmit={handleAuth}>
                {authTab === 'register' && (
                  <div className="jp-auth-row">
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
                <button type="submit" className="jp-auth-submit" disabled={authLoading}>
                  {authLoading ? (
                    <><span className="jp-spinner" /> Processing...</>
                  ) : (
                    authTab === 'login' ? 'Sign In & Continue' : 'Create Account & Continue'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
