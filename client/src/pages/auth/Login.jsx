import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) navigateByRole(user.role);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigateByRole(role) {
    if (role === 'admin')  return navigate('/admin');
    if (role === 'agent')  return navigate('/agent');
    return navigate('/dashboard');
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const loggedUser = await login(form.email, form.password);
      navigateByRole(loggedUser.role);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">TRAGENCY</Link>
        <h2 className="serif auth-title">Welcome back</h2>
        <p className="auth-sub">Sign in to your Tragency account</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={onSubmit} className="auth-form">
          <div className="fg">
            <label>Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@email.com"
              required
            />
          </div>
          <div className="fg">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="auth-extras">
            <Link to="/forgot-password" className="auth-forgot">Forgot password?</Link>
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : 'Sign In →'}
          </button>
        </form>

        <div className="auth-role-links">
          <p className="auth-switch">
            New traveller? <Link to="/register">Create account</Link>
          </p>
          <p className="auth-switch">
            Want to be an agent? <Link to="/agent/apply">Apply here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
