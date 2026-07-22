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
  return jwt.sign({ id }, process.env.JWT_SECRET || 'nexus_secret_key_jwt_authentication_2026', {
    expiresIn: '30d',
  });
};

// Helper to get RP ID dynamically
const getRpID = (req) => {
  const host = req.headers.host || 'localhost';
  return host.split(':')[0];
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

    // Save challenge to user document
    user.resetPasswordOtp = options.challenge; // temporary field mapping for challenge reuse
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

    const expectedChallenge = user.resetPasswordOtp;
    if (!expectedChallenge) {
      return res.status(400).json({ success: false, error: 'Registration challenge missing or expired' });
    }

    const rpID = getRpID(req);
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: [`http://${rpID}:4200`, `https://${rpID}`, `http://${req.headers.host}`, `https://${req.headers.host}`],
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter, transports } = verification.registrationInfo;

      // Save credential
      user.passkeys.push({
        credentialID: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        transports: transports || [],
        deviceName: deviceName || 'Security Key',
      });

      user.resetPasswordOtp = undefined; // clear challenge
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
        id: Buffer.from(p.credentialID, 'base64url'),
        type: 'public-key',
        transports: p.transports || [],
      })),
      userVerification: 'preferred',
    });

    user.resetPasswordOtp = options.challenge; // temporary mapping
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

    const passkey = user.passkeys.find(p => p.credentialID === credential.id);
    if (!passkey) {
      return res.status(400).json({ success: false, error: 'Credential ID does not match any registered passkeys' });
    }

    const expectedChallenge = user.resetPasswordOtp;
    if (!expectedChallenge) {
      return res.status(400).json({ success: false, error: 'Authentication challenge missing or expired' });
    }

    const rpID = getRpID(req);
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: [`http://${rpID}:4200`, `https://${rpID}`, `http://${req.headers.host}`, `https://${req.headers.host}`],
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(passkey.credentialID, 'base64url'),
        credentialPublicKey: Buffer.from(passkey.credentialPublicKey, 'base64url'),
        counter: passkey.counter || 0,
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      // Update counter
      passkey.counter = verification.authenticationInfo.newCounter;
      user.resetPasswordOtp = undefined;
      await user.save();

      // Check status
      if (user.status === 'inactive') {
        return res.status(403).json({ success: false, error: 'Your account is deactivated' });
      }

      await Activity.create({
        user: user._id,
        action: 'User Passkey Login',
        details: `User logged in using passkey device: ${passkey.deviceName || 'Security Key'}`,
        module: 'Authentication',
        ipAddress: req.ip,
      });

      // Handle 2FA intercept if 2FA enabled
      if (user.twoFactorEnabled) {
        // Return temp token to solve 2FA challenge
        const tempToken = jwt.sign({ id: user._id, is2faPending: true }, process.env.JWT_SECRET || 'nexus_secret_key_jwt_authentication_2026', { expiresIn: '5m' });
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

    res.status(400).json({ success: false, error: 'Authentication challenge signature verification failed' });
  } catch (error) {
    console.error('Passkey Verify Login Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete a Passkey
 * @route   DELETE /api/auth/passkey/:id
 * @access  Private
 */
const deletePasskey = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(req.user._id);
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

    user.passkeys = user.passkeys.filter(p => p._id.toString() !== id);
    await user.save();

    await Activity.create({
      user: user._id,
      action: 'Passkey Deleted',
      details: `Deleted passkey: ${id}`,
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
