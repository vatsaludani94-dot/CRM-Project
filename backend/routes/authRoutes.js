const express = require('express');
const router = express.Router();
const {
  registerUser,
  registerWorkspace,
  verifyWorkspaceRegistration,
  resendRegistrationCode,
  loginUser,
  getMe,
  forgotPassword,
  resetPasswordWithOtp,
  googleLogin,
  getGoogleClientId,
  logoutUser,
  revokeAllSessions,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, totpLimiter, passkeyLimiter } = require('../middleware/rateLimitMiddleware');

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
  generateRecoveryCodes,
} = require('../controllers/twoFactorController');

// Public Auth Endpoints
router.post('/register', authLimiter, registerUser);
router.post('/register-workspace', authLimiter, registerWorkspace);
router.post('/register-workspace/verify', authLimiter, verifyWorkspaceRegistration);
router.post('/register-workspace/resend-code', authLimiter, resendRegistrationCode);
router.post('/login', authLimiter, loginUser);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordWithOtp);
router.post('/reset-password-otp', authLimiter, resetPasswordWithOtp);
router.post('/google', authLimiter, googleLogin);
router.get('/google/client-id', getGoogleClientId);

// Passkey WebAuthn Public Endpoints
router.post('/passkey/login-options', passkeyLimiter, getLoginOptions);
router.post('/passkey/verify-login', passkeyLimiter, verifyLogin);

// 2FA Challenge Endpoints
router.post('/2fa/challenge', totpLimiter, challenge2FA);

// Private profile & operations
router.get('/me', protect, getMe);
router.post('/logout', protect, logoutUser);
router.post('/revoke-sessions', protect, revokeAllSessions);
router.post('/passkey/register-options', protect, passkeyLimiter, getRegisterOptions);
router.post('/passkey/verify-registration', protect, passkeyLimiter, verifyRegistration);
router.delete('/passkey/:id', protect, deletePasskey);
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify', protect, totpLimiter, verifyAndEnable2FA);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/generate-recovery-codes', protect, generateRecoveryCodes);

module.exports = router;
