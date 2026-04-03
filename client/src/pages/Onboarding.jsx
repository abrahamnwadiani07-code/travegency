import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS, PATH_LIST } from '../data/paths';
import './Onboarding.css';

export default function Onboarding() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  function proceed() {
    if (selected) navigate(`/portal/${selected}`);
  }

  return (
    <div className="onboarding-page">
      <div className="ob-inner">
        <div className="ob-header">
          <div className="ob-step-tag">Step 1 of 2</div>
          <h1 className="serif ob-title">What kind of travel are you planning?</h1>
          <p className="ob-sub">Select a travel path below and we'll match you with the right specialist agent.</p>
        </div>

        <div className="ob-grid">
          {PATH_LIST.map(p => (
            <button
              key={p.id}
              className={`ob-card ${selected === p.id ? 'ob-card-selected' : ''}`}
              onClick={() => setSelected(p.id)}
              style={{ '--path-color': p.color }}
            >
              <div className="obc-icon">{p.icon}</div>
              <div className="obc-label serif">{p.label}</div>
              <p className="obc-desc">{p.description}</p>
              <div className="obc-rate">Get Started →</div>
              {selected === p.id && <div className="obc-check">✓</div>}
            </button>
          ))}
        </div>

        <div className="ob-actions">
          <Link to="/" className="btn-ghost">← Back</Link>
          <button
            className="btn-hero-primary"
            disabled={!selected}
            onClick={proceed}
          >
            Continue to Booking →
          </button>
        </div>
      </div>
    </div>
  );
}
