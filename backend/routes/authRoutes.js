const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

// Public Auth Endpoints
router.post('/register', registerUser); // register allows public signup but internally blocks role escalations
router.post('/login', authLimiter, loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Private profile
router.get('/me', protect, getMe);

module.exports = router;
