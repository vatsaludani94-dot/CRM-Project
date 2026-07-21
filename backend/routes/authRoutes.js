const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, forgotPassword, resetPasswordWithOtp, googleLogin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

// Public Auth Endpoints
router.post('/register', registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithOtp);
router.post('/reset-password-otp', resetPasswordWithOtp);
router.post('/google', googleLogin);

// Private profile
router.get('/me', protect, getMe);

module.exports = router;
