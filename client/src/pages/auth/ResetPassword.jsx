import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth as authApi } from '../../services/api';
import './Auth.css';

export default function ResetPassword() {
  const navigate       = useNavigate();
  const [params]       = useSearchParams();
  const token          = params.get('token') || '';

  const [form, setForm]     = useState({ password: '', confirm: '' });
  const [done, setDone]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.reset({ token, password: form.password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Link to="/" className="auth-logo">TRAGENCY</Link>
          <div className="auth-error">Invalid or missing reset token. Please request a new link.</div>
          <Link to="/forgot-password" className="auth-switch" style={{ display:'block',marginTop:'1rem',textAlign:'center' }}>
            Request new link →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">TRAGENCY</Link>

        {done ? (
          <>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>✅</div>
            <h2 className="serif auth-title">Password reset!</h2>
            <p className="auth-sub">Redirecting you to sign in…</p>
          </>
        ) : (
          <>
            <h2 className="serif auth-title">Set new password</h2>
            <p className="auth-sub">Choose a strong password for your Tragency account.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={onSubmit} className="auth-form">
              <div className="fg">
                <label>New password</label>
                <input type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Minimum 8 characters" required />
              </div>
              <div className="fg">
                <label>Confirm password</label>
                <input type="password" value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat your password" required />
              </div>
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : 'Reset Password →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
