import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Upgrade.css';

const API = process.env.REACT_APP_API_URL || '/api';
function getToken() { return localStorage.getItem('tragency_token'); }

const TIER_FEATURES = {
  premium: [
    'AI travel & job consultation', 'Agent chat (1-hour sessions)', 'Agent matching & booking',
    'Document upload (5 docs)', 'Job board (unlimited)', 'Application tracker',
    'Email notifications', 'Basic visa guidance', 'Save & bookmark jobs', 'Profile optimization tips',
  ],
  gold: [
    'Everything in Premium', 'Unlimited agent chat', 'Priority agent matching',
    'Auto-apply to 50 jobs/month', 'Dedicated placement agent', 'CV review & optimization',
    'Interview preparation', 'Visa tracking & updates', 'Salary negotiation support',
    'Document review by agent', 'Direct company introductions', 'Video consultations', 'Money-back guarantee',
  ],
};

export default function Upgrade() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [pricing, setPricing] = useState(null);
  const [country, setCountry] = useState('');
  const [subscribing, setSubscribing] = useState(null);
  const [error, setError] = useState('');
  const [payMethod, setPayMethod] = useState(null); // 'stripe' | 'paypal' | 'paystack'
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Load current plan + auto-detect pricing
  useEffect(() => {
    // Detect country and load pricing
    fetch(`${API}/pricing`)
      .then(r => r.json())
      .then(d => { setPricing(d.pricing); setCountry(d.country); })
      .catch(() => setPricing({ symbol: '$', currency: 'USD', premium: 15, gold: 45 }));

    if (!user) return;
    const token = getToken();
    if (!token) return;
    fetch(`${API}/subscriptions/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setCurrentPlan(d.plan || 'free'))
      .catch(() => {});
  }, [user]);

  function selectPlan(plan) {
    if (!user) { navigate('/login'); return; }
    setSelectedPlan(plan);
    setPayMethod(null);
    setError('');
  }

  async function handlePay() {
    if (!payMethod || !selectedPlan) return;
    setSubscribing(selectedPlan);
    setError('');

    try {
      const token = getToken();
      if (payMethod === 'stripe') {
        const res = await fetch(`${API}/stripe/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: selectedPlan, country }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        window.location.href = data.url; // Redirect to Stripe Checkout
        return;
      }

      if (payMethod === 'paypal') {
        const res = await fetch(`${API}/paypal/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: selectedPlan, country }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        window.location.href = data.approveUrl; // Redirect to PayPal
        return;
      }

      if (payMethod === 'paystack') {
        // Use direct subscription creation (Paystack handled server-side)
        const res = await fetch(`${API}/subscriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: selectedPlan }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCurrentPlan(selectedPlan);
        setSelectedPlan(null);
        navigate('/dashboard');
        return;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubscribing(null);
    }
  }

  const fmt = (amount) => pricing ? `${pricing.symbol}${Number(amount).toLocaleString()}` : `$${amount}`;

  return (
    <div className="upgrade-page">
      <div className="upgrade-inner">
        <div className="upgrade-header">
          <h1 className="serif">Choose Your Plan</h1>
          <p>Unlock the full power of Tragency. Upgrade anytime.</p>
          {country && pricing && (
            <div className="upgrade-location">
              Prices shown in <strong>{pricing.currency}</strong> for <strong>{country}</strong>
            </div>
          )}
          {currentPlan !== 'free' && (
            <div className="upgrade-current">
              Currently on <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong>
            </div>
          )}
        </div>

        {error && <div className="upgrade-error">{error}</div>}

        <div className="upgrade-grid">
          {/* Free */}
          <div className="upgrade-card">
            <div className="uc-icon">{'\uD83C\uDD93'}</div>
            <h3 className="serif">Free</h3>
            <div className="uc-price"><span className="uc-amount">{pricing ? pricing.symbol : '$'}0</span></div>
            <ul className="uc-features">
              {['AI consultation', 'Browse agents', '5 jobs/day', 'News & updates'].map((f, i) => (
                <li key={i}><span className="uc-check">{'\u2713'}</span>{f}</li>
              ))}
            </ul>
            <div className="uc-locked"><h4>Not included:</h4>
              {['Agent chat', 'Document upload', 'Auto-apply', 'Visa tracking'].map((f, i) => (
                <li key={i}><span className="uc-lock">{'\uD83D\uDD12'}</span>{f}</li>
              ))}
            </div>
            <button className="uc-btn" disabled>{currentPlan === 'free' ? 'Current Plan' : 'Free'}</button>
          </div>

          {/* Premium */}
          <div className={`upgrade-card ${selectedPlan === 'premium' ? 'upgrade-card-selected' : ''}`}>
            <div className="uc-icon">{'\u2B50'}</div>
            <h3 className="serif">Premium</h3>
            <div className="uc-price">
              <span className="uc-amount">{pricing ? fmt(pricing.premium) : '$15'}</span>
              <span className="uc-period">/month</span>
            </div>
            <ul className="uc-features">
              {TIER_FEATURES.premium.map((f, i) => (<li key={i}><span className="uc-check">{'\u2713'}</span>{f}</li>))}
            </ul>
            <button className="uc-btn uc-btn-premium"
              disabled={currentPlan === 'premium' || currentPlan === 'gold'}
              onClick={() => selectPlan('premium')}>
              {currentPlan === 'premium' ? 'Current Plan' : currentPlan === 'gold' ? 'You have Gold' : 'Select Premium'}
            </button>
          </div>

          {/* Gold */}
          <div className={`upgrade-card upgrade-card-gold ${selectedPlan === 'gold' ? 'upgrade-card-selected' : ''}`}>
            <div className="uc-badge">BEST VALUE</div>
            <div className="uc-icon">{'\uD83D\uDC51'}</div>
            <h3 className="serif">Gold</h3>
            <div className="uc-price">
              <span className="uc-amount">{pricing ? fmt(pricing.gold) : '$45'}</span>
              <span className="uc-period">/month</span>
            </div>
            <ul className="uc-features">
              {TIER_FEATURES.gold.map((f, i) => (<li key={i}><span className="uc-check uc-check-gold">{'\u2713'}</span>{f}</li>))}
            </ul>
            <button className="uc-btn uc-btn-gold"
              disabled={currentPlan === 'gold'}
              onClick={() => selectPlan('gold')}>
              {currentPlan === 'gold' ? 'Current Plan' : 'Select Gold'}
            </button>
          </div>
        </div>

        {/* Payment Method Chooser */}
        {selectedPlan && (
          <div className="pay-chooser anim-fadeUp">
            <h3 className="serif">Choose Payment Method</h3>
            <p className="pay-amount">
              {selectedPlan === 'premium' ? 'Premium' : 'Gold'}: <strong>{pricing ? fmt(selectedPlan === 'premium' ? pricing.premium : pricing.gold) : ''}/month</strong>
            </p>

            <div className="pay-methods">
              <button className={`pay-method ${payMethod === 'stripe' ? 'pay-method-active' : ''}`} onClick={() => setPayMethod('stripe')}>
                <span className="pm-icon">{'\uD83D\uDCB3'}</span>
                <div><strong>Card / Google Pay / Apple Pay</strong><small>Visa, Mastercard, Amex + digital wallets</small></div>
              </button>
              <button className={`pay-method ${payMethod === 'paypal' ? 'pay-method-active' : ''}`} onClick={() => setPayMethod('paypal')}>
                <span className="pm-icon">{'\uD83C\uDD7F\uFE0F'}</span>
                <div><strong>PayPal</strong><small>Pay with PayPal balance or linked bank</small></div>
              </button>
              <button className={`pay-method ${payMethod === 'paystack' ? 'pay-method-active' : ''}`} onClick={() => setPayMethod('paystack')}>
                <span className="pm-icon">{'\uD83C\uDFE6'}</span>
                <div><strong>Paystack (Africa)</strong><small>Bank transfer, USSD, mobile money</small></div>
              </button>
            </div>

            <button className="pay-confirm" disabled={!payMethod || subscribing} onClick={handlePay}>
              {subscribing ? 'Processing...' : `Pay ${pricing ? fmt(selectedPlan === 'premium' ? pricing.premium : pricing.gold) : ''} with ${payMethod === 'stripe' ? 'Card' : payMethod === 'paypal' ? 'PayPal' : payMethod === 'paystack' ? 'Paystack' : '...'}`}
            </button>
            <button className="pay-cancel" onClick={() => { setSelectedPlan(null); setPayMethod(null); }}>Cancel</button>
          </div>
        )}

        <div className="upgrade-faq">
          <h3 className="serif">Frequently Asked</h3>
          {[
            { q: 'Can I switch plans?', a: 'Yes, upgrade or downgrade anytime. Changes take effect immediately.' },
            { q: 'What happens when my chat session expires?', a: 'Premium members get 1-hour chat sessions. After expiry, start a new session or upgrade to Gold for unlimited chat.' },
            { q: 'Is there a refund policy?', a: 'Gold members have a money-back guarantee within 7 days if not satisfied.' },
            { q: 'What payment methods are accepted?', a: 'We accept Visa, Mastercard, Amex, Google Pay, Apple Pay, PayPal, bank transfers, USSD, and mobile money.' },
          ].map((faq, i) => (
            <div key={i} className="faq-item"><h4>{faq.q}</h4><p>{faq.a}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}
