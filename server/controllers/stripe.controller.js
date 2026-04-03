const { query } = require('../db');
const { getPricing, toStripeAmount } = require('../data/pricing');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// ── GET /api/pricing/:country — get location-based pricing ──────────────────
const getLocationPricing = async (req, res) => {
  const { country } = req.params;
  const pricing = getPricing(country);
  res.json({ country, pricing });
};

// ── GET /api/pricing — detect country from IP and return pricing ─────────────
const getAutoPricing = async (req, res) => {
  // Try to detect country from various headers
  const country = req.headers['cf-ipcountry'] || // Cloudflare
                  req.headers['x-vercel-ip-country'] || // Vercel
                  req.query.country || 'United States';

  // Map country codes to names
  const codeToName = {
    'NG': 'Nigeria', 'GH': 'Ghana', 'KE': 'Kenya', 'ZA': 'South Africa',
    'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada',
    'DE': 'Germany', 'FR': 'France', 'NL': 'Netherlands', 'IE': 'Ireland',
    'AU': 'Australia', 'NZ': 'New Zealand', 'IN': 'India', 'AE': 'UAE',
    'SG': 'Singapore', 'JP': 'Japan', 'KR': 'South Korea', 'CN': 'China',
    'BR': 'Brazil', 'MX': 'Mexico', 'PL': 'Poland', 'SE': 'Sweden',
    'NO': 'Norway', 'DK': 'Denmark', 'CH': 'Switzerland', 'BE': 'Belgium',
    'ES': 'Spain', 'IT': 'Italy', 'PT': 'Portugal', 'QA': 'Qatar',
    'SA': 'Saudi Arabia', 'EG': 'Egypt', 'TZ': 'Tanzania', 'UG': 'Uganda',
    'ET': 'Ethiopia', 'RW': 'Rwanda', 'CM': 'Cameroon', 'PH': 'Philippines',
    'PK': 'Pakistan', 'BD': 'Bangladesh',
  };

  const countryName = codeToName[country] || country;
  const pricing = getPricing(countryName);
  res.json({ country: countryName, countryCode: country, pricing });
};

// ── POST /api/stripe/checkout — create Stripe checkout session ──────────────
const createCheckout = async (req, res, next) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

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
      premium: 'Premium Plan',
      gold: 'Gold Plan',
      jobBoard: 'Job Board Access',
      jobAutoApply: 'Auto-Apply Service',
      agentPlacement: 'Agent Placement',
      matching: 'Agent Matching Fee',
    };

    const isRecurring = ['premium', 'gold', 'jobBoard', 'jobAutoApply'].includes(plan);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const sessionConfig = {
      payment_method_types: ['card'],
      mode: isRecurring ? 'subscription' : 'payment',
      customer_email: req.user.email,
      metadata: { userId, plan, country: country || 'unknown' },
      success_url: `${clientUrl}/dashboard?payment=success&plan=${plan}`,
      cancel_url: `${clientUrl}/upgrade?payment=cancelled`,
    };

    if (isRecurring) {
      // Create a price on the fly for subscription
      sessionConfig.line_items = [{
        price_data: {
          currency: pricing.currency.toLowerCase(),
          product_data: {
            name: `Tragency ${planNames[plan]}`,
            description: `Monthly subscription — ${pricing.symbol}${amount}/${pricing.currency}`,
          },
          unit_amount: toStripeAmount(amount, pricing.currency),
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }];
    } else {
      // One-time payment
      sessionConfig.line_items = [{
        price_data: {
          currency: pricing.currency.toLowerCase(),
          product_data: {
            name: `Tragency ${planNames[plan]}`,
            description: `One-time payment — ${pricing.symbol}${amount}/${pricing.currency}`,
          },
          unit_amount: toStripeAmount(amount, pricing.currency),
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({
      sessionId: session.id,
      url: session.url,
      amount,
      currency: pricing.currency,
      symbol: pricing.symbol,
    });
  } catch (err) {
    console.error('[Stripe] Checkout error:', err.message);
    next(err);
  }
};

// ── POST /api/stripe/webhook — handle Stripe webhooks ───────────────────────
const handleWebhook = async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('[Stripe Webhook] Signature error:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, plan } = session.metadata || {};
        if (!userId || !plan) break;

        // Deactivate old subs
        await query(`UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`, [userId]);

        // Create subscription
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await query(`
          INSERT INTO subscriptions (user_id, plan, amount, currency, expires_at, gateway_ref, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'active')
        `, [userId, plan, (session.amount_total || 0) / 100, session.currency?.toUpperCase() || 'USD', expiresAt, session.id]);

        // Notify user
        await query(`
          INSERT INTO notifications (user_id, title, body, type)
          VALUES ($1, 'Payment Successful', $2, 'payment_success')
        `, [userId, `Your ${plan} subscription is now active!`]).catch(() => {});

        console.log(`[Stripe] Subscription created: ${plan} for user ${userId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        // Subscription renewal
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find user by Stripe customer
        const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 1 });
        const meta = sessions.data[0]?.metadata;
        if (meta?.userId) {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          await query(`
            UPDATE subscriptions SET expires_at = $2, status = 'active'
            WHERE user_id = $1 AND status = 'active'
          `, [meta.userId, expiresAt]);
          console.log(`[Stripe] Subscription renewed for user ${meta.userId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
        break;
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err.message);
  }

  res.json({ received: true });
};

// ── GET /api/stripe/config — return publishable key to frontend ─────────────
const getConfig = async (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    enabled: !!process.env.STRIPE_SECRET_KEY,
  });
};

module.exports = { getLocationPricing, getAutoPricing, createCheckout, handleWebhook, getConfig };
