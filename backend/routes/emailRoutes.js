const express = require('express');
const router = express.Router();
const {
  getOAuthUrl,
  handleOAuthCallback,
  sendEmail,
  trackEmailOpen,
  receiveIncomingEmail,
  getEmailHistory,
} = require('../controllers/emailController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/oauth-url', getOAuthUrl);
router.post('/oauth-callback', handleOAuthCallback);
router.post('/send', sendEmail);
router.get('/history', getEmailHistory);
router.post('/receive', receiveIncomingEmail);
router.put('/track/:id', trackEmailOpen);

module.exports = router;
