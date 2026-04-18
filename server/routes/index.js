const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();

const { authenticate, requireAdmin, requireAgent } = require('../middleware/auth');
const { validate }                                  = require('../middleware/error');

const authCtrl     = require('../controllers/auth.controller');
const agentsCtrl   = require('../controllers/agents.controller');
const bookingsCtrl = require('../controllers/bookings.controller');
const paymentsCtrl = require('../controllers/payments.controller');
const adminCtrl    = require('../controllers/admin.controller');
const reviewsCtrl    = require('../controllers/reviews.controller');
const aiCtrl         = require('../controllers/ai.controller');
const docsCtrl       = require('../controllers/documents.controller');
const milestonesCtrl = require('../controllers/milestones.controller');
const jobsCtrl       = require('../controllers/jobs.controller');
const newsCtrl       = require('../controllers/news.controller');
const subsCtrl       = require('../controllers/subscriptions.controller');
const { fetchAllJobs } = require('../services/job-fetcher');
const autoApplyCtrl  = require('../controllers/autoapply.controller');
const kycCtrl        = require('../controllers/kyc.controller');
const cvCtrl         = require('../controllers/cv.controller');
const stripeCtrl     = require('../controllers/stripe.controller');
const paypalCtrl     = require('../controllers/paypal.controller');
const sessionsCtrl   = require('../controllers/sessions.controller');
const pathwayCtrl    = require('../controllers/pathway.controller');
const doccheckCtrl   = require('../controllers/doccheck.controller');
const visapredCtrl   = require('../controllers/visapredict.controller');
const scholarCtrl    = require('../controllers/scholarship.controller');
const colCtrl        = require('../controllers/costofliving.controller');

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════
router.post('/auth/register',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  authCtrl.register
);

router.post('/auth/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  authCtrl.login
);

router.get('/auth/me',               authenticate, authCtrl.getMe);
router.patch('/auth/profile',        authenticate, authCtrl.updateProfile);
router.post('/auth/change-password', authenticate, authCtrl.changePassword);
router.post('/auth/verify-email',    authCtrl.verifyEmail);
router.post('/auth/forgot-password', authCtrl.forgotPassword);
router.post('/auth/reset-password',  authCtrl.resetPassword);

// ══════════════════════════════════════════════════════════════════════════════
// AGENTS (public)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/agents',                agentsCtrl.getAgents);
router.get('/agents/match/:path',    agentsCtrl.matchAgent);

// ══════════════════════════════════════════════════════════════════════════════
// AGENTS (self-management — logged-in agents)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/agents/me',             authenticate, agentsCtrl.getMyProfile);
router.patch('/agents/me',           authenticate, agentsCtrl.updateMyProfile);
router.patch('/agents/me/availability', authenticate, agentsCtrl.toggleAvailability);
router.get('/agents/me/stats',       authenticate, agentsCtrl.getMyStats);
router.post('/agents/apply',         authenticate, agentsCtrl.applyAsAgent);

// ══════════════════════════════════════════════════════════════════════════════
// AGENTS (admin)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/agents/:id',            agentsCtrl.getAgent);
router.post('/agents',               authenticate, requireAdmin, agentsCtrl.createAgent);
router.patch('/agents/:id/status',   authenticate, requireAdmin, agentsCtrl.updateAgentStatus);

// ══════════════════════════════════════════════════════════════════════════════
// BOOKINGS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/bookings',              authenticate, bookingsCtrl.getBookings);
router.get('/bookings/search',       authenticate, bookingsCtrl.searchBookings);
router.get('/bookings/:id',          authenticate, bookingsCtrl.getBooking);

router.post('/bookings',
  authenticate,
  [
    body('travelPath').notEmpty().withMessage('Travel path is required'),
    body('service').notEmpty().withMessage('Service is required'),
    body('destination').notEmpty().withMessage('Destination is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be > 0'),
  ],
  validate,
  bookingsCtrl.createBooking
);

router.patch('/bookings/:id/status',  authenticate, bookingsCtrl.updateStatus);
router.get('/bookings/:id/messages',  authenticate, bookingsCtrl.getMessages);
router.post('/bookings/:id/messages', authenticate, bookingsCtrl.sendMessage);

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/payments',              authenticate, paymentsCtrl.getPayments);
router.get('/payments/summary',      authenticate, requireAdmin, paymentsCtrl.getSummary);
router.post('/payments/initiate',    authenticate, paymentsCtrl.initiatePayment);
router.post('/payments/webhook',     paymentsCtrl.webhook);
router.post('/payments/:id/release', authenticate, requireAdmin, paymentsCtrl.release);
router.post('/payments/:id/refund',  authenticate, requireAdmin, paymentsCtrl.refund);

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════════════════════════
router.get('/admin/dashboard',       authenticate, requireAdmin, adminCtrl.getDashboard);
router.get('/admin/users',           authenticate, requireAdmin, adminCtrl.getUsers);
router.patch('/admin/users/:id',     authenticate, requireAdmin, adminCtrl.updateUser);
router.get('/admin/notifications',   authenticate, adminCtrl.getNotifications);

// Admin — Agent Management & KYC
router.get('/admin/agents',                authenticate, requireAdmin, adminCtrl.getAgents);
router.get('/admin/agents/:id/kyc',        authenticate, requireAdmin, adminCtrl.getAgentKYC);
router.patch('/admin/agents/:id/approve',  authenticate, requireAdmin, adminCtrl.approveAgent);
router.patch('/admin/agents/:id/reject',   authenticate, requireAdmin, adminCtrl.rejectAgent);
router.patch('/admin/agents/:id/suspend',  authenticate, requireAdmin, adminCtrl.suspendAgent);

// Admin — Subscription Management
router.get('/admin/subscriptions',              authenticate, requireAdmin, adminCtrl.getSubscriptions);
router.post('/admin/subscriptions/grant',       authenticate, requireAdmin, adminCtrl.grantSubscription);
router.patch('/admin/subscriptions/:id/cancel', authenticate, requireAdmin, adminCtrl.adminCancelSubscription);

// Admin — Revenue & Payments
router.get('/admin/revenue',                authenticate, requireAdmin, adminCtrl.getRevenue);
router.get('/admin/pricing',                authenticate, requireAdmin, adminCtrl.getPricingConfig);
router.patch('/admin/pricing/:country',     authenticate, requireAdmin, adminCtrl.updatePricing);
router.get('/admin/stripe/stats',           authenticate, requireAdmin, adminCtrl.getStripeStats);
router.post('/admin/refund/:chargeId',      authenticate, requireAdmin, adminCtrl.issueRefund);

// ══════════════════════════════════════════════════════════════════════════════
// REVIEWS
// ══════════════════════════════════════════════════════════════════════════════
router.post('/reviews',
  authenticate,
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('agentId').notEmpty().withMessage('Agent ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
  ],
  validate,
  reviewsCtrl.createReview
);
router.get('/reviews/agent/:agentId', reviewsCtrl.getAgentReviews);

// ══════════════════════════════════════════════════════════════════════════════
// AI TRAVEL AGENT
// ══════════════════════════════════════════════════════════════════════════════
router.post('/ai/chat',                        aiCtrl.chat);               // Works with or without auth
router.get('/ai/conversation/:sessionId',      aiCtrl.getConversation);
router.post('/ai/match',          authenticate, aiCtrl.matchAgents);
router.post('/ai/match/:matchId/select',   authenticate, aiCtrl.selectAgent);
router.post('/ai/match/:matchId/accept',   authenticate, aiCtrl.acceptMatch);
router.post('/ai/match/:matchId/decline',  authenticate, aiCtrl.declineMatch);
router.get('/ai/matches',         authenticate, aiCtrl.getMatches);

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENTS
// ══════════════════════════════════════════════════════════════════════════════
router.post('/documents',                      authenticate, docsCtrl.uploadDocument);
router.get('/documents/booking/:bookingId',    authenticate, docsCtrl.getDocuments);
router.patch('/documents/:id/review',          authenticate, docsCtrl.reviewDocument);

// ══════════════════════════════════════════════════════════════════════════════
// MILESTONES
// ══════════════════════════════════════════════════════════════════════════════
router.post('/milestones',                     authenticate, milestonesCtrl.createMilestone);
router.get('/milestones/booking/:bookingId',   authenticate, milestonesCtrl.getMilestones);
router.patch('/milestones/:id/complete',       authenticate, milestonesCtrl.completeMilestone);

// ══════════════════════════════════════════════════════════════════════════════
// JOBS & COMPANIES
// ══════════════════════════════════════════════════════════════════════════════
router.get('/jobs',                    jobsCtrl.getJobs);
router.get('/jobs/my-applications',    authenticate, jobsCtrl.getMyApplications);
router.get('/jobs/:id',                jobsCtrl.getJob);
router.post('/jobs',                   authenticate, requireAdmin, jobsCtrl.createJob);
router.post('/jobs/:id/apply',         authenticate, jobsCtrl.applyJob);
router.get('/companies',               jobsCtrl.getCompanies);

// ══════════════════════════════════════════════════════════════════════════════
// NEWS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/news',                    newsCtrl.getNews);
router.get('/news/categories',         newsCtrl.getCategories);
router.get('/news/:id',                newsCtrl.getArticle);
router.post('/news',                   authenticate, requireAdmin, newsCtrl.createArticle);

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/subscriptions/tiers',          subsCtrl.getTiers);
router.get('/subscriptions/plans',          subsCtrl.getPlans);
router.get('/subscriptions/me',             authenticate, subsCtrl.getMySubscription);
router.post('/subscriptions',               authenticate, subsCtrl.subscribe);
router.post('/subscriptions/cancel',        authenticate, subsCtrl.cancel);
router.post('/subscriptions/chat-session',  authenticate, subsCtrl.startChatSession);
router.get('/subscriptions/chat-session/:agentId', authenticate, subsCtrl.checkChatSession);

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN: FETCH JOBS (trigger manually or via cron)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/admin/fetch-jobs', authenticate, requireAdmin, async (req, res) => {
  try {
    fetchAllJobs().catch(console.error);
    res.json({ message: 'Job fetch started in background' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-APPLY
// ══════════════════════════════════════════════════════════════════════════════
router.get('/autoapply/profile',    authenticate, autoApplyCtrl.getProfile);
router.post('/autoapply/profile',   authenticate, autoApplyCtrl.saveProfile);
router.post('/autoapply/run',       authenticate, autoApplyCtrl.runAutoApply);
router.get('/autoapply/stats',      authenticate, autoApplyCtrl.getStats);

// ══════════════════════════════════════════════════════════════════════════════
// KYC — Identity Verification
// ══════════════════════════════════════════════════════════════════════════════
router.post('/kyc/submit',              authenticate, kycCtrl.kycUpload, kycCtrl.submitKYC);
router.get('/kyc/status',               authenticate, kycCtrl.getKYCStatus);
router.get('/kyc/documents/:userId',    authenticate, requireAdmin, kycCtrl.getDocuments);

// ══════════════════════════════════════════════════════════════════════════════
// AGENT SESSIONS (1hr trial + 1 month paid)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/sessions/active',           authenticate, sessionsCtrl.getActiveSessions);
router.post('/sessions/start',           authenticate, sessionsCtrl.startSession);
router.post('/sessions/:id/renew',       authenticate, sessionsCtrl.renewSession);
router.post('/sessions/check-expiry',    authenticate, requireAdmin, sessionsCtrl.checkExpiry);
router.post('/sessions/message',         authenticate, sessionsCtrl.sendSecureMessage);

// ══════════════════════════════════════════════════════════════════════════════
// VIDEO CALLS (Jitsi Meet)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/sessions/video/start',     authenticate, sessionsCtrl.startVideoCall);
router.post('/sessions/video/:id/end',   authenticate, sessionsCtrl.endVideoCall);
router.get('/sessions/video/active',     authenticate, sessionsCtrl.getActiveCalls);

// ══════════════════════════════════════════════════════════════════════════════
// VISA REQUIREMENTS
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// STRIPE PAYMENTS & LOCATION PRICING
// ══════════════════════════════════════════════════════════════════════════════
router.get('/pricing',                  stripeCtrl.getAutoPricing);
router.get('/pricing/:country',         stripeCtrl.getLocationPricing);
router.get('/stripe/config',            stripeCtrl.getConfig);
router.post('/stripe/checkout',         authenticate, stripeCtrl.createCheckout);
router.post('/stripe/webhook',         stripeCtrl.handleWebhook);

// PayPal
router.get('/paypal/config',            paypalCtrl.getConfig);
router.post('/paypal/create-order',     authenticate, paypalCtrl.createOrder);
router.post('/paypal/capture/:orderId', authenticate, paypalCtrl.captureOrder);

router.get('/visa/search',              sessionsCtrl.searchVisa);
router.get('/visa/countries',           (req, res) => {
  const { getAllCountries } = require('./services/../services/ai-agent');
  res.json({ countries: getAllCountries() });
});
router.get('/visa/popular',            async (req, res) => {
  try {
    const { rows } = await require('../db').query(`SELECT * FROM popular_routes ORDER BY search_count DESC LIMIT 20`);
    res.json({ routes: rows });
  } catch (e) { res.json({ routes: [] }); }
});
router.get('/visa/:from/:to/:category', sessionsCtrl.getVisaRequirements);

// ══════════════════════════════════════════════════════════════════════════════
// CV UPLOAD & AUTO-REVIEW
// ══════════════════════════════════════════════════════════════════════════════
router.post('/cv/upload',     authenticate, cvCtrl.cvUpload, cvCtrl.uploadAndReview);
router.get('/cv/reviews',     authenticate, cvCtrl.getReviews);
router.get('/cv/latest',      authenticate, cvCtrl.getLatestReview);

// ══════════════════════════════════════════════════════════════════════════════
// IMMIGRATION PATHWAY TRACKER
// ══════════════════════════════════════════════════════════════════════════════
router.post('/pathways',          authenticate, pathwayCtrl.create);
router.get('/pathways',           authenticate, pathwayCtrl.list);
router.get('/pathways/:id',       authenticate, pathwayCtrl.get);
router.patch('/pathways/:id/step', authenticate, pathwayCtrl.updateStep);
router.patch('/pathways/:id',     authenticate, pathwayCtrl.update);

// ══════════════════════════════════════════════════════════════════════════════
// AI DOCUMENT CHECKER
// ══════════════════════════════════════════════════════════════════════════════
router.post('/documents/check',   authenticate, doccheckCtrl.check);
router.get('/documents/checks',   authenticate, doccheckCtrl.list);

// ══════════════════════════════════════════════════════════════════════════════
// VISA SUCCESS PREDICTOR
// ══════════════════════════════════════════════════════════════════════════════
router.post('/visa/predict',      authenticate, visapredCtrl.predict);
router.get('/visa/predictions',   authenticate, visapredCtrl.list);

// ══════════════════════════════════════════════════════════════════════════════
// SCHOLARSHIP FINDER
// ══════════════════════════════════════════════════════════════════════════════
router.get('/scholarships',       scholarCtrl.list);
router.get('/scholarships/match', authenticate, scholarCtrl.match);
router.post('/scholarships',      authenticate, requireAdmin, scholarCtrl.create);

// ══════════════════════════════════════════════════════════════════════════════
// COST OF LIVING
// ══════════════════════════════════════════════════════════════════════════════
router.get('/cost-of-living/compare', colCtrl.compare);
router.get('/cost-of-living/cities',  colCtrl.cities);
router.get('/cost-of-living/:city',   colCtrl.getCity);

module.exports = router;
