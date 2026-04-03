import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PATH_LIST } from '../../data/paths';
import { COUNTRIES } from '../../data/countries';
import '../auth/Auth.css';
import './AgentApply.css';

export default function AgentApply() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirm: '', country: '',
    displayName: '', bio: '', location: '',
    experienceYrs: '', ratePerTrip: '',
    selectedPaths: [],
    primaryPath: '',
  });

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function togglePath(pathId) {
    setForm(f => {
      const paths = f.selectedPaths.includes(pathId)
        ? f.selectedPaths.filter(p => p !== pathId)
        : [...f.selectedPaths, pathId];
      const primary = paths.includes(f.primaryPath) ? f.primaryPath : (paths[0] || '');
      return { ...f, selectedPaths: paths, primaryPath: primary };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!form.selectedPaths.length) { setError('Select at least one travel path'); return; }
    setError(''); setLoading(true);

    try {
      // Register user account
      await register({
        firstName: form.firstName,
        lastName:  form.lastName,
        email:     form.email,
        phone:     form.phone,
        password:  form.password,
        country:   form.country,
      });

      // Note: In production, this would submit an agent application
      // that an admin reviews and approves. For now, we show success.
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <Link to="/" className="auth-logo">TRAGENCY</Link>
          <div style={{ fontSize: 56, marginBottom: '1rem' }}>🎉</div>
          <h2 className="serif auth-title">Application Submitted!</h2>
          <p className="auth-sub">
            Thank you for applying to become a Tragency agent. Our team will review your
            application and get back to you within 48 hours.
          </p>
          <div className="agent-apply-next">
            <div className="aan-item"><span>📧</span> Check your email for a verification link</div>
            <div className="aan-item"><span>⏳</span> Application review takes 24–48 hours</div>
            <div className="aan-item"><span>✓</span> Once approved, you'll access your Agent Dashboard</div>
          </div>
          <Link to="/login" className="auth-submit" style={{ display:'flex', justifyContent:'center', marginTop:'1.5rem', textDecoration:'none' }}>
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card agent-apply-card">
        <Link to="/" className="auth-logo">TRAGENCY</Link>
        <h2 className="serif auth-title">Become a Tragency Agent</h2>
        <p className="auth-sub">Join our network of verified travel professionals</p>

        {/* Step indicators */}
        <div className="agent-steps">
          <div className={`as-step ${step >= 1 ? 'as-active' : ''}`}>
            <div className="as-num">{step > 1 ? '✓' : '1'}</div>
            <span>Account</span>
          </div>
          <div className="as-line" />
          <div className={`as-step ${step >= 2 ? 'as-active' : ''}`}>
            <div className="as-num">{step > 2 ? '✓' : '2'}</div>
            <span>Profile</span>
          </div>
          <div className="as-line" />
          <div className={`as-step ${step >= 3 ? 'as-active' : ''}`}>
            <div className="as-num">3</div>
            <span>Paths</span>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Account */}
          {step === 1 && (
            <div className="auth-form anim-fadeUp">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="fg">
                  <label>First name *</label>
                  <input value={form.firstName} onChange={update('firstName')} required />
                </div>
                <div className="fg">
                  <label>Last name *</label>
                  <input value={form.lastName} onChange={update('lastName')} required />
                </div>
              </div>
              <div className="fg">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={update('email')} placeholder="you@email.com" required />
              </div>
              <div className="fg">
                <label>Phone *</label>
                <input value={form.phone} onChange={update('phone')} placeholder="+234..." required />
              </div>
              <div className="fg">
                <label>Country</label>
                <select value={form.country} onChange={update('country')}>
                  <option value="">Select country…</option>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="fg">
                  <label>Password *</label>
                  <input type="password" value={form.password} onChange={update('password')} placeholder="Min 8 characters" />
                </div>
                <div className="fg">
                  <label>Confirm *</label>
                  <input type="password" value={form.confirm} onChange={update('confirm')} placeholder="Repeat" />
                </div>
              </div>
              <button type="button" className="auth-submit" onClick={() => {
                if (!form.firstName || !form.email || !form.password) { setError('Fill in all required fields'); return; }
                setError(''); setStep(2);
              }}>
                Next: Agent Profile →
              </button>
            </div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <div className="auth-form anim-fadeUp">
              <div className="fg">
                <label>Display name * (public name clients will see)</label>
                <input value={form.displayName} onChange={update('displayName')}
                  placeholder={`${form.firstName} ${form.lastName}`.trim() || 'e.g. Emeka Okafor'} required />
              </div>
              <div className="fg">
                <label>Bio * (tell clients about your expertise)</label>
                <textarea value={form.bio} onChange={update('bio')} rows={4}
                  placeholder="e.g. UK education specialist with 8 years experience helping students secure admissions..." required />
              </div>
              <div className="fg">
                <label>Location *</label>
                <input value={form.location} onChange={update('location')} placeholder="e.g. London, UK" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="fg">
                  <label>Years of experience</label>
                  <input type="number" min="0" value={form.experienceYrs} onChange={update('experienceYrs')} placeholder="0" />
                </div>
                <div className="fg">
                  <label>Rate per trip (USD)</label>
                  <input type="number" min="0" value={form.ratePerTrip} onChange={update('ratePerTrip')} placeholder="350000" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
                <button type="button" className="auth-submit" style={{ flex: 1 }} onClick={() => {
                  if (!form.displayName || !form.bio || !form.location) { setError('Fill in all required fields'); return; }
                  setError(''); setStep(3);
                }}>
                  Next: Travel Paths →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Paths */}
          {step === 3 && (
            <div className="auth-form anim-fadeUp">
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1rem' }}>
                Select the travel paths you specialize in. Choose at least one.
              </p>
              <div className="agent-path-select">
                {PATH_LIST.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`aps-item ${form.selectedPaths.includes(p.id) ? 'aps-selected' : ''}`}
                    onClick={() => togglePath(p.id)}
                    style={{ '--path-color': p.color }}
                  >
                    <span className="aps-icon">{p.icon}</span>
                    <span className="aps-label">{p.label}</span>
                    {form.selectedPaths.includes(p.id) && <span className="aps-check">✓</span>}
                  </button>
                ))}
              </div>

              {form.selectedPaths.length > 1 && (
                <div className="fg" style={{ marginTop: '1rem' }}>
                  <label>Primary specialization</label>
                  <select value={form.primaryPath} onChange={update('primaryPath')}>
                    {form.selectedPaths.map(id => {
                      const p = PATH_LIST.find(x => x.id === id);
                      return <option key={id} value={id}>{p?.icon} {p?.label}</option>;
                    })}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
                <button type="submit" className="auth-submit" style={{ flex: 1 }} disabled={loading}>
                  {loading ? <span className="auth-spinner" /> : 'Submit Application →'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
