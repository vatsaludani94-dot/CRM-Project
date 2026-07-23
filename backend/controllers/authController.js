const User = require('../models/User');
const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');
const Activity = require('../models/Activity');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
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

    // Role safety: Only super_admin can register managers/super_admins.
    // If request has no auth (initial setup) or caller is admin, allow it.
    // Otherwise default to 'customer' or 'employee' depending on signup details.
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
      // Log activity
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
          token: generateToken(user._id),
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

      // Log activity
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
          token: generateToken(user._id),
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
    const user = await User.findById(req.user._id);
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
 * @desc    Forgot Password (Generates 6-digit OTP & sends email)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account registered with this email address' });
    }

    // Generate 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP and 10 minute expiration
    user.resetPasswordOtp = otpCode;
    user.resetPasswordOtpExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send email via Nodemailer
    const { sendOtpEmail } = require('../services/invoice-email.service');
    await sendOtpEmail(user.email, otpCode);

    res.json({
      success: true,
      message: `A 6-digit verification OTP has been sent to ${user.email}. Please enter it to reset your password.`,
      email: user.email,
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Verify OTP and Reset Password
 * @route   POST /api/auth/reset-password-otp
 * @access  Public
 */
const resetPasswordWithOtp = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordOtpExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code. Please request a new OTP.' });
    }

    // Update password and clear OTP
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpire = undefined;
    await user.save();

    await Activity.create({
      user: user._id,
      action: 'Password Reset via Email OTP',
      details: `User ${user.name} successfully reset password using 6-digit email OTP.`,
      module: 'Authentication',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Password updated successfully! You can now log in.' });
  } catch (error) {
    console.error('Reset Password OTP Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Google OAuth Sign-In / Sign-Up
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleLogin = async (req, res) => {
  const { googleToken } = req.body;

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
    const { sub: googleSubjectId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Google email address could not be resolved from token payload.' });
    }

    // 1. Check if user already exists by googleSubjectId (Centralized authentication key)
    let user = await User.findOne({ googleSubjectId });

    // 2. Check if user exists by email and map googleSubjectId to it (link accounts)
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.googleSubjectId = googleSubjectId;
        if (!user.profilePicture && picture) {
          user.profilePicture = picture;
        }
        await user.save();
      }
    }

    // 3. Register user if this is a first-time sign-up via Google
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

    // Check account status
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
        token: generateToken(user._id),
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
 * @desc    Register a new workspace (Tenant) & Workspace Owner
 * @route   POST /api/auth/register-workspace
 * @access  Public
 */
const registerWorkspace = async (req, res) => {
  const { companyName, name, email, password } = req.body;

  try {
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

    // 1. Check if user already exists with this email
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email address',
      });
    }

    // 2. Generate clean subdomain from companyName
    let baseSubdomain = companyName
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

    // 3. Create Tenant
    let tenant;
    try {
      tenant = await Tenant.create({
        name: companyName,
        subdomain,
        plan: 'free',
        status: 'active',
      });
    } catch (err) {
      if (err.code === 11000) {
        subdomain = `${baseSubdomain}${Math.floor(10000 + Math.random() * 90000)}`;
        tenant = await Tenant.create({
          name: companyName,
          subdomain,
          plan: 'free',
          status: 'active',
        });
      } else {
        throw err;
      }
    }

    // 4. Create User as workspace_owner
    let user;
    try {
      user = await User.create({
        name,
        email,
        password,
        role: 'workspace_owner',
        department: 'Management',
        status: 'active',
        tenant: tenant._id,
      });
    } catch (userErr) {
      console.error('User creation failed during workspace registration. Rolling back Tenant:', userErr.message);
      await Tenant.findByIdAndDelete(tenant._id);
      throw userErr;
    }

    // 5. Link Tenant owner to User
    tenant.owner = user._id;
    await tenant.save();

    // 6. Log Activity
    await Activity.create({
      user: user._id,
      action: 'Workspace Registered',
      details: `Workspace "${tenant.name}" (${tenant.subdomain}) created with Owner ${user.name} (${user.email}).`,
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
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          plan: tenant.plan,
        },
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error('Workspace Registration Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  registerUser,
  registerWorkspace,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword: resetPasswordWithOtp,
  resetPasswordWithOtp,
  googleLogin,
  getGoogleClientId,
};
