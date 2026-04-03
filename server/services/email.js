const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const from = process.env.EMAIL_FROM || '"Tragency" <no-reply@tragency.com>';
const CLIENT = process.env.CLIENT_URL || 'http://localhost:3000';

async function send(to, subject, html) {
  if (!process.env.EMAIL_USER) {
    console.log(`[Email skipped — no EMAIL_USER] To: ${to} | Subject: ${subject}`);
    return;
  }
  return transporter.sendMail({ from, to, subject, html });
}

// ── Templates ──────────────────────────────────────────────────────────────────

exports.sendVerificationEmail = ({ to, firstName, token }) =>
  send(to, 'Verify your Tragency account', `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2 style="color:#1a1a2e">Welcome to Tragency, ${firstName}!</h2>
      <p>Click the button below to verify your email address:</p>
      <a href="${CLIENT}/verify-email?token=${token}"
         style="display:inline-block;padding:12px 28px;background:#d4a853;color:#1a1a2e;
                text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0">
        Verify Email →
      </a>
      <p style="color:#888;font-size:13px">If you didn't create an account, ignore this email.</p>
    </div>
  `);

exports.sendPasswordReset = ({ to, firstName, token }) =>
  send(to, 'Reset your Tragency password', `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2 style="color:#1a1a2e">Password Reset</h2>
      <p>Hi ${firstName}, click below to reset your password (expires in 1 hour):</p>
      <a href="${CLIENT}/reset-password?token=${token}"
         style="display:inline-block;padding:12px 28px;background:#d4a853;color:#1a1a2e;
                text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0">
        Reset Password →
      </a>
      <p style="color:#888;font-size:13px">If you didn't request this, ignore this email.</p>
    </div>
  `);

exports.sendWelcome = ({ to, firstName, path, reference }) =>
  send(to, `Booking confirmed — ${reference}`, `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2 style="color:#1a1a2e">Your Tragency Booking</h2>
      <p>Hi ${firstName}, your ${path} travel booking has been created!</p>
      <p><strong>Reference:</strong> ${reference}</p>
      <p>An agent will be in touch shortly. You can track your booking from your dashboard.</p>
      <a href="${CLIENT}/dashboard"
         style="display:inline-block;padding:12px 28px;background:#d4a853;color:#1a1a2e;
                text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0">
        Go to Dashboard →
      </a>
    </div>
  `);

exports.sendPaymentReceived = ({ to, firstName, amount, currency, reference }) =>
  send(to, `Payment received — ${reference}`, `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2 style="color:#1a1a2e">Payment Confirmed</h2>
      <p>Hi ${firstName}, we've received your payment of <strong>${currency} ${Number(amount).toLocaleString()}</strong>.</p>
      <p><strong>Reference:</strong> ${reference}</p>
      <p>Your funds are held in Tragency Escrow and will be released to your agent only after you confirm service delivery.</p>
    </div>
  `);
