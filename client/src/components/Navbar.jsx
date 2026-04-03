import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';
import './Navbar.css';

export default function Navbar() {
  const loc      = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashLink = user?.role === 'admin' ? '/admin'
                 : user?.role === 'agent' ? '/agent'
                 : '/dashboard';

  const dashLabel = user?.role === 'admin' ? t('nav.adminPortal')
                  : user?.role === 'agent' ? t('nav.agentPortal')
                  : t('nav.dashboard');

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <div className="navbar-logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="navbar-logo-text">TRA<em>GENCY</em></span>
      </Link>

      {/* Mobile toggle */}
      <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? '✕' : '☰'}
      </button>

      <div className={`navbar-links ${menuOpen ? 'navbar-links-open' : ''}`}>
        <Link to="/" className={`nlink ${loc.pathname === '/' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>{t('nav.home')}</Link>
        <Link to="/start" className={`nlink ${loc.pathname === '/start' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>{t('nav.planTrip')}</Link>
        <Link to="/agents" className={`nlink ${loc.pathname === '/agents' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>{t('nav.agents')}</Link>
        <Link to="/jobs" className={`nlink ${loc.pathname === '/jobs' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>{t('nav.jobs')}</Link>
        <Link to="/upgrade" className={`nlink nlink-upgrade ${loc.pathname === '/upgrade' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>{t('nav.upgrade')}</Link>
        {user && (
          <Link to={dashLink} className={`nlink ${loc.pathname === dashLink ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            {dashLabel}
          </Link>
        )}
      </div>

      <div className="navbar-right">
        <LanguageSelector />
        {user ? (
          <div className="navbar-user-area">
            <Link to={dashLink} className="navbar-user">
              <div className="navbar-user-av" style={{
                background: user.role === 'admin' ? 'var(--danger)' : user.role === 'agent' ? 'var(--accent)' : 'var(--gold)'
              }}>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="navbar-user-info">
                <span className="navbar-user-name">{user.firstName}</span>
                <span className="navbar-user-role">{user.role}</span>
              </div>
            </Link>
            <button className="navbar-logout-btn" onClick={logout}>{t('nav.signOut')}</button>
          </div>
        ) : (
          <div className="navbar-auth-btns">
            <Link to="/login" className="navbar-login">{t('nav.login')}</Link>
            <Link to="/register" className="navbar-cta">{t('nav.register')} →</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
