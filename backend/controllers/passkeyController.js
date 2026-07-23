const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Activity = require('../models/Activity');

// Generate JWT Token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Helper to get RP ID dynamically with environment variable override
const getRpID = (req) => {
  if (process.env.WEBAUTHN_RP_ID) {
    return process.env.WEBAUTHN_RP_ID;
  }
  const host = req.headers.host || 'localhost';
  return host.split(':')[0];
};

// Helper to get expected origins
const getExpectedOrigins = (req, rpID) => {
  if (process.env.WEBAUTHN_ORIGIN) {
    return [process.env.WEBAUTHN_ORIGIN];
  }
  return [
    `http://${rpID}:4200`,
    `https://${rpID}`,
    `http://${req.headers.host}`,
    `https://${req.headers.host}`
  ];
};

/**
 * @desc    Generate Passkey Registration Options
 * @route   POST /api/auth/passkey/register-options
 * @access  Private
 */
const getRegisterOptions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const rpID = getRpID(req);
    const options = await generateRegistrationOptions({
      rpName: 'GrownX CRM',
      rpID,
      userID: user._id.toString(),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: user.passkeys.map(p => ({
        id: Buffer.from(p.credentialID, 'base64url'),
        type: 'public-key',
        transports: p.transports || [],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: undefined,
      },
    });

    // Save dedicated passkey challenge & 5-minute expiry
    user.passkeyChallenge = options.challenge;
    user.passkeyChallengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    res.json(options);
  } catch (error) {
    console.error('Passkey Register Options Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Verify Passkey Registration
 * @route   POST /api/auth/passkey/verify-registration
 * @access  Private
 */
const verifyRegistration = async (req, res) => {
  const { credential, deviceName } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify challenge presence and non-expiry
    if (
      !user.passkeyChallenge ||
      !user.passkeyChallengeExpiresAt ||
      user.passkeyChallengeExpiresAt < new Date()
    ) {
      return res.status(400).json({ success: false, error: 'Passkey registration challenge missing or expired' });
    }

    const expectedChallenge = user.passkeyChallenge;
    const rpID = getRpID(req);
    const expectedOrigin = getExpectedOrigins(req, rpID);

    // Invalidate challenge immediately (single-use)
    user.passkeyChallenge = undefined;
    user.passkeyChallengeExpiresAt = undefined;

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter, transports } = verification.registrationInfo;

      user.passkeys.push({
        credentialID: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        transports: transports || [],
        deviceName: deviceName || 'Security Key',
      });

      await user.save();

      await Activity.create({
        user: user._id,
        action: 'Passkey Registered',
        details: `Registered passkey device: ${deviceName || 'Security Key'}`,
        module: 'Security',
        ipAddress: req.ip,
      });

      return res.json({ success: true, message: 'Passkey registered successfully!' });
    }

    await user.save();
    res.status(400).json({ success: false, error: 'Passkey verification failed' });
  } catch (error) {
    console.error('Passkey Verify Registration Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Generate Passkey Authentication Options
 * @route   POST /api/auth/passkey/login-options
 * @access  Public
 */
const getLoginOptions = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required to prepare passkey authentication' });
    }

    const user = await User.findOne({ email });
    if (!user || user.passkeys.length === 0) {
      return res.status(404).json({ success: false, error: 'No passkeys found for this email address' });
    }

    const rpID = getRpID(req);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.passkeys.map(p => ({
        id: String(p.credentialID),
        type: 'public-key',
        transports: p.transports || [],
      })),
      userVerification: 'preferred',
    });

    // Dedicated passkey challenge & 5-minute expiry
    user.passkeyChallenge = options.challenge;
    user.passkeyChallengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    res.json(options);
  } catch (error) {
    console.error('Passkey Login Options Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Verify Passkey Authentication / Sign-In
 * @route   POST /api/auth/passkey/verify-login
 * @access  Public
 */
const verifyLogin = async (req, res) => {
  const { email, credential } = req.body;

  try {
    if (!email || !credential) {
      return res.status(400).json({ success: false, error: 'Email and credential are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (
      !user.passkeyChallenge ||
      !user.passkeyChallengeExpiresAt ||
      user.passkeyChallengeExpiresAt < new Date()
    ) {
      return res.status(400).json({ success: false, error: 'Authentication challenge missing or expired' });
    }

    const expectedChallenge = user.passkeyChallenge;

    // Invalidate challenge immediately on any verification attempt (single-use)
    user.passkeyChallenge = undefined;
    user.passkeyChallengeExpiresAt = undefined;
    await user.save();

    const passkey = user.passkeys.find(p => p.credentialID === credential.id);
    if (!passkey) {
      return res.status(400).json({ success: false, error: 'Credential ID does not match any registered passkeys' });
    }

    const rpID = getRpID(req);
    const expectedOrigin = getExpectedOrigins(req, rpID);

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(passkey.credentialID, 'base64url'),
        credentialPublicKey: Buffer.from(passkey.credentialPublicKey, 'base64url'),
        counter: passkey.counter || 0,
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      passkey.counter = verification.authenticationInfo.newCounter;
      await user.save();

      if (user.status === 'inactive') {
        return res.status(403).json({ success: false, error: 'Your account is deactivated' });
      }

      await Activity.create({
        user: user._id,
        action: 'User Passkey Login',
        details: `User logged in using passkey device: ${passkey.deviceName || 'Security Key'}`,
        module: 'Security',
        ipAddress: req.ip,
      });

      if (user.twoFactorEnabled) {
        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET environment variable is missing');
        }
        const tempToken = jwt.sign({ id: user._id, is2faPending: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
        return res.json({
          success: true,
          require2FA: true,
          tempToken
        });
      }

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

    await user.save();
    res.status(400).json({ success: false, error: 'Authentication challenge signature verification failed' });
  } catch (error) {
    console.error('Passkey Verify Login Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete a Passkey (Requires re-authentication password)
 * @route   DELETE /api/auth/passkey/:id
 * @access  Private
 */
const deletePasskey = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Protection: Prevent removing final passkey if no password is set
    if (user.passkeys.length === 1 && !user.password) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the final authentication method. Set a password or add another passkey first.'
      });
    }

    // Re-authentication requirement if user has a password set
    if (user.password && !password) {
      return res.status(401).json({
        success: false,
        requireReauth: true,
        error: 'Re-authentication required. Please provide your password to confirm passkey deletion.',
      });
    }

    if (user.password && password && !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        requireReauth: true,
        error: 'Re-authentication failed: Incorrect password.',
      });
    }

    const passkeyExists = user.passkeys.some(p => p._id.toString() === id);
    if (!passkeyExists) {
      return res.status(404).json({ success: false, error: 'Passkey not found or does not belong to user' });
    }

    user.passkeys = user.passkeys.filter(p => p._id.toString() !== id);
    await user.save();

    await Activity.create({
      user: user._id,
      action: 'Passkey Deleted',
      details: `Deleted passkey device ID: ${id}`,
      module: 'Security',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Passkey deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getRegisterOptions,
  verifyRegistration,
  getLoginOptions,
  verifyLogin,
  deletePasskey,
};
