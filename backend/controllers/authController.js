const User = require('../models/User');
const Tenant = require('../models/Tenant');
const PendingRegistration = require('../models/PendingRegistration');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Activity = require('../models/Activity');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Token with server-side tokenVersion
const generateToken = (userOrId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  let id = userOrId._id || userOrId;
  let tokenVersion = userOrId.tokenVersion || 0;
  return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public / Admin
 */
const registerUser = async (req, res) => {
  const { name, email, password, role, department } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists with this email' });
    }

    let targetRole = role || 'customer';
    if (role && ['super_admin', 'manager'].includes(role)) {
      if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Only Super Admins can register managers or other admins',
        });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role: targetRole,
      department: department || 'None',
    });

    if (user) {
      await Activity.create({
        user: req.user ? req.user._id : user._id,
        action: 'User Registered',
        details: `User ${user.name} (${user.email}) registered with role ${user.role}.`,
        module: 'Authentication',
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          token: generateToken(user),
        },
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      if (user.status === 'inactive') {
        return res.status(403).json({ success: false, error: 'Your account is deactivated' });
      }

      await Activity.create({
        user: user._id,
        action: 'User Login',
        details: `User ${user.name} logged in successfully.`,
        module: 'Authentication',
        ipAddress: req.ip,
      });

      if (user.twoFactorEnabled) {
        const tempToken = jwt.sign({ id: user._id, is2faPending: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
        return res.json({
          success: true,
          require2FA: true,
          tempToken
        });
      }

      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          tenant: user.tenant,
          token: generateToken(user),
        },
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('tenant', 'name subdomain plan status');
    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Forgot Password (Generates hashed 6-digit OTP & sends email, prevents enumeration)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const genericMessage = 'If an account exists for this email address, password reset instructions have been sent.';

  try {
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: true,
        message: genericMessage,
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otpCode).digest('hex');

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const { sendOtpEmail } = require('../services/invoice-email.service');
    await sendOtpEmail(user.email, otpCode);

    res.json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Verify Hashed OTP and Reset Password (Invalidates all previous sessions)
 * @route   POST /api/auth/reset-password-otp
 * @access  Public
 */
const resetPasswordWithOtp = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP, and new password are required' });
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      email,
      resetPasswordOtp: hashedOtp,
      resetPasswordOtpExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code. Please request a new OTP.' });
    }

    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpire = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await Activity.create({
      user: user._id,
      action: 'Password Reset via Email OTP',
      details: `User ${user.name} reset password. All active sessions invalidated.`,
      module: 'Authentication',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Password updated successfully! All previous sessions invalidated. You can now log in.' });
  } catch (error) {
    console.error('Reset Password OTP Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Google OAuth Sign-In / Sign-Up with secure account linking & email verification
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleLogin = async (req, res) => {
  const { googleToken, linkPassword } = req.body;

  try {
    if (!googleToken) {
      return res.status(400).json({ success: false, error: 'Google authentication token is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({
        success: false,
        error: 'Google Sign-In is disabled: GOOGLE_CLIENT_ID is not configured in backend environment variables.',
      });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Failed to verify Google token signature: ' + err.message });
    }

    const payload = ticket.getPayload();
    const { sub: googleSubjectId, email, name, picture, email_verified } = payload;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Google email address could not be resolved from token payload.' });
    }

    if (email_verified === false || email_verified === 'false') {
      return res.status(400).json({
        success: false,
        error: 'Google authentication failed: The Google email address is not verified by Google.',
      });
    }

    let user = await User.findOne({ googleSubjectId });

    if (!user) {
      const existingEmailUser = await User.findOne({ email }).select('+password');
      if (existingEmailUser) {
        if (linkPassword) {
          const isPasswordValid = await existingEmailUser.matchPassword(linkPassword);
          if (!isPasswordValid) {
            return res.status(401).json({
              success: false,
              requireAccountLinking: true,
              email: existingEmailUser.email,
              error: 'Incorrect password for account linking. Please enter your valid account password.',
            });
          }
          existingEmailUser.googleSubjectId = googleSubjectId;
          if (!existingEmailUser.profilePicture && picture) {
            existingEmailUser.profilePicture = picture;
          }
          await existingEmailUser.save();
          user = existingEmailUser;
        } else {
          return res.status(400).json({
            success: false,
            requireAccountLinking: true,
            email: existingEmailUser.email,
            error: 'An account with this email address already exists. Please enter your account password to link your Google account.',
          });
        }
      }
    }

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleSubjectId,
        role: 'employee',
        profilePicture: picture || '',
        department: 'None',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, error: 'Your account is deactivated' });
    }

    await Activity.create({
      user: user._id,
      action: 'User Google OAuth Login',
      details: `User ${user.name} logged in via Google Identity Services.`,
      module: 'Authentication',
      ipAddress: req.ip,
    });

    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ id: user._id, is2faPending: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
      return res.json({
        success: true,
        require2FA: true,
        tempToken
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        tenant: user.tenant,
        requireWorkspaceOnboarding: !user.tenant && user.role !== 'super_admin',
        token: generateToken(user),
      },
    });
  } catch (error) {
    console.error('Google OAuth Login Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getGoogleClientId = async (req, res) => {
  res.json({
    success: true,
    clientId: process.env.GOOGLE_CLIENT_ID || ''
  });
};

/**
 * @desc    Initiate Workspace Registration (Generates verification code & sends email)
 * @route   POST /api/auth/register-workspace
 * @access  Public
 */
const registerWorkspace = async (req, res) => {
  const { companyName, name, email, password, code } = req.body;

  try {
    // If verification code is submitted in body, delegate to verify function
    if (code) {
      return await verifyWorkspaceRegistration(req, res);
    }

    if (!companyName || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide company name, owner name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email address',
      });
    }

    // Generate 6-digit numeric verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save pending registration in MongoDB
    await PendingRegistration.findOneAndUpdate(
      { email: cleanEmail },
      {
        email: cleanEmail,
        companyName: companyName.trim(),
        name: name.trim(),
        password: hashedPassword,
        verificationCodeHash: hashedCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
      },
      { upsert: true, new: true }
    );

    // Send verification email
    const { sendRegistrationVerificationEmail } = require('../services/invoice-email.service');
    await sendRegistrationVerificationEmail(cleanEmail, verificationCode);

    res.status(200).json({
      success: true,
      requireEmailVerification: true,
      email: cleanEmail,
      message: 'A 6-digit verification code has been sent to your email. Please enter it to complete workspace creation.',
    });
  } catch (error) {
    console.error('Workspace Registration Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Verify Email & Complete Workspace Registration
 * @route   POST /api/auth/register-workspace/verify
 * @access  Public
 */
const verifyWorkspaceRegistration = async (req, res) => {
  const { email, code } = req.body;

  try {
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email address and 6-digit verification code are required',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanedCode = String(code).trim();
    const hashedCode = crypto.createHash('sha256').update(cleanedCode).digest('hex');

    const pending = await PendingRegistration.findOne({
      email: cleanEmail,
      verificationCodeHash: hashedCode,
      expiresAt: { $gt: new Date() },
    });

    if (!pending) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code. Please request a new code.',
      });
    }

    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({
        success: false,
        error: 'User account already exists for this email address',
      });
    }

    let baseSubdomain = pending.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

    if (!baseSubdomain) {
      baseSubdomain = 'workspace';
    }

    let subdomain = baseSubdomain;
    let tenantExists = await Tenant.findOne({ subdomain });
    if (tenantExists) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      subdomain = `${baseSubdomain}${suffix}`;
    }

    let tenant;
    try {
      tenant = await Tenant.create({
        name: pending.companyName,
        subdomain,
        plan: 'free',
        status: 'active',
      });
    } catch (err) {
      if (err.code === 11000) {
        subdomain = `${baseSubdomain}${Math.floor(10000 + Math.random() * 90000)}`;
        tenant = await Tenant.create({
          name: pending.companyName,
          subdomain,
          plan: 'free',
          status: 'active',
        });
      } else {
        throw err;
      }
    }

    let user;
    try {
      user = await User.create({
        name: pending.name,
        email: pending.email,
        password: pending.password, // Pre-hashed password
        role: 'workspace_owner',
        department: 'Management',
        status: 'active',
        tenant: tenant._id,
      });
    } catch (userErr) {
      console.error('User creation failed during workspace verification. Rolling back Tenant:', userErr.message);
      await Tenant.findByIdAndDelete(tenant._id);
      throw userErr;
    }

    tenant.owner = user._id;
    await tenant.save();

    // Delete pending registration after successful creation (single-use)
    await PendingRegistration.deleteOne({ _id: pending._id });

    await Activity.create({
      user: user._id,
      action: 'Workspace Registered & Email Verified',
      details: `Workspace "${tenant.name}" (${tenant.subdomain}) created with Owner ${user.name} (${user.email}).`,
      module: 'Authentication',
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Workspace registered and email verified successfully!',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          plan: tenant.plan,
        },
        token: generateToken(user),
      },
    });
  } catch (error) {
    console.error('Verify Workspace Registration Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Resend Workspace Registration Verification Code
 * @route   POST /api/auth/register-workspace/resend-code
 * @access  Public
 */
const resendRegistrationCode = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const pending = await PendingRegistration.findOne({ email: cleanEmail });

    if (!pending) {
      return res.status(400).json({
        success: false,
        error: 'No pending registration found for this email address. Please register again.',
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

    pending.verificationCodeHash = hashedCode;
    pending.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pending.save();

    const { sendRegistrationVerificationEmail } = require('../services/invoice-email.service');
    await sendRegistrationVerificationEmail(cleanEmail, verificationCode);

    res.json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
    });
  } catch (error) {
    console.error('Resend Registration Code Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Logout user and invalidate server-side JWT session
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
    }
    res.json({ success: true, message: 'Logged out successfully across all active sessions.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Revoke all active sessions
 * @route   POST /api/auth/revoke-sessions
 * @access  Private
 */
const revokeAllSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
    }
    res.json({ success: true, message: 'All active sessions have been revoked.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  registerUser,
  registerWorkspace,
  verifyWorkspaceRegistration,
  resendRegistrationCode,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword: resetPasswordWithOtp,
  resetPasswordWithOtp,
  googleLogin,
  getGoogleClientId,
  logoutUser,
  revokeAllSessions,
  generateToken,
};
