import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'United Kingdom',
  'United States', 'Canada', 'Germany', 'Australia', 'UAE', 'Other',
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirm: '', country: 'Nigeria',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setLoading(true);
    try {
      await register({
        firstName: form.firstName,
        lastName:  form.lastName,
        email:     form.email,
        phone:     form.phone,
        password:  form.password,
        country:   form.country,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <Link to="/" className="auth-logo">TRAGENCY</Link>
        <h2 className="serif auth-title">Create your account</h2>
        <p className="auth-sub">Join Tragency and start planning your journey</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={onSubmit} className="auth-form">
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
            <label>Email address *</label>
            <input type="email" value={form.email} onChange={update('email')} placeholder="you@email.com" required />
          </div>
          <div className="fg">
            <label>Phone number</label>
            <input value={form.phone} onChange={update('phone')} placeholder="+234..." />
          </div>
          <div className="fg">
            <label>Country</label>
            <select value={form.country} onChange={update('country')}>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="fg">
              <label>Password *</label>
              <input type="password" value={form.password} onChange={update('password')} placeholder="Min 8 characters" required />
            </div>
            <div className="fg">
              <label>Confirm password *</label>
              <input type="password" value={form.confirm} onChange={update('confirm')} placeholder="Repeat password" required />
            </div>
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : 'Create Account →'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
