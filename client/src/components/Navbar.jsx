import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const loc      = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashLink = user?.role === 'admin' ? '/admin'
                 : user?.role === 'agent' ? '/agent'
                 : '/dashboard';

  const dashLabel = user?.role === 'admin' ? 'Admin Portal'
                  : user?.role === 'agent' ? 'Agent Portal'
                  : 'Dashboard';

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
        <Link to="/" className={`nlink ${loc.pathname === '/' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Home</Link>
        <Link to="/start" className={`nlink ${loc.pathname === '/start' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Plan a Trip</Link>
        <Link to="/agents" className={`nlink ${loc.pathname === '/agents' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Agents</Link>
        <Link to="/jobs" className={`nlink ${loc.pathname === '/jobs' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Jobs</Link>
        <Link to="/upgrade" className={`nlink nlink-upgrade ${loc.pathname === '/upgrade' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Upgrade</Link>
        {user && (
          <Link to={dashLink} className={`nlink ${loc.pathname === dashLink ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            {dashLabel}
          </Link>
        )}
      </div>

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
          <button className="navbar-logout-btn" onClick={logout}>Sign Out</button>
        </div>
      ) : (
        <div className="navbar-auth-btns">
          <Link to="/login" className="navbar-login">Sign In</Link>
          <Link to="/register" className="navbar-cta">Register →</Link>
        </div>
      )}
    </nav>
  );
}
