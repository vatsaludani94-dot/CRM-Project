const express = require('express');
const router = express.Router();
const {
  submitPrePayment,
  verifyPayment,
  registerWorkspaceAfterPayment,
} = require('../controllers/onboardingController');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

// Payment-First Onboarding Flow Routes
router.post('/pre-payment', authLimiter, submitPrePayment);
router.post('/verify-payment', authLimiter, verifyPayment);
router.post('/register-workspace', authLimiter, registerWorkspaceAfterPayment);

module.exports = router;
