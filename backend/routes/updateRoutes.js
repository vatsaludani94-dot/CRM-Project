const express = require('express');
const router = express.Router();

/**
 * @desc    Check for desktop client updates
 * @route   GET /api/updates/check
 * @access  Public
 */
router.get('/check', (req, res) => {
  const currentClientVersion = req.query.version || '0.0.0';
  const latestVersion = '1.0.1';

  // Compare semantic versioning (Major.Minor.Patch)
  const parseVersion = (v) => v.split('.').map(Number);
  const clientArr = parseVersion(currentClientVersion);
  const latestArr = parseVersion(latestVersion);

  let updateAvailable = false;
  for (let i = 0; i < 3; i++) {
    const latestNum = latestArr[i] || 0;
    const clientNum = clientArr[i] || 0;

    if (latestNum > clientNum) {
      updateAvailable = true;
      break;
    } else if (latestNum < clientNum) {
      break;
    }
  }

  res.json({
    success: true,
    updateAvailable,
    latestVersion,
    releaseNotes: 'Includes official Google Identity Sign-In, biometric WebAuthn Passkeys, and secure TOTP 2FA authentication settings.',
    downloadUrl: `${req.protocol}://${req.get('host')}/api/payments/download-installer`
  });
});

module.exports = router;
