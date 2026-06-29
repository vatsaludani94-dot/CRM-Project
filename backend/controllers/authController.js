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
 * @desc    Forgot Password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account registered with this email' });
    }

    // Mock reset token generation
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'nexus_secret_key_jwt_authentication_2026', {
      expiresIn: '1h',
    });

    // In production, send email here. In development, we return it in API response for easy testing.
    res.json({
      success: true,
      message: 'Password reset link generated. Check the response payload.',
      resetLink: `/reset-password?token=${resetToken}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexus_secret_key_jwt_authentication_2026');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid token or user does not exist' });
    }

    user.password = newPassword;
    await user.save();

    await Activity.create({
      user: user._id,
      action: 'Password Reset',
      details: `User ${user.name} reset their account password.`,
      module: 'Authentication',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Password has been updated successfully.' });
  } catch (error) {
    console.error('Password Reset Error:', error.message);
    res.status(400).json({ success: false, error: 'Invalid or expired token' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword,
};
