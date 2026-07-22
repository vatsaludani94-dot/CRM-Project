const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Activity = require('../models/Activity');

// Helper to generate full access JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'nexus_secret_key_jwt_authentication_2026', {
    expiresIn: '30d',
  });
};

/**
 * @desc    Initialize TOTP 2FA (Generates secret and QR code)
 * @route   POST /api/auth/2fa/setup
 * @access  Private
 */
const setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const secret = speakeasy.generateSecret({
      name: `GrownX CRM:${user.email}`,
    });

    // Save secret temporarily (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code data URL
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      qrCode: qrCodeUrl,
      secret: secret.base32,
    });
  } catch (error) {
    console.error('2FA Setup Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Verify and Enable 2FA
 * @route   POST /api/auth/2fa/verify
 * @access  Private
 */
const verifyAndEnable2FA = async (req, res) => {
  const { code } = req.body;

  try {
    if (!code) {
      return res.status(400).json({ success: false, error: 'Verification code is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, error: '2FA has not been setup yet. Request setup first.' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1, // allow 30 seconds variance
    });

    if (verified) {
      user.twoFactorEnabled = true;
      await user.save();

      await Activity.create({
        user: user._id,
        action: 'Two-Factor Enabled',
        details: 'Enabled Google Authenticator TOTP 2FA.',
        module: 'Security',
        ipAddress: req.ip,
      });

      return res.json({ success: true, message: 'Two-Factor Authentication activated successfully!' });
    }

    res.status(400).json({ success: false, error: 'Invalid verification code. Please scan and check your authenticator app.' });
  } catch (error) {
    console.error('2FA Verify Enable Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Disable 2FA
 * @route   POST /api/auth/2fa/disable
 * @access  Private
 */
const disable2FA = async (req, res) => {
  const { password } = req.body;

  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // If they have password set, require it
    if (user.password && !password) {
      return res.status(400).json({ success: false, error: 'Password is required to disable Two-Factor Authentication' });
    }

    if (user.password && password && !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    await Activity.create({
      user: user._id,
      action: 'Two-Factor Disabled',
      details: 'Disabled Google Authenticator TOTP 2FA.',
      module: 'Security',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Two-Factor Authentication disabled.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Verify 2FA Challenge during Login
 * @route   POST /api/auth/2fa/challenge
 * @access  Public
 */
const challenge2FA = async (req, res) => {
  const { code, tempToken } = req.body;

  try {
    if (!code || !tempToken) {
      return res.status(400).json({ success: false, error: 'Verification code and session token are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'nexus_secret_key_jwt_authentication_2026');
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Session token has expired or is invalid. Please log in again.' });
    }

    if (!decoded.is2faPending) {
      return res.status(400).json({ success: false, error: 'Invalid challenge session state' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, error: 'Two-Factor secret missing for this user' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (verified) {
      await Activity.create({
        user: user._id,
        action: 'Two-Factor Login Successful',
        details: 'Solved 2FA challenge and logged in.',
        module: 'Authentication',
        ipAddress: req.ip,
      });

      return res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          token: generateToken(user._id),
        },
      });
    }

    res.status(400).json({ success: false, error: 'Invalid authenticator code. Please check your app.' });
  } catch (error) {
    console.error('2FA Login Challenge Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  setup2FA,
  verifyAndEnable2FA,
  disable2FA,
  challenge2FA,
};
