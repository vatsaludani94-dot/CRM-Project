const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Activity = require('../models/Activity');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'nexus_secret_key_jwt_authentication_2026', {
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
  const { name, email, picture, googleToken } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, error: 'Google email is required' });
    }

    let user = await User.findOne({ email });

    // Auto-register user if logging in via Google for the first time
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        password: `GoogleAuth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        role: 'employee',
        profilePicture: picture || '',
      });
    }

    await Activity.create({
      user: user._id,
      action: 'User Google OAuth Login',
      details: `User ${user.name} logged in via Google OAuth.`,
      module: 'Authentication',
      ipAddress: req.ip,
    });

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
    console.error('Google OAuth Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword: resetPasswordWithOtp,
  resetPasswordWithOtp,
  googleLogin,
};
