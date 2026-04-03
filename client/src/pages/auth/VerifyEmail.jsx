import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { auth as authApi } from '../../services/api';
import './Auth.css';

export default function VerifyEmail() {
  const [params]  = useSearchParams();
  const token     = params.get('token') || '';
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [msg, setMsg]       = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('No token found in the link.'); return; }
    authApi.verify(token)
      .then(() => setStatus('success'))
      .catch(e  => { setStatus('error'); setMsg(e.message); });
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <Link to="/" className="auth-logo" style={{ display: 'block', marginBottom: '2rem' }}>TRAGENCY</Link>

        {status === 'verifying' && (
          <>
            <div className="auth-spinner" style={{ margin: '0 auto 1.5rem', width: 36, height: 36, borderWidth: 3 }} />
            <h2 className="serif auth-title">Verifying your email…</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 56, marginBottom: '1rem' }}>🎉</div>
            <h2 className="serif auth-title">Email verified!</h2>
            <p className="auth-sub">Your Tragency account is now fully active. You can sign in and start planning your journey.</p>
            <Link to="/login" className="auth-submit" style={{ display:'flex',justifyContent:'center',marginTop:'1.5rem',textDecoration:'none' }}>
              Sign In →
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 56, marginBottom: '1rem' }}>❌</div>
            <h2 className="serif auth-title">Verification failed</h2>
            <div className="auth-error">{msg || 'This link is invalid or has expired.'}</div>
            <p className="auth-switch" style={{ marginTop: '1rem' }}>
              <Link to="/login">Return to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
