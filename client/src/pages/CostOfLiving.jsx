import React, { useState, useEffect } from 'react';
import './CostOfLiving.css';

const API = process.env.REACT_APP_API_URL || '/api';

function getToken() {
  return localStorage.getItem('tragency_token');
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

const CATEGORIES = [
  { key: 'rent1br', label: 'Rent (1 Bedroom)', icon: '🏠' },
  { key: 'rent3br', label: 'Rent (3 Bedroom)', icon: '🏡' },
  { key: 'groceries', label: 'Groceries', icon: '🛒' },
  { key: 'transport', label: 'Transport', icon: '🚌' },
  { key: 'utilities', label: 'Utilities', icon: '💡' },
  { key: 'internet', label: 'Internet', icon: '🌐' },
  { key: 'dining', label: 'Dining Out', icon: '🍽️' },
  { key: 'healthcare', label: 'Healthcare', icon: '🏥' },
];

function pctDiff(from, to) {
  if (!from || from === 0) return 0;
  return Math.round(((to - from) / from) * 100);
}

function formatUSD(val) {
  if (val == null) return '—';
  return '$' + Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function CostOfLiving() {
  const [cities, setCities] = useState([]);
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchCities();
  }, []);

  async function fetchCities() {
    setCitiesLoading(true);
    try {
      const res = await fetch(`${API}/cost-of-living/cities`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCities(data.cities || data || []);
      }
    } catch (e) { console.error(e); }
    finally { setCitiesLoading(false); }
  }

  async function handleCompare() {
    if (!fromCity || !toCity) return;
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({ from: fromCity, to: toCity });
      const res = await fetch(`${API}/cost-of-living/compare?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setResult(data.comparison || data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const fromData = result?.from || {};
  const toData = result?.to || {};
  const summary = result?.summary || {};

  // Find max value for bar scaling
  let maxVal = 1;
  if (result) {
    CATEGORIES.forEach(cat => {
      const fv = fromData[cat.key] || 0;
      const tv = toData[cat.key] || 0;
      if (fv > maxVal) maxVal = fv;
      if (tv > maxVal) maxVal = tv;
    });
  }

  return (
    <div className="col-page">
      <div className="col-container">

        {/* Header */}
        <div className="col-header">
          <div className="col-header-icon">💰</div>
          <div>
            <h1 className="serif">Cost of Living Comparison</h1>
            <p className="col-header-sub">Compare expenses between two cities worldwide</p>
          </div>
        </div>

        {/* City Selectors */}
        <div className="col-card col-selectors">
          <div className="col-selector-grid">
            <div className="col-field">
              <label>From City</label>
              <select value={fromCity} onChange={e => setFromCity(e.target.value)} disabled={citiesLoading}>
                <option value="">{citiesLoading ? 'Loading cities...' : 'Select city...'}</option>
                {cities.map((c, i) => (
                  <option key={i} value={typeof c === 'string' ? c : `${c.city},${c.country}`}>
                    {typeof c === 'string' ? c : `${c.city}, ${c.country}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-vs">VS</div>
            <div className="col-field">
              <label>To City</label>
              <select value={toCity} onChange={e => setToCity(e.target.value)} disabled={citiesLoading}>
                <option value="">{citiesLoading ? 'Loading cities...' : 'Select city...'}</option>
                {cities.map((c, i) => (
                  <option key={i} value={typeof c === 'string' ? c : `${c.city},${c.country}`}>
                    {typeof c === 'string' ? c : `${c.city}, ${c.country}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            className="col-btn-compare"
            onClick={handleCompare}
            disabled={loading || !fromCity || !toCity}
          >
            {loading ? (
              <><span className="col-btn-spin" /> Comparing...</>
            ) : (
              '📊 Compare Cities'
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Summary Cards */}
            <div className="col-summary-grid">
              {[
                { label: 'Monthly Budget', value: formatUSD(summary.monthlyBudget), icon: '📋' },
                { label: 'Annual Salary Needed', value: formatUSD(summary.annualSalary), icon: '💼' },
                { label: 'Quality of Life', value: summary.qualityOfLife != null ? `${summary.qualityOfLife}/10` : '—', icon: '⭐' },
                { label: 'Safety Score', value: summary.safetyScore != null ? `${summary.safetyScore}/10` : '—', icon: '🛡️' },
              ].map((item, i) => (
                <div key={i} className="col-summary-card">
                  <div className="col-sc-icon">{item.icon}</div>
                  <div className="col-sc-value">{item.value}</div>
                  <div className="col-sc-label">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Average Salary Comparison */}
            {(summary.avgSalaryFrom || summary.avgSalaryTo) && (
              <div className="col-card col-salary-compare">
                <h3 className="serif">Average Monthly Salary</h3>
                <div className="col-salary-row">
                  <div className="col-salary-item">
                    <span className="col-sal-city">{fromCity.split(',')[0]}</span>
                    <span className="col-sal-amount">{formatUSD(summary.avgSalaryFrom)}</span>
                  </div>
                  <div className="col-salary-item">
                    <span className="col-sal-city">{toCity.split(',')[0]}</span>
                    <span className="col-sal-amount">{formatUSD(summary.avgSalaryTo)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison Table */}
            <div className="col-card col-table-section">
              <h3 className="serif">Detailed Comparison</h3>

              {/* Table Header */}
              <div className="col-table-header">
                <span className="col-th-cat">Category</span>
                <span className="col-th-city">{fromCity.split(',')[0]}</span>
                <span className="col-th-city">{toCity.split(',')[0]}</span>
                <span className="col-th-diff">Difference</span>
              </div>

              {/* Table Rows */}
              {CATEGORIES.map(cat => {
                const fv = fromData[cat.key];
                const tv = toData[cat.key];
                const diff = pctDiff(fv, tv);
                const cheaper = diff < 0;
                const same = diff === 0;

                return (
                  <div key={cat.key} className="col-table-row">
                    <div className="col-tr-cat">
                      <span className="col-tr-icon">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                    <div className="col-tr-val">{formatUSD(fv)}</div>
                    <div className="col-tr-val">{formatUSD(tv)}</div>
                    <div className={`col-tr-diff ${cheaper ? 'col-diff-green' : same ? '' : 'col-diff-red'}`}>
                      {same ? '—' : `${diff > 0 ? '+' : ''}${diff}%`}
                    </div>

                    {/* Bar Chart */}
                    <div className="col-bar-row">
                      <div className="col-bar col-bar-from" style={{ width: `${((fv || 0) / maxVal) * 100}%` }} />
                      <div className="col-bar col-bar-to" style={{ width: `${((tv || 0) / maxVal) * 100}%` }} />
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="col-legend">
                <span className="col-legend-item"><span className="col-dot col-dot-from" /> {fromCity.split(',')[0]}</span>
                <span className="col-legend-item"><span className="col-dot col-dot-to" /> {toCity.split(',')[0]}</span>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!result && !loading && (
          <div className="col-empty">
            <div className="col-empty-icon">🌍</div>
            <h3 className="serif">Select two cities to compare</h3>
            <p>Choose a "From" and "To" city above to see a detailed cost of living breakdown.</p>
          </div>
        )}

      </div>
    </div>
  );
}
