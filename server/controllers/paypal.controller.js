const { query } = require('../db');
const { getPricing, formatPrice } = require('../data/pricing');

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

// ── Get PayPal access token ─────────────────────────────────────────────────
async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) throw new Error('PayPal not configured');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get PayPal token');
  return data.access_token;
}

// ── POST /api/paypal/create-order — create PayPal order ─────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { plan, country } = req.body;
    const userId = req.user.id;
    const pricing = getPricing(country || 'United States');

    const planPrices = {
      premium: pricing.premium,
      gold: pricing.gold,
      jobBoard: pricing.jobBoard,
      jobAutoApply: pricing.jobAutoApply,
      agentPlacement: pricing.agentPlacement,
      matching: pricing.matching,
    };

    const amount = planPrices[plan];
    if (!amount) return res.status(400).json({ error: 'Invalid plan' });

    const planNames = {
      premium: 'Tragency Premium Plan',
      gold: 'Tragency Gold Plan',
      jobBoard: 'Tragency Job Board Access',
      jobAutoApply: 'Tragency Auto-Apply Service',
      agentPlacement: 'Tragency Agent Placement',
      matching: 'Tragency Agent Matching',
    };

    // PayPal only supports certain currencies — convert others to USD
    const paypalCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY', 'SGD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'BRL', 'MXN', 'INR'];
    let payCurrency = pricing.currency;
    let payAmount = amount;

    if (!paypalCurrencies.includes(payCurrency)) {
      // Try admin-configured rates from DB first, fall back to defaults
      const defaultRates = {
        'NGN': 0.00065, 'GHS': 0.065, 'KES': 0.0065, 'ZAR': 0.055,
        'TZS': 0.00038, 'UGX': 0.00027, 'ETB': 0.008, 'RWF': 0.00072,
        'EGP': 0.02, 'XAF': 0.0016, 'AED': 0.27, 'SAR': 0.27,
        'QAR': 0.27, 'KRW': 0.00075, 'CNY': 0.14, 'PHP': 0.018,
        'PKR': 0.0035, 'BDT': 0.0084,
      };
      let dbRates = {};
      try {
        const { query: dbQuery } = require('../db');
        const { rows } = await dbQuery(`SELECT value FROM platform_config WHERE key = 'exchange_rates'`);
        if (rows[0]?.value) dbRates = rows[0].value;
      } catch (e) { /* DB unavailable, use defaults */ }

      const rate = dbRates[payCurrency] || defaultRates[payCurrency] || 0.01;
      payAmount = Math.ceil(payAmount * rate * 100) / 100;
      payCurrency = 'USD';
    }

    const token = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          description: planNames[plan] || 'Tragency Service',
          amount: {
            currency_code: payCurrency,
            value: payAmount.toFixed(2),
          },
          custom_id: JSON.stringify({ userId, plan, country, originalAmount: amount, originalCurrency: pricing.currency }),
        }],
        application_context: {
          brand_name: 'Tragency',
          return_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?payment=success&plan=${plan}`,
          cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/upgrade?payment=cancelled`,
        },
      }),
    });

    const order = await orderRes.json();
    if (order.id) {
      const approveLink = order.links?.find(l => l.rel === 'approve')?.href;
      res.json({
        orderId: order.id,
        approveUrl: approveLink,
        amount: payAmount,
        currency: payCurrency,
        originalAmount: amount,
        originalCurrency: pricing.currency,
      });
    } else {
      console.error('[PayPal] Order creation failed:', JSON.stringify(order));
      res.status(500).json({ error: 'Failed to create PayPal order' });
    }
  } catch (err) {
    console.error('[PayPal] Error:', err.message);
    next(err);
  }
};

// ── POST /api/paypal/capture/:orderId — capture payment after approval ──────
const captureOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const token = await getAccessToken();

    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const capture = await captureRes.json();

    if (capture.status === 'COMPLETED') {
      // Parse custom data
      let customData = {};
      try {
        customData = JSON.parse(capture.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id || '{}');
      } catch (e) { /* ignore */ }

      const userId = customData.userId || req.user?.id;
      const plan = customData.plan || 'premium';

      if (userId) {
        // Deactivate old subs
        await query(`UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`, [userId]);

        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        const capturedAmount = capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount;

        await query(`
          INSERT INTO subscriptions (user_id, plan, amount, currency, expires_at, gateway_ref, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'active')
        `, [userId, plan, customData.originalAmount || capturedAmount?.value || 0,
            customData.originalCurrency || capturedAmount?.currency_code || 'USD',
            expiresAt, `paypal_${orderId}`]);

        // Notify
        await query(`
          INSERT INTO notifications (user_id, title, body, type)
          VALUES ($1, 'Payment Successful', $2, 'payment_success')
        `, [userId, `Your ${plan} subscription is now active! Payment via PayPal.`]).catch(() => {});
      }

      res.json({ status: 'COMPLETED', orderId, plan, message: 'Payment successful!' });
    } else {
      res.status(400).json({ status: capture.status, error: 'Payment not completed' });
    }
  } catch (err) {
    console.error('[PayPal Capture] Error:', err.message);
    next(err);
  }
};

// ── GET /api/paypal/config — return client ID to frontend ───────────────────
const getConfig = async (req, res) => {
  res.json({
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    enabled: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET),
  });
};

module.exports = { createOrder, captureOrder, getConfig };
