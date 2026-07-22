const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, forgotPassword, resetPasswordWithOtp, googleLogin, getGoogleClientId } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

const {
  getRegisterOptions,
  verifyRegistration,
  getLoginOptions,
  verifyLogin,
  deletePasskey,
} = require('../controllers/passkeyController');

const {
  setup2FA,
  verifyAndEnable2FA,
  disable2FA,
  challenge2FA,
} = require('../controllers/twoFactorController');

// Public Auth Endpoints
router.post('/register', registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithOtp);
router.post('/reset-password-otp', resetPasswordWithOtp);
router.post('/google', googleLogin);
router.get('/google/client-id', getGoogleClientId);

// Passkey WebAuthn Public Endpoints
router.post('/passkey/login-options', getLoginOptions);
router.post('/passkey/verify-login', verifyLogin);

// 2FA Challenge Endpoints
router.post('/2fa/challenge', challenge2FA);

// Private profile & operations
router.get('/me', protect, getMe);
router.post('/passkey/register-options', protect, getRegisterOptions);
router.post('/passkey/verify-registration', protect, verifyRegistration);
router.delete('/passkey/:id', protect, deletePasskey);
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify', protect, verifyAndEnable2FA);
router.post('/2fa/disable', protect, disable2FA);

module.exports = router;
