import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth as authApi } from '../../services/api';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authApi.forgot(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">TRAGENCY</Link>

        {sent ? (
          <>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>📬</div>
            <h2 className="serif auth-title">Check your inbox</h2>
            <p className="auth-sub">
              We've sent a reset link to <strong>{email}</strong>. It expires in 1 hour.
            </p>
            <Link to="/login" style={{ display:'block',textAlign:'center',marginTop:'1.5rem',color:'var(--gold)',fontWeight:500,textDecoration:'none' }}>
              ← Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h2 className="serif auth-title">Reset your password</h2>
            <p className="auth-sub">Enter your email and we'll send you a reset link.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={onSubmit} className="auth-form">
              <div className="fg">
                <label>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com" required />
              </div>
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : 'Send Reset Link →'}
              </button>
            </form>

            <p className="auth-switch">
              Remember your password? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
