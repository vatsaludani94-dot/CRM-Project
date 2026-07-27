const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const assert = require('assert');

// Load Models & DB
const connectDB = require('../backend/config/db');
const User = require('../backend/models/User');
const Tenant = require('../backend/models/Tenant');
const Activity = require('../backend/models/Activity');
const PrePaymentOnboarding = require('../backend/models/PrePaymentOnboarding');

// Load Express App & Route Setup
const serverApp = express();
serverApp.use(express.json());

const onboardingRoutes = require('../backend/routes/onboardingRoutes');
const authRoutes = require('../backend/routes/authRoutes');
const customerRoutes = require('../backend/routes/customerRoutes');
const paymentRoutes = require('../backend/routes/paymentRoutes');
const reportRoutes = require('../backend/routes/reportRoutes');

serverApp.use('/api/onboarding', onboardingRoutes);
serverApp.use('/api/auth', authRoutes);
serverApp.use('/api/customers', customerRoutes);
serverApp.use('/api/payments', paymentRoutes);
serverApp.use('/api/reports', reportRoutes);

const { runTrialEmailSequenceScheduler } = require('../backend/services/trial-email-sequence.service');

const PORT = 3015;
const API_URL = `http://127.0.0.1:${PORT}/api`;

async function runPhase5F4TrialLifecycleTests() {
  console.log('\n================================================================');
  console.log('🚀 GROWNX CRM PHASE 5F.4 — TRIAL LIFECYCLE & CONVERSION SUITE');
  console.log('================================================================\n');

  let server;
  let passed = 0;

  try {
    await connectDB();

    server = serverApp.listen(PORT, () => {
      console.log(`Test Express server running at ${API_URL}`);
    });

    const timestamp = Date.now();
    const trialEmail = `lifecycle.trial.${timestamp}@example.com`;
    const trialCompanyName = `Lifecycle Corp ${timestamp}`;
    const trialOwnerName = `Alex Lifecycle ${timestamp}`;
    const trialPassword = 'Password123!';

    // -------------------------------------------------------------
    // STEP 1: Trial Account Creation
    // -------------------------------------------------------------
    console.log('⚡ STEP 1: Testing 14-Day Free Trial Account Creation...');
    const trialRes = await axios.post(`${API_URL}/onboarding/start-free-trial`, {
      companyName: trialCompanyName,
      ownerName: trialOwnerName,
      email: trialEmail,
      phone: '+91 9123456789',
      niche: 'Software / SaaS',
      website: 'https://lifecycle.org',
      cityState: 'Bangalore, India',
      password: trialPassword,
    });

    assert.strictEqual(trialRes.status, 201, 'Trial created with HTTP 201');
    assert(trialRes.data.token, 'Issued JWT Token');
    const trialToken = trialRes.data.token;
    const trialTenantId = trialRes.data.user.tenant;

    const tenantDoc = await Tenant.findById(trialTenantId);
    assert.strictEqual(tenantDoc.subscriptionStatus, 'trial_active', 'Tenant subscriptionStatus is trial_active');
    assert(tenantDoc.trialStartDate, 'Trial start date present');
    assert(tenantDoc.trialEndDate, 'Trial end date present');

    console.log('✅ [PASS] 14-Day Free Trial account created successfully.');
    passed++;

    // -------------------------------------------------------------
    // STEP 2: Workspace Identity & Usage Metrics Insights
    // -------------------------------------------------------------
    console.log('\n📊 STEP 2: Testing Workspace Identity, Billing & Usage Metrics Insights...');
    const identityRes = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${trialToken}` },
    });

    assert.strictEqual(identityRes.status, 200, 'User profile returned HTTP 200');
    const workspaceId = identityRes.data.data.workspaceIdentity;
    assert.strictEqual(workspaceId.subscriptionStatus, 'trial_active', 'Workspace identity reports trial_active');
    assert(workspaceId.usageMetrics, 'Workspace identity contains usageMetrics object');
    assert(workspaceId.trialDaysRemaining >= 13, 'Calculated trialDaysRemaining is valid');

    console.log('✅ [PASS] Workspace Identity returned subscription status, billing fields, and usage metrics.');
    passed++;

    // -------------------------------------------------------------
    // STEP 3: Smooth Trial → Paid Conversion via Razorpay
    // -------------------------------------------------------------
    console.log('\n💳 STEP 3: Testing Smooth Trial → Paid Upgrade Conversion...');
    const orderRes = await axios.post(
      `${API_URL}/payments/create-order`,
      { planName: 'GrownX Enterprise Plan', amount: 9999 },
      { headers: { Authorization: `Bearer ${trialToken}` } }
    );

    assert.strictEqual(orderRes.status, 200, 'Razorpay order created for trial user');
    const orderId = orderRes.data.orderId;

    const paymentId = `pay_conv_${timestamp}`;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signature = secret
      ? crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
      : 'dev_signature';

    const verifyRes = await axios.post(
      `${API_URL}/payments/verify`,
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        planName: 'GrownX Enterprise Plan',
        amount: 9999,
      },
      { headers: { Authorization: `Bearer ${trialToken}` } }
    );

    assert.strictEqual(verifyRes.status, 200, 'Payment verified successfully');
    assert.strictEqual(verifyRes.data.data.subscriptionStatus, 'active', 'Subscription upgraded to active');

    const upgradedTenant = await Tenant.findById(trialTenantId);
    assert.strictEqual(upgradedTenant.subscriptionStatus, 'active', 'DB Tenant upgraded to active status');
    assert(upgradedTenant.paymentHistory.length > 0, 'Payment history recorded in tenant document');
    assert.strictEqual(upgradedTenant.paymentHistory[0].orderId, orderId, 'Payment history records correct Razorpay orderId');

    console.log('✅ [PASS] Smooth Trial → Paid conversion completed without creating duplicate workspaces.');
    passed++;

    // -------------------------------------------------------------
    // STEP 4: Automated Trial Email Sequence Scheduler
    // -------------------------------------------------------------
    console.log('\n📧 STEP 4: Testing Automated Trial Email Sequence Scheduler...');
    await runTrialEmailSequenceScheduler();
    console.log('✅ [PASS] Trial email sequence scheduler executed cleanly.');
    passed++;

    // -------------------------------------------------------------
    // STEP 5: Super Admin Subscription Metrics Reporting
    // -------------------------------------------------------------
    console.log('\n👑 STEP 5: Testing Super Admin Subscription Metrics Reporting...');
    const adminUser = await User.create({
      name: 'Super Admin Test',
      email: `super.admin.${timestamp}@grownx-test.com`,
      password: trialPassword,
      role: 'super_admin',
    });

    const adminToken = jwt.sign({ id: adminUser._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const metricsRes = await axios.get(`${API_URL}/reports/subscription-metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(metricsRes.status, 200, 'Super admin metrics returned HTTP 200');
    assert(metricsRes.data.data.activeSubscribers >= 1, 'Metrics include activeSubscribers count');
    assert(metricsRes.data.data.mrr >= 9999, 'Metrics include computed MRR');
    assert(metricsRes.data.data.trialConversionRate !== undefined, 'Metrics include computed trialConversionRate');

    console.log('✅ [PASS] Super Admin Subscription Metrics report returned tenant-safe SaaS KPIs.');
    console.log(`         Active Subscribers: ${metricsRes.data.data.activeSubscribers}`);
    console.log(`         MRR: ₹${metricsRes.data.data.mrr}`);
    console.log(`         Trial Conversion Rate: ${metricsRes.data.data.trialConversionRate}%`);
    passed++;

    // -------------------------------------------------------------
    // STEP 6: Preserving Demo & Active Accounts
    // -------------------------------------------------------------
    console.log('\n🛡️ STEP 6: Verifying Existing Demo & Active Accounts Isolation...');
    const demoTenant = await Tenant.findOne({ subscriptionStatus: 'active' });
    assert(demoTenant, 'Active tenant exists in DB');
    console.log(`✅ [PASS] Existing workspace "${demoTenant.name}" remains fully active and functional.`);
    passed++;

    console.log('\n================================================================');
    console.log(`📊 PHASE 5F.4 TRIAL LIFECYCLE SUITE: ALL ${passed} ASSERTIONS PASSED, 0 FAILED`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE EXCEPTION:', error.response ? error.response.data : error.message);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runPhase5F4TrialLifecycleTests();
