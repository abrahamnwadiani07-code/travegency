import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Upgrade.css';

const API = process.env.REACT_APP_API_URL || '/api';

function getToken() {
  return localStorage.getItem('tragency_token');
}

const TIERS = {
  premium: {
    name: 'Premium',
    price: '15,000',
    period: '/month',
    icon: '\u2B50',
    color: '#6366f1',
    features: [
      'AI travel & job consultation',
      'Agent chat (1-hour sessions)',
      'Agent matching & booking',
      'Document upload (5 docs)',
      'Job board (unlimited browsing)',
      'Application tracker',
      'Email notifications',
      'Basic visa guidance',
      'Save & bookmark jobs',
      'Profile optimization tips',
    ],
  },
  gold: {
    name: 'Gold',
    price: '45,000',
    period: '/month',
    icon: '\uD83D\uDC51',
    color: '#d4a853',
    popular: true,
    features: [
      'Everything in Premium',
      'Unlimited agent chat (no expiry)',
      'Priority agent matching',
      'Auto-apply to 50 jobs/month',
      'Dedicated placement agent',
      'CV review & optimization',
      'Interview preparation',
      'Visa tracking & updates',
      'Salary negotiation support',
      'Document review by agent',
      'Direct company introductions',
      'Weekly progress reports',
      'Phone & video consultations',
      'Money-back guarantee',
    ],
  },
};

export default function Upgrade() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [subscribing, setSubscribing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    fetch(`${API}/subscriptions/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setCurrentPlan(d.plan || 'free'))
      .catch(() => {});
  }, [user]);

  async function handleSubscribe(plan) {
    if (!user) { navigate('/login'); return; }
    setSubscribing(plan);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${API}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Subscription failed');
      }
      setCurrentPlan(plan);
      navigate('/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubscribing(null);
    }
  }

  return (
    <div className="upgrade-page">
      <div className="upgrade-inner">
        <div className="upgrade-header">
          <h1 className="serif">Choose Your Plan</h1>
          <p>Unlock the full power of Tragency. Upgrade anytime.</p>
          {currentPlan !== 'free' && (
            <div className="upgrade-current">
              Currently on <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong> plan
            </div>
          )}
        </div>

        {error && <div className="upgrade-error">{error}</div>}

        <div className="upgrade-grid">
          {/* Free */}
          <div className="upgrade-card">
            <div className="uc-icon">{'🆓'}</div>
            <h3 className="serif">Free</h3>
            <div className="uc-price">
              <span className="uc-amount">{'\u20A6'}0</span>
            </div>
            <ul className="uc-features">
              {['AI consultation (travel & jobs)', 'Browse agents', 'View 5 jobs per day', 'News & updates'].map((f, i) => (
                <li key={i}><span className="uc-check">{'\u2713'}</span>{f}</li>
              ))}
            </ul>
            <div className="uc-locked">
              <h4>Not included:</h4>
              {['Agent chat', 'Document upload', 'Job applications', 'Auto-apply', 'Visa tracking'].map((f, i) => (
                <li key={i}><span className="uc-lock">{'\uD83D\uDD12'}</span>{f}</li>
              ))}
            </div>
            <button className="uc-btn" disabled>
              {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
            </button>
          </div>

          {/* Premium */}
          <div className="upgrade-card">
            <div className="uc-icon">{TIERS.premium.icon}</div>
            <h3 className="serif">{TIERS.premium.name}</h3>
            <div className="uc-price">
              <span className="uc-currency">{'\u20A6'}</span>
              <span className="uc-amount">{TIERS.premium.price}</span>
              <span className="uc-period">{TIERS.premium.period}</span>
            </div>
            <ul className="uc-features">
              {TIERS.premium.features.map((f, i) => (
                <li key={i}><span className="uc-check">{'\u2713'}</span>{f}</li>
              ))}
            </ul>
            <button
              className="uc-btn uc-btn-premium"
              disabled={currentPlan === 'premium' || currentPlan === 'gold' || subscribing}
              onClick={() => handleSubscribe('premium')}
            >
              {subscribing === 'premium' ? 'Processing...' :
               currentPlan === 'premium' ? 'Current Plan' :
               currentPlan === 'gold' ? 'You have Gold' :
               'Upgrade to Premium'}
            </button>
          </div>

          {/* Gold */}
          <div className="upgrade-card upgrade-card-gold">
            <div className="uc-badge">BEST VALUE</div>
            <div className="uc-icon">{TIERS.gold.icon}</div>
            <h3 className="serif">{TIERS.gold.name}</h3>
            <div className="uc-price">
              <span className="uc-currency">{'\u20A6'}</span>
              <span className="uc-amount">{TIERS.gold.price}</span>
              <span className="uc-period">{TIERS.gold.period}</span>
            </div>
            <ul className="uc-features">
              {TIERS.gold.features.map((f, i) => (
                <li key={i}><span className="uc-check uc-check-gold">{'\u2713'}</span>{f}</li>
              ))}
            </ul>
            <button
              className="uc-btn uc-btn-gold"
              disabled={currentPlan === 'gold' || subscribing}
              onClick={() => handleSubscribe('gold')}
            >
              {subscribing === 'gold' ? 'Processing...' :
               currentPlan === 'gold' ? 'Current Plan' :
               'Upgrade to Gold'}
            </button>
          </div>
        </div>

        <div className="upgrade-faq">
          <h3 className="serif">Frequently Asked</h3>
          {[
            { q: 'Can I switch plans?', a: 'Yes, upgrade or downgrade anytime. Changes take effect immediately.' },
            { q: 'What happens when my chat session expires?', a: 'Premium members get 1-hour chat sessions. After expiry, start a new session or upgrade to Gold for unlimited chat.' },
            { q: 'Is there a refund policy?', a: 'Gold members have a money-back guarantee within 7 days if not satisfied.' },
            { q: 'What payment methods are accepted?', a: 'We accept all cards, bank transfers, and mobile money via Paystack.' },
          ].map((faq, i) => (
            <div key={i} className="faq-item">
              <h4>{faq.q}</h4>
              <p>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
