const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Activity = require('../models/Activity');
const { encryptSecret, decryptSecret } = require('../utils/encryption');

// Helper to generate full access JWT
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Helper to generate cryptographically secure recovery codes
const generateRawRecoveryCodes = (count = 8) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    codes.push(formatted);
  }
  return codes;
};

/**
 * @desc    Initialize TOTP 2FA (Generates AES-256-GCM encrypted secret and QR code)
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

    // Encrypt secret before database storage
    user.twoFactorSecret = encryptSecret(secret.base32);
    await user.save();

    // Generate QR code data URL
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      data: {
        qrCodeUrl,
        secret: secret.base32,
      },
      qrCode: qrCodeUrl,
      secret: secret.base32,
    });
  } catch (error) {
    console.error('2FA Setup Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Verify and Enable 2FA (Generates single-use recovery codes)
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

    // Decrypt TOTP secret for verification
    const decryptedSecret = decryptSecret(user.twoFactorSecret);

    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 1, // allow 30 seconds variance
    });

    if (verified) {
      // Generate 8 cryptographically secure single-use recovery codes
      const rawCodes = generateRawRecoveryCodes(8);
      const hashedCodes = rawCodes.map(c => ({
        codeHash: crypto.createHash('sha256').update(c.replace(/[^A-Z0-9]/gi, '').toUpperCase()).digest('hex'),
        used: false,
      }));

      user.twoFactorEnabled = true;
      user.twoFactorRecoveryCodes = hashedCodes;
      await user.save();

      await Activity.create({
        user: user._id,
        action: 'Two-Factor Enabled',
        details: 'Enabled Google Authenticator TOTP 2FA and generated recovery codes.',
        module: 'Security',
        ipAddress: req.ip,
      });

      return res.json({
        success: true,
        message: 'Two-Factor Authentication activated successfully!',
        data: {
          twoFactorRecoveryCodes: rawCodes,
        },
        recoveryCodes: rawCodes,
      });
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

    if (user.password && !password) {
      return res.status(400).json({ success: false, error: 'Password is required to disable Two-Factor Authentication' });
    }

    if (user.password && password && !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryCodes = [];
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
 * @desc    Verify 2FA Challenge during Login (Accepts 6-digit TOTP OR single-use recovery code)
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
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is missing');
      }
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
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

    const cleanedCode = String(code).trim();
    let isSuccess = false;

    // 1. Try TOTP 6-digit verification first if numeric
    if (/^\d{6}$/.test(cleanedCode)) {
      const decryptedSecret = decryptSecret(user.twoFactorSecret);
      const verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: cleanedCode,
        window: 1,
      });
      if (verified) {
        isSuccess = true;
      }
    }

    // 2. If TOTP failed or code format is recovery code format, check single-use recovery codes
    if (!isSuccess && user.twoFactorRecoveryCodes && user.twoFactorRecoveryCodes.length > 0) {
      const formattedCode = cleanedCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const codeHash = crypto.createHash('sha256').update(formattedCode).digest('hex');

      const recoveryIndex = user.twoFactorRecoveryCodes.findIndex(
        rc => rc.codeHash === codeHash && !rc.used
      );

      if (recoveryIndex !== -1) {
        user.twoFactorRecoveryCodes[recoveryIndex].used = true;
        user.twoFactorRecoveryCodes[recoveryIndex].usedAt = new Date();
        await user.save();
        isSuccess = true;

        await Activity.create({
          user: user._id,
          action: '2FA Recovery Code Used',
          details: 'Logged in using single-use 2FA recovery code.',
          module: 'Security',
          ipAddress: req.ip,
        });
      }
    }

    if (isSuccess) {
      await Activity.create({
        user: user._id,
        action: 'Two-Factor Login Successful',
        details: 'Solved 2FA challenge and logged in.',
        module: 'Security',
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

    res.status(400).json({ success: false, error: 'Invalid authenticator code or recovery code.' });
  } catch (error) {
    console.error('2FA Login Challenge Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Regenerate 2FA Recovery Codes
 * @route   POST /api/auth/2fa/generate-recovery-codes
 * @access  Private
 */
const generateRecoveryCodes = async (req, res) => {
  const { password } = req.body;

  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, error: '2FA must be enabled to generate recovery codes' });
    }

    if (user.password && !password) {
      return res.status(400).json({ success: false, error: 'Password is required to regenerate recovery codes' });
    }

    if (user.password && password && !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    const rawCodes = generateRawRecoveryCodes(8);
    const hashedCodes = rawCodes.map(c => ({
      codeHash: crypto.createHash('sha256').update(c.replace(/[^A-Z0-9]/gi, '').toUpperCase()).digest('hex'),
      used: false,
    }));

    user.twoFactorRecoveryCodes = hashedCodes;
    await user.save();

    await Activity.create({
      user: user._id,
      action: '2FA Recovery Codes Regenerated',
      details: 'Invalidated old recovery codes and generated 8 fresh recovery codes.',
      module: 'Security',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'New recovery codes generated. Old recovery codes are now invalid.',
      recoveryCodes: rawCodes,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  setup2FA,
  verifyAndEnable2FA,
  disable2FA,
  challenge2FA,
  generateRecoveryCodes,
};
