const PrePaymentOnboarding = require('../models/PrePaymentOnboarding');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Activity = require('../models/Activity');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getWorkspaceIdentity } = require('../utils/tenantScope');

// Initialize Razorpay instance if keys are configured
const getRazorpayInstance = () => {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return null;
};

// Generate JWT Token helper
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
 * @desc    Submit Pre-Payment Registration Form & Create Razorpay Order
 * @route   POST /api/onboarding/pre-payment
 * @access  Public
 */
const submitPrePayment = async (req, res) => {
  const { companyName, ownerName, email, phone, niche, website, cityState } = req.body;

  if (!companyName || !ownerName || !email || !phone || !niche || !cityState) {
    return res.status(400).json({
      success: false,
      error: 'Please fill all required fields: Company Name, Owner Name, Email, Phone, Niche, and City/State.',
    });
  }

  try {
    // Check if user account already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() }).populate('tenant');
    if (existingUser) {
      const isPending = existingUser.tenant && existingUser.tenant.subscriptionStatus === 'pending_payment';
      if (!isPending) {
        return res.status(400).json({
          success: false,
          error: 'An active account with this email address already exists. Please log in directly.',
        });
      }
    }

    // Create PrePaymentOnboarding record
    const onboarding = await PrePaymentOnboarding.create({
      companyName,
      ownerName,
      email: email.toLowerCase(),
      phone,
      niche,
      website: website || '',
      cityState,
      status: 'pre_payment_registered',
    });

    // Create Razorpay Order for ₹9,999/month (amount: 999900 paise)
    const razorpay = getRazorpayInstance();
    const orderAmount = 999900; // in paise
    let orderId = `order_dev_${Date.now()}`;

    if (razorpay) {
      const options = {
        amount: orderAmount,
        currency: 'INR',
        receipt: `rcpt_onboarding_${onboarding._id}`,
        notes: {
          onboardingId: onboarding._id.toString(),
          email: onboarding.email,
          companyName: onboarding.companyName,
        },
      };
      const order = await razorpay.orders.create(options);
      orderId = order.id;
    }

    onboarding.razorpayOrderId = orderId;
    onboarding.status = 'payment_pending';
    await onboarding.save();

    res.status(201).json({
      success: true,
      message: 'Pre-payment details registered successfully. Proceeding to Razorpay payment.',
      onboardingId: onboarding._id,
      orderId,
      amount: orderAmount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_dev_key_1234567890',
    });
  } catch (error) {
    console.error('Pre-Payment Onboarding Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Verify Razorpay Payment Signature for Onboarding Session
 * @route   POST /api/onboarding/verify-payment
 * @access  Public
 */
const verifyPayment = async (req, res) => {
  const { onboardingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!onboardingId || !razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required payment verification parameters.',
    });
  }

  try {
    const onboarding = await PrePaymentOnboarding.findById(onboardingId);
    if (!onboarding) {
      return res.status(404).json({ success: false, error: 'Onboarding record not found.' });
    }

    // Verify HMAC SHA256 signature if key secret is present
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (razorpayKeySecret && razorpay_signature) {
      const generated_signature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          error: 'Razorpay payment signature verification failed.',
        });
      }
    }

    // Generate secure paymentToken for workspace registration handoff
    const paymentToken = `paytok_${crypto.randomBytes(24).toString('hex')}`;

    onboarding.status = 'payment_successful';
    onboarding.razorpayOrderId = razorpay_order_id;
    onboarding.razorpayPaymentId = razorpay_payment_id;
    onboarding.paymentToken = paymentToken;
    onboarding.paymentVerifiedAt = new Date();
    await onboarding.save();

    res.json({
      success: true,
      message: 'Razorpay payment verified successfully! Please complete workspace registration.',
      paymentToken,
      onboardingId: onboarding._id,
      email: onboarding.email,
      companyName: onboarding.companyName,
      ownerName: onboarding.ownerName,
    });
  } catch (error) {
    console.error('Verify Payment Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Register Workspace After Payment Success
 * @route   POST /api/onboarding/register-workspace
 * @access  Public (Requires Verified Payment Token)
 */
const registerWorkspaceAfterPayment = async (req, res) => {
  const { paymentToken, onboardingId, workspaceName, password } = req.body;

  if (!paymentToken || !onboardingId || !password) {
    return res.status(400).json({
      success: false,
      error: 'Payment token, onboarding ID, and password are required to register your workspace.',
    });
  }

  try {
    const onboarding = await PrePaymentOnboarding.findOne({
      _id: onboardingId,
      paymentToken,
      status: 'payment_successful',
    });

    if (!onboarding) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or unverified payment token. Payment must be completed prior to workspace registration.',
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: onboarding.email }).populate('tenant');
    let tenant;
    const reqWorkspaceName = workspaceName || onboarding.companyName;

    if (user) {
      user.password = password;
      if (user.tenant) {
        tenant = user.tenant;
        tenant.subscriptionStatus = 'active';
        tenant.paidAt = onboarding.paymentVerifiedAt || new Date();
        tenant.razorpayOrderId = onboarding.razorpayOrderId;
        tenant.razorpayPaymentId = onboarding.razorpayPaymentId;
        if (workspaceName) {
          tenant.name = workspaceName;
          tenant.workspaceName = workspaceName;
        }
        await tenant.save();
      } else {
        tenant = await Tenant.create({
          name: reqWorkspaceName,
          workspaceName: reqWorkspaceName,
          owner: user._id,
          subdomain: reqWorkspaceName.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.floor(1000 + Math.random() * 9000),
          communicationEmail: user.email,
          communicationEmailName: reqWorkspaceName,
          subscriptionStatus: 'active',
          subscriptionPlan: '₹9,999 / Month',
          subscriptionAmount: 9999,
          paidAt: onboarding.paymentVerifiedAt || new Date(),
          razorpayOrderId: onboarding.razorpayOrderId,
          razorpayPaymentId: onboarding.razorpayPaymentId,
        });
        user.tenant = tenant._id;
      }
    } else {
      user = await User.create({
        name: onboarding.ownerName,
        email: onboarding.email,
        password,
        role: 'workspace_owner',
        department: 'Management',
      });

      tenant = await Tenant.create({
        name: reqWorkspaceName,
        workspaceName: reqWorkspaceName,
        owner: user._id,
        subdomain: reqWorkspaceName.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.floor(1000 + Math.random() * 9000),
        communicationEmail: user.email,
        communicationEmailName: reqWorkspaceName,
        communicationEmailStatus: 'unconfigured',
        subscriptionStatus: 'active',
        subscriptionPlan: '₹9,999 / Month',
        subscriptionAmount: 9999,
        paidAt: onboarding.paymentVerifiedAt || new Date(),
        razorpayOrderId: onboarding.razorpayOrderId,
        razorpayPaymentId: onboarding.razorpayPaymentId,
      });
      user.tenant = tenant._id;
    }
    user.purchasedLicenses.push({
      licenseKey: `GXCRM-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      planName: 'GrownX Enterprise Plan',
      amountPaid: 9999,
      paymentId: onboarding.razorpayPaymentId,
      orderId: onboarding.razorpayOrderId,
    });
    await user.save();

    // Mark onboarding as completed
    onboarding.status = 'workspace_registered';
    onboarding.workspaceRegisteredAt = new Date();
    onboarding.createdUserId = user._id;
    onboarding.createdTenantId = tenant._id;
    await onboarding.save();

    await Activity.create({
      user: user._id,
      action: 'Payment-First Workspace Registered',
      details: `User ${user.name} registered workspace "${tenant.name}" following verified Razorpay payment.`,
      module: 'Authentication',
      ipAddress: req.ip,
    });

    const token = generateToken(user);
    const workspaceIdentity = await getWorkspaceIdentity(tenant._id, user);

    res.status(201).json({
      success: true,
      message: 'Workspace registered successfully! Access granted.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: tenant._id,
      },
      workspaceIdentity,
    });
  } catch (error) {
    console.error('Register Workspace After Payment Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  submitPrePayment,
  verifyPayment,
  registerWorkspaceAfterPayment,
};
