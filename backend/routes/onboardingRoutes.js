const express = require('express');
const router = express.Router();
const {
  createWorkspace,
  inviteMember,
  getInvitation,
  acceptInvitation,
} = require('../controllers/onboardingController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

// Public route to view invitation details
router.get('/invitation/:token', getInvitation);

// Protected routes
router.post('/create-workspace', protect, authLimiter, createWorkspace);
router.post('/invite', protect, authLimiter, inviteMember);
router.post('/accept-invitation', protect, authLimiter, acceptInvitation);

module.exports = router;
