import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../data/countries';
import './VisaPredictor.css';

const API = process.env.REACT_APP_API_URL || '/api';

function getToken() {
  return localStorage.getItem('tragency_token');
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function probColor(p) {
  if (p >= 90) return '#d4a853';
  if (p >= 70) return '#10b981';
  if (p >= 40) return '#eab308';
  return '#ef4444';
}

function probLabel(p) {
  if (p >= 90) return 'Excellent Chances';
  if (p >= 70) return 'Good Chances';
  if (p >= 40) return 'Moderate Chances';
  return 'Low Chances';
}

export default function VisaPredictor() {
  const [form, setForm] = useState({
    fromCountry: '',
    toCountry: '',
    visaType: '',
    travelPurpose: '',
    age: '',
    travelHistory: false,
    financialStatus: 'moderate',
    hasSponsor: false,
    ownsProperty: false,
    employmentStatus: 'employed',
    familyTies: false,
  });
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => { fetchHistory(); }, []);

  function upd(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/visa/predictions`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.predictions || data || []);
      }
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  }

  async function handlePredict(e) {
    e.preventDefault();
    if (!form.fromCountry || !form.toCountry || !form.visaType) return;
    setPredicting(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/visa/predict`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          age: Number(form.age) || 25,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.prediction || data);
        fetchHistory();
      }
    } catch (e) { console.error(e); }
    finally { setPredicting(false); }
  }

  const prob = result?.probability ?? null;

  return (
    <div className="vp-page">
      <div className="vp-container">

        {/* Header */}
        <div className="vp-header">
          <div className="vp-header-icon">🎯</div>
          <div>
            <h1 className="serif">Visa Success Predictor</h1>
            <p className="vp-header-sub">AI-powered analysis of your visa approval probability</p>
          </div>
        </div>

        {/* Form */}
        <form className="vp-card vp-form" onSubmit={handlePredict}>
          <div className="vp-grid2">
            <div className="vp-field">
              <label>From Country</label>
              <select value={form.fromCountry} onChange={e => upd('fromCountry', e.target.value)} required>
                <option value="">Select...</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
              </select>
            </div>
            <div className="vp-field">
              <label>To Country</label>
              <select value={form.toCountry} onChange={e => upd('toCountry', e.target.value)} required>
                <option value="">Select...</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="vp-grid3">
            <div className="vp-field">
              <label>Visa Type</label>
              <select value={form.visaType} onChange={e => upd('visaType', e.target.value)} required>
                <option value="">Select...</option>
                <option value="Student">Student</option>
                <option value="Work">Work</option>
                <option value="Tourist">Tourist</option>
                <option value="Business">Business</option>
                <option value="Family">Family</option>
              </select>
            </div>
            <div className="vp-field">
              <label>Age</label>
              <input type="number" min="16" max="99" value={form.age} onChange={e => upd('age', e.target.value)} placeholder="25" />
            </div>
            <div className="vp-field">
              <label>Employment Status</label>
              <select value={form.employmentStatus} onChange={e => upd('employmentStatus', e.target.value)}>
                <option value="employed">Employed</option>
                <option value="self-employed">Self-Employed</option>
                <option value="unemployed">Unemployed</option>
                <option value="student">Student</option>
              </select>
            </div>
          </div>

          <div className="vp-field">
            <label>Travel Purpose</label>
            <input
              type="text"
              value={form.travelPurpose}
              onChange={e => upd('travelPurpose', e.target.value)}
              placeholder="e.g., Masters in Computer Science at MIT"
            />
          </div>

          {/* Financial Status Radio */}
          <div className="vp-field">
            <label>Financial Status</label>
            <div className="vp-radio-group">
              {['weak', 'moderate', 'strong'].map(v => (
                <label key={v} className={`vp-radio ${form.financialStatus === v ? 'vp-radio-active' : ''}`}>
                  <input type="radio" name="financialStatus" value={v} checked={form.financialStatus === v} onChange={() => upd('financialStatus', v)} />
                  <span>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Toggle Fields */}
          <div className="vp-toggles">
            {[
              { key: 'travelHistory', label: 'Previous Travel History' },
              { key: 'hasSponsor', label: 'Has Sponsor' },
              { key: 'ownsProperty', label: 'Owns Property' },
              { key: 'familyTies', label: 'Family Ties to Home Country' },
            ].map(({ key, label }) => (
              <div key={key} className="vp-toggle-row">
                <span>{label}</span>
                <button
                  type="button"
                  className={`vp-toggle ${form[key] ? 'vp-toggle-on' : ''}`}
                  onClick={() => upd(key, !form[key])}
                >
                  <span className="vp-toggle-thumb" />
                </button>
              </div>
            ))}
          </div>

          <button className="vp-btn-predict" type="submit" disabled={predicting || !form.fromCountry || !form.toCountry || !form.visaType}>
            {predicting ? (
              <><span className="vp-btn-spin" /> Predicting...</>
            ) : (
              '🎯 Predict My Chances'
            )}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="vp-card vp-results">
            <h2 className="serif vp-results-title">Prediction Results</h2>

            {/* Probability Gauge */}
            <div className="vp-gauge-wrap">
              <div className="vp-gauge">
                <svg viewBox="0 0 140 140" className="vp-gauge-svg">
                  <circle cx="70" cy="70" r="60" className="vp-gauge-bg" />
                  <circle
                    cx="70" cy="70" r="60"
                    className="vp-gauge-fill"
                    style={{
                      strokeDasharray: `${(prob / 100) * 377} 377`,
                      stroke: probColor(prob),
                    }}
                  />
                </svg>
                <div className="vp-gauge-value" style={{ color: probColor(prob) }}>
                  {prob}<span className="vp-gauge-pct">%</span>
                </div>
              </div>
              <p className="vp-gauge-label" style={{ color: probColor(prob) }}>{probLabel(prob)}</p>
            </div>

            {/* Positive Factors */}
            {result.positiveFactors && result.positiveFactors.length > 0 && (
              <div className="vp-factors">
                <h3>Positive Factors</h3>
                {result.positiveFactors.map((f, i) => (
                  <div key={i} className="vp-factor vp-factor-pos">
                    <span className="vp-factor-icon vp-fi-pos">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Negative Factors */}
            {result.negativeFactors && result.negativeFactors.length > 0 && (
              <div className="vp-factors">
                <h3>Risk Factors</h3>
                {result.negativeFactors.map((f, i) => (
                  <div key={i} className="vp-factor vp-factor-neg">
                    <span className="vp-factor-icon vp-fi-neg">✕</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Improvements */}
            {result.improvements && result.improvements.length > 0 && (
              <div className="vp-factors">
                <h3>How to Improve</h3>
                {result.improvements.map((f, i) => (
                  <div key={i} className="vp-factor vp-factor-tip">
                    <span className="vp-factor-icon vp-fi-tip">💡</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="vp-card vp-history">
          <h2 className="serif">Prediction History</h2>
          {historyLoading ? (
            <p className="vp-muted">Loading...</p>
          ) : history.length === 0 ? (
            <p className="vp-muted">No predictions yet. Fill out the form above to get started.</p>
          ) : (
            <div className="vp-history-list">
              {history.map((h, i) => (
                <div key={h._id || i} className="vp-history-item">
                  <div className="vp-hi-prob" style={{ background: probColor(h.probability), color: h.probability >= 40 ? '#0a0a0f' : '#fff' }}>
                    {h.probability}%
                  </div>
                  <div className="vp-hi-info">
                    <span className="vp-hi-route">{h.fromCountry} → {h.toCountry}</span>
                    <span className="vp-hi-meta">{h.visaType} visa</span>
                  </div>
                  <span className="vp-hi-date">{h.createdAt ? new Date(h.createdAt).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
