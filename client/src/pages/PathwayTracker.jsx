import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../data/countries';
import './PathwayTracker.css';

const API = process.env.REACT_APP_API_URL || '/api';

const STEPS = [
  { key: 'profile_setup',        icon: '👤', title: 'Profile Setup',         desc: 'Complete your travel profile with personal details' },
  { key: 'ai_consultation',      icon: '🤖', title: 'AI Consultation',       desc: 'Get personalized visa guidance from our AI' },
  { key: 'agent_matched',        icon: '🤝', title: 'Agent Matched',         desc: 'Paired with a specialist immigration agent' },
  { key: 'document_collection',  icon: '📄', title: 'Document Collection',   desc: 'Gather and upload all required documents' },
  { key: 'application_submit',   icon: '📬', title: 'Application Submission', desc: 'Submit your visa/immigration application' },
  { key: 'embassy_appointment',  icon: '🏛️', title: 'Embassy Appointment',   desc: 'Schedule and attend your embassy interview' },
  { key: 'visa_decision',        icon: '✅', title: 'Visa Decision',          desc: 'Await and receive the visa decision' },
  { key: 'pre_departure',        icon: '🧳', title: 'Pre-Departure Prep',    desc: 'Book flights, accommodation, and prepare' },
  { key: 'arrival_settlement',   icon: '🌍', title: 'Arrival & Settlement',  desc: 'Arrive and settle into your new destination' },
];

function getToken() {
  return localStorage.getItem('tragency_token');
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function PathwayTracker() {
  const [pathway, setPathway] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchPathway(); }, []);

  async function fetchPathway() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/pathways`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPathway(data.pathway || data);
      } else {
        setPathway(null);
      }
    } catch (e) {
      console.error(e);
      setPathway(null);
    } finally {
      setLoading(false);
    }
  }

  async function createPathway() {
    setCreating(true);
    try {
      const res = await fetch(`${API}/pathways`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setPathway(data.pathway || data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('step', STEPS[currentStepIdx]?.key || '');
      const t = getToken();
      const headers = t ? { Authorization: `Bearer ${t}` } : {};
      await fetch(`${API}/pathways/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      setUploadFile(null);
      fetchPathway();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="pw-page">
        <div className="pw-container">
          <div className="pw-loading">
            <div className="pw-spinner" />
            <p>Loading your pathway...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pathway) {
    return (
      <div className="pw-page">
        <div className="pw-container">
          <div className="pw-empty">
            <div className="pw-empty-icon">🗺️</div>
            <h2 className="serif">Start Your Journey</h2>
            <p>Begin your immigration pathway and track every step from consultation to settlement.</p>
            <button className="pw-btn-primary" onClick={createPathway} disabled={creating}>
              {creating ? 'Creating...' : 'Start Your Journey →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = pathway.steps || [];
  const currentStepIdx = steps.findIndex(s => s.status === 'active');
  const doneCount = steps.filter(s => s.status === 'done').length;
  const progress = Math.round((doneCount / STEPS.length) * 100);
  const activeStep = currentStepIdx >= 0 ? STEPS[currentStepIdx] : null;
  const estimatedDays = pathway.estimated_days || pathway.estimatedDays || 90;

  return (
    <div className="pw-page">
      <div className="pw-container">

        {/* Header */}
        <div className="pw-header">
          <div className="pw-header-icon">🗺️</div>
          <div>
            <h1 className="serif">Immigration Pathway</h1>
            <p className="pw-header-sub">Track your journey from consultation to settlement</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pw-progress-section">
          <div className="pw-progress-info">
            <span className="pw-progress-label">Overall Progress</span>
            <span className="pw-progress-pct">{progress}%</span>
          </div>
          <div className="pw-progress-bar">
            <div className="pw-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="pw-progress-meta">
            <span>{doneCount} of {STEPS.length} steps completed</span>
            <span>Est. {estimatedDays} days remaining</span>
          </div>
        </div>

        {/* Next Action Card */}
        {activeStep && (
          <div className="pw-next-action">
            <div className="pw-na-badge">Next Action</div>
            <h3 className="serif">{activeStep.icon} {activeStep.title}</h3>
            <p>{activeStep.desc}</p>

            {/* Upload for current step */}
            <div className="pw-upload-area">
              <label className="pw-upload-label">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setUploadFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <span className="pw-upload-btn">
                  📎 {uploadFile ? uploadFile.name : 'Upload Document for This Step'}
                </span>
              </label>
              {uploadFile && (
                <button className="pw-btn-sm" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="pw-timeline">
          {STEPS.map((step, i) => {
            const stepData = steps[i] || {};
            const status = stepData.status || 'pending';
            return (
              <div key={step.key} className={`pw-step pw-step-${status}`}>
                <div className="pw-step-line-wrap">
                  <div className={`pw-step-dot pw-dot-${status}`}>
                    {status === 'done' ? '✓' : step.icon}
                  </div>
                  {i < STEPS.length - 1 && <div className={`pw-step-line pw-line-${status}`} />}
                </div>
                <div className="pw-step-content">
                  <div className="pw-step-header">
                    <h4 className="pw-step-title">{step.title}</h4>
                    <span className={`pw-step-badge pw-badge-${status}`}>
                      {status === 'done' ? 'Completed' : status === 'active' ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                  <p className="pw-step-desc">{step.desc}</p>
                  {stepData.completed_at && (
                    <span className="pw-step-date">
                      ✓ {new Date(stepData.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
