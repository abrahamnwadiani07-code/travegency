import React, { useState, useEffect, useRef } from 'react';
import { COUNTRIES } from '../data/countries';
import './DocChecker.css';

const API = process.env.REACT_APP_API_URL || '/api';

const DOC_TYPES = [
  'Passport', 'Bank Statement', 'Employment Letter', 'Admission Letter',
  'Academic Transcript', 'Passport Photo', 'Travel Insurance',
  'Sponsor Letter', 'Birth Certificate', 'Police Clearance',
];

function getToken() {
  return localStorage.getItem('tragency_token');
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function scoreColor(score) {
  if (score >= 9) return '#d4a853';
  if (score >= 7) return '#10b981';
  if (score >= 4) return '#eab308';
  return '#ef4444';
}

function statusIcon(status) {
  if (status === 'pass') return <span className="dc-ico dc-ico-pass">✓</span>;
  if (status === 'warning') return <span className="dc-ico dc-ico-warn">⚠</span>;
  return <span className="dc-ico dc-ico-fail">✕</span>;
}

export default function DocChecker() {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('');
  const [targetCountry, setTargetCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/documents/checks`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.checks || data || []);
      }
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  }

  async function handleCheck() {
    if (!docType || !targetCountry) return;
    setChecking(true);
    setResult(null);
    try {
      const body = {
        documentName: file ? file.name : 'Untitled',
        documentType: docType,
        targetCountry,
        notes,
      };
      const res = await fetch(`${API}/documents/check`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.result || data);
        fetchHistory();
      }
    } catch (e) { console.error(e); }
    finally { setChecking(false); }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  const score = result?.score ?? null;

  return (
    <div className="dc-page">
      <div className="dc-container">

        {/* Header */}
        <div className="dc-header">
          <div className="dc-header-icon">📋</div>
          <div>
            <h1 className="serif">AI Document Checker</h1>
            <p className="dc-header-sub">Get instant AI feedback on your immigration documents</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="dc-card dc-upload-section">
          <div
            className={`dc-dropzone ${dragOver ? 'dc-dropzone-over' : ''} ${file ? 'dc-dropzone-has' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
            {file ? (
              <div className="dc-file-info">
                <span className="dc-file-icon">📄</span>
                <span className="dc-file-name">{file.name}</span>
                <button className="dc-file-remove" onClick={e => { e.stopPropagation(); setFile(null); }}>✕</button>
              </div>
            ) : (
              <>
                <div className="dc-drop-icon">📂</div>
                <p className="dc-drop-text">Drag & drop your document here</p>
                <p className="dc-drop-hint">or click to browse — PDF, JPG, PNG</p>
              </>
            )}
          </div>

          <div className="dc-form-row">
            <div className="dc-field">
              <label>Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}>
                <option value="">Select type...</option>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="dc-field">
              <label>Target Country</label>
              <select value={targetCountry} onChange={e => setTargetCountry(e.target.value)}>
                <option value="">Select country...</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="dc-field dc-field-full">
            <label>Additional Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any specific concerns about this document..."
              rows={2}
            />
          </div>

          <button
            className="dc-btn-check"
            onClick={handleCheck}
            disabled={checking || !docType || !targetCountry}
          >
            {checking ? (
              <><span className="dc-btn-spin" /> Analyzing...</>
            ) : (
              '🔍 Check Document'
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="dc-card dc-results">
            <h2 className="serif dc-results-title">Analysis Results</h2>

            {/* Score Gauge */}
            <div className="dc-score-wrap">
              <div className="dc-score-circle" style={{ '--score-color': scoreColor(score) }}>
                <svg viewBox="0 0 120 120" className="dc-score-svg">
                  <circle cx="60" cy="60" r="52" className="dc-score-bg-ring" />
                  <circle
                    cx="60" cy="60" r="52"
                    className="dc-score-ring"
                    style={{
                      strokeDasharray: `${(score / 10) * 327} 327`,
                      stroke: scoreColor(score),
                    }}
                  />
                </svg>
                <div className="dc-score-value" style={{ color: scoreColor(score) }}>
                  {score}
                  <span className="dc-score-max">/10</span>
                </div>
              </div>
              <p className="dc-score-label" style={{ color: scoreColor(score) }}>
                {score >= 9 ? 'Excellent' : score >= 7 ? 'Good' : score >= 4 ? 'Needs Work' : 'Poor'}
              </p>
            </div>

            {/* Feedback Items */}
            {result.feedback && result.feedback.length > 0 && (
              <div className="dc-feedback-list">
                <h3>Feedback</h3>
                {result.feedback.map((item, i) => (
                  <div key={i} className={`dc-feedback-item dc-fb-${item.status}`}>
                    {statusIcon(item.status)}
                    <span>{item.message || item.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="dc-suggestions">
                <h3>💡 Suggestions for Improvement</h3>
                <ul>
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="dc-card dc-history">
          <h2 className="serif">Check History</h2>
          {historyLoading ? (
            <p className="dc-muted">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="dc-muted">No document checks yet. Upload a document above to get started.</p>
          ) : (
            <div className="dc-history-list">
              {history.map((h, i) => (
                <div key={h._id || i} className="dc-history-item">
                  <div className="dc-hi-score" style={{ background: scoreColor(h.score), color: h.score >= 4 ? '#0a0a0f' : '#fff' }}>
                    {h.score}
                  </div>
                  <div className="dc-hi-info">
                    <span className="dc-hi-name">{h.documentName || h.documentType}</span>
                    <span className="dc-hi-meta">{h.documentType} · {h.targetCountry}</span>
                  </div>
                  <span className="dc-hi-date">
                    {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
