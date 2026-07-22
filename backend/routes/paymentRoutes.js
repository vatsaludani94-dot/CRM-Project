const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Razorpay = require('razorpay');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/authMiddleware');
const { sendCustomerInvoiceEmail, sendOwnerSalesAlertEmail } = require('../services/invoice-email.service');

// Initialize Razorpay instance if keys are provided
const getRazorpayInstance = () => {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return null;
};

/**
 * @desc    Create Razorpay Order / Payment Checkout Session
 * @route   POST /api/payments/create-order
 * @access  Private
 */
router.post('/create-order', protect, async (req, res) => {
  const { planName, amount } = req.body;

  try {
    const razorpay = getRazorpayInstance();
    const orderAmount = (amount || 49) * 100; // in paise

    if (razorpay) {
      const options = {
        amount: orderAmount,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      };
      const order = await razorpay.orders.create(options);
      return res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      });
    }

    // Dev Fallback order generation
    const devOrderId = `order_dev_${Date.now()}`;
    res.json({
      success: true,
      orderId: devOrderId,
      amount: orderAmount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_dev_key_1234567890',
    });
  } catch (error) {
    console.error('Payment Order Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Verify Payment Signature, Issue License & Trigger Dual Invoices
 * @route   POST /api/payments/verify
 * @access  Private
 */
router.post('/verify', protect, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName, amount } = req.body;

  try {
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    // Verify signature if live keys configured
    if (razorpayKeySecret && razorpay_signature) {
      const generated_signature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Payment verification signature invalid' });
      }
    }

    // Generate unique 16-character license key
    const licenseKey = `GXCRM-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const paymentId = razorpay_payment_id || `pay_dev_${Date.now()}`;

    // Add license record to user account
    const user = await User.findById(req.user._id);
    user.purchasedLicenses.push({
      licenseKey,
      planName: planName || 'GrownX Enterprise Plan',
      amountPaid: amount || 49,
      paymentId,
      orderId: razorpay_order_id || 'order_dev',
    });
    await user.save();

    // Log Activity
    await Activity.create({
      user: user._id,
      action: 'Software License Purchased',
      details: `Purchased ${planName} for ₹${amount}. License Key: ${licenseKey}`,
      module: 'Billing',
      ipAddress: req.ip,
    });

    // 1. Send Customer Invoice Email
    sendCustomerInvoiceEmail({
      email: user.email,
      name: user.name,
      planName: planName || 'GrownX Enterprise Plan',
      amount: amount || 49,
      currency: 'INR',
      paymentId,
      licenseKey,
    }).catch((e) => console.error('Customer Invoice Email Error:', e.message));

    // 2. Send Owner Sales Notification Email to vatsaludani94@gmail.com
    sendOwnerSalesAlertEmail({
      buyerName: user.name,
      buyerEmail: user.email,
      planName: planName || 'GrownX Enterprise Plan',
      amount: amount || 49,
      currency: 'INR',
      paymentId,
      licenseKey,
    }).catch((e) => console.error('Owner Alert Email Error:', e.message));

    res.json({
      success: true,
      message: 'Payment verified successfully! Your purchase invoice and license key have been emailed to you.',
      data: {
        licenseKey,
        paymentId,
        downloadUrl: '/api/payments/download-installer',
      },
    });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Secure Download Endpoint for Verified License Holders
 * @route   GET /api/payments/download-installer
 * @access  Private
 */
router.get('/download-installer', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Verify user has purchased at least one license
    if (!user.purchasedLicenses || user.purchasedLicenses.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Active software purchase required to download the installer package.',
      });
    }

    // Path to software package ZIP
    const packagePath = path.join(__dirname, '../public/downloads/GrownX-CRM-Standalone-Package.zip');

    // If physical ZIP exists, serve it; otherwise serve generated setup package descriptor
    if (fs.existsSync(packagePath)) {
      return res.download(packagePath, 'GrownX-CRM-Standalone-Package.zip');
    }

    // Fallback: Send dynamic installer package manifest file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="GrownX-CRM-License-Installer-Package.json"');
    res.send(
      JSON.stringify(
        {
          software: 'GrownX CRM Standalone Enterprise Suite',
          version: 'v2.4.0-Production',
          licenseHolder: user.name,
          licenseEmail: user.email,
          activeLicenses: user.purchasedLicenses,
          installationInstructions: [
            '1. Extract this package to your server or local desktop directory.',
            '2. Run "npm install" or double-click "GrownX-CRM-Launcher.exe".',
            '3. Enter your assigned License Key upon first launch.',
          ],
        },
        null,
        2
      )
    );
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Razorpay Webhook Handler
 * @route   POST /api/payments/webhook
 * @access  Public (Signature Verified)
 */
router.post('/webhook', async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here';

  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ success: false, error: 'Signature header missing' });
    }

    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      return res.status(400).json({ success: false, error: 'Webhook signature verification failed' });
    }

    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload.payment.entity;
      const email = paymentEntity.email;
      const amount = paymentEntity.amount / 100;
      const paymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const planName = paymentEntity.notes?.planName || 'GrownX Enterprise Plan';

      const user = await User.findOne({ email });
      if (user) {
        const exists = user.purchasedLicenses.some(lic => lic.paymentId === paymentId);
        if (!exists) {
          const licenseKey = `GXCRM-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
          user.purchasedLicenses.push({
            licenseKey,
            planName,
            amountPaid: amount,
            paymentId,
            orderId,
          });
          await user.save();

          await Activity.create({
            user: user._id,
            action: 'Software License Purchased (Webhook)',
            details: `Webhook payment captured: ₹${amount} for ${planName}. License: ${licenseKey}`,
            module: 'Billing',
            ipAddress: req.ip,
          });

          sendCustomerInvoiceEmail({
            email: user.email,
            name: user.name,
            planName,
            amount,
            currency: 'INR',
            paymentId,
            licenseKey,
          }).catch((e) => console.error('Customer Invoice Email Webhook Error:', e.message));

          sendOwnerSalesAlertEmail({
            buyerName: user.name,
            buyerEmail: user.email,
            planName,
            amount,
            currency: 'INR',
            paymentId,
            licenseKey,
          }).catch((e) => console.error('Owner Alert Email Webhook Error:', e.message));
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
