const express = require('express');
const router = express.Router();
const {
  submitPrePayment,
  verifyPayment,
  registerWorkspaceAfterPayment,
  startFreeTrial,
} = require('../controllers/onboardingController');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

// Payment-First Onboarding & Trial Flow Routes
router.post('/pre-payment', authLimiter, submitPrePayment);
router.post('/verify-payment', authLimiter, verifyPayment);
router.post('/register-workspace', authLimiter, registerWorkspaceAfterPayment);
router.post('/start-free-trial', authLimiter, startFreeTrial);

module.exports = router;
