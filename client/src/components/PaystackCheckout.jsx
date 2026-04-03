import React, { useState } from 'react';
import { payments as paymentsApi } from '../services/api';
import './PaystackCheckout.css';

/**
 * PaystackCheckout
 *
 * Usage:
 *   <PaystackCheckout bookingId={booking.id} amount={booking.amount} reference={booking.reference} onSuccess={fn} onClose={fn} />
 *
 * Loads Paystack Inline JS dynamically, then calls the backend to get
 * the Paystack config, then opens the Paystack payment popup.
 */
export default function PaystackCheckout({ bookingId, amount, reference, onSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function pay() {
    setLoading(true); setError('');

    try {
      // 1. Get Paystack config from backend
      const { paystack } = await paymentsApi.initiate(bookingId);

      // 2. Load Paystack Inline script if not already loaded
      await loadPaystackScript();

      // 3. Initialize Paystack popup
      // eslint-disable-next-line no-undef
      const handler = PaystackPop.setup({
        key:       paystack.key,
        email:     paystack.email,
        amount:    paystack.amount,   // in kobo
        currency:  paystack.currency,
        ref:       paystack.reference,
        metadata:  paystack.metadata,
        onClose:   () => {
          setLoading(false);
          onClose?.();
        },
        callback: (response) => {
          setLoading(false);
          // Payment verified via webhook on the backend automatically
          // Response has { reference, status: 'success' }
          onSuccess?.(response);
        },
      });

      handler.openIframe();
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="paystack-checkout">
      {error && <div className="psc-error">{error}</div>}

      <div className="psc-summary">
        <div className="psc-summary-row">
          <span>Booking reference</span>
          <strong>{reference}</strong>
        </div>
        <div className="psc-summary-row">
          <span>Amount to pay</span>
          <strong className="psc-amount">${Number(amount).toLocaleString()}</strong>
        </div>
        <div className="psc-summary-row">
          <span>Escrow protection</span>
          <strong style={{ color: 'var(--success)' }}>✓ Active</strong>
        </div>
        <div className="psc-summary-row">
          <span>Platform fee (5%)</span>
          <strong>${Math.round(amount * 0.05).toLocaleString()}</strong>
        </div>
      </div>

      <div className="psc-escrow-note">
        🔒 Your payment is held in <strong>Tragency Escrow</strong> until your service is delivered.
        Your agent receives nothing until you confirm completion.
      </div>

      <button className="psc-btn" onClick={pay} disabled={loading}>
        {loading ? (
          <span className="psc-loading"><span className="psc-spinner" /> Processing…</span>
        ) : (
          <>Pay ${Number(amount).toLocaleString()} Securely →</>
        )}
      </button>

      <div className="psc-powered">
        <span>Powered by</span>
        <strong>Paystack</strong>
        <span>· SSL secured</span>
      </div>
    </div>
  );
}

// ── Load Paystack Inline SDK ──────────────────────────────────────────────────
function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) { resolve(); return; }
    const script    = document.createElement('script');
    script.src      = 'https://js.paystack.co/v1/inline.js';
    script.onload   = resolve;
    script.onerror  = () => reject(new Error('Failed to load Paystack. Check your connection.'));
    document.head.appendChild(script);
  });
}
