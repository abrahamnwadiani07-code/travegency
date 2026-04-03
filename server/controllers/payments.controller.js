const { query, getClient } = require('../db');
const crypto               = require('crypto');
const emailSvc             = require('../services/email');

// ── GET /api/payments  (admin: all, traveller: own) ───────────────────────────
const getPayments = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let sql = `
      SELECT p.*,
        b.reference, b.destination, b.travel_path,
        u.first_name || ' ' || u.last_name AS payer_name
      FROM payments p
      LEFT JOIN bookings b ON b.id = p.booking_id
      LEFT JOIN users    u ON u.id = p.payer_id
      WHERE 1=1
    `;
    const params = [];
    if (!isAdmin) {
      params.push(req.user.id);
      sql += ` AND p.payer_id = $${params.length}`;
    }
    sql += ` ORDER BY p.created_at DESC`;
    const { rows } = await query(sql, params);
    res.json({ payments: rows });
  } catch (err) { next(err); }
};

// ── GET /api/payments/summary  (admin dashboard stats) ───────────────────────
const getSummary = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*)                                           AS total_payments,
        COALESCE(SUM(amount),0)                           AS total_collected,
        COALESCE(SUM(CASE WHEN status='in_escrow'  THEN amount END),0) AS in_escrow,
        COALESCE(SUM(CASE WHEN status='released'   THEN amount END),0) AS released,
        COALESCE(SUM(CASE WHEN status='refunded'   THEN amount END),0) AS refunded,
        COALESCE(SUM(CASE WHEN status='released'   THEN amount * $1 END),0) AS platform_revenue
      FROM payments
    `, [parseFloat(process.env.PLATFORM_FEE_PERCENT || 5) / 100]);
    res.json({ summary: rows[0] });
  } catch (err) { next(err); }
};

// ── POST /api/payments/initiate  — initiate Paystack payment ─────────────────
const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const { rows: bRows } = await query(
      `SELECT b.*, u.email, u.first_name FROM bookings b
       JOIN users u ON u.id = b.traveller_id
       WHERE b.id = $1 AND b.traveller_id = $2`,
      [bookingId, req.user.id]
    );
    if (!bRows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = bRows[0];

    // In a real app: call Paystack API to create a payment session
    // Here we return the data the frontend needs to initialize Paystack Inline
    const paystackData = {
      key:       process.env.PAYSTACK_PUBLIC_KEY,
      email:     booking.email,
      amount:    Math.round(booking.amount * 100), // Paystack uses kobo
      currency:  'NGN',
      reference: booking.reference,
      metadata: {
        bookingId:   booking.id,
        travelPath:  booking.travel_path,
        destination: booking.destination,
      },
      callback_url: `${process.env.CLIENT_URL}/payment/verify`,
    };

    res.json({ paystack: paystackData, booking });
  } catch (err) { next(err); }
};

// ── POST /api/payments/webhook  — Paystack webhook handler ───────────────────
const webhook = async (req, res, next) => {
  const client = await getClient();
  try {
    // Verify signature
    const sig  = req.headers['x-paystack-signature'];
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (sig !== hash) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      await client.query('BEGIN');

      const ref = data.reference;

      // Find booking by reference
      const { rows: bRows } = await client.query(
        `SELECT * FROM bookings WHERE reference = $1`, [ref]
      );
      if (!bRows.length) { await client.query('ROLLBACK'); return res.sendStatus(200); }
      const booking = bRows[0];

      // Move payment to escrow
      await client.query(`
        UPDATE payments
        SET status = 'in_escrow', gateway_ref = $1,
            gateway_data = $2, escrow_held_at = NOW()
        WHERE booking_id = $3
      `, [data.reference, JSON.stringify(data), booking.id]);

      // Update booking status to confirmed
      await client.query(
        `UPDATE bookings SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1`,
        [booking.id]
      );

      // Notify traveller
      const { rows: uRows } = await client.query(
        `SELECT email, first_name FROM users WHERE id = $1`, [booking.traveller_id]
      );
      if (uRows.length) {
        emailSvc.sendPaymentReceived({
          to: uRows[0].email, firstName: uRows[0].first_name,
          amount: booking.amount, currency: 'NGN', reference: ref,
        }).catch(console.error);
      }

      await client.query('COMMIT');
    }

    res.sendStatus(200);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── POST /api/payments/:id/release  (admin only) ─────────────────────────────
const release = async (req, res, next) => {
  try {
    const { rows } = await query(`
      UPDATE payments SET status = 'released', released_at = NOW()
      WHERE id = $1 AND status = 'in_escrow'
      RETURNING *
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Payment not found or not in escrow' });
    res.json({ payment: rows[0] });
  } catch (err) { next(err); }
};

// ── POST /api/payments/:id/refund  (admin only) ───────────────────────────────
const refund = async (req, res, next) => {
  try {
    const { rows } = await query(`
      UPDATE payments SET status = 'refunded', refunded_at = NOW()
      WHERE id = $1 AND status = 'in_escrow'
      RETURNING *
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Payment not found or not in escrow' });
    res.json({ payment: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getPayments, getSummary, initiatePayment, webhook, release, refund };
