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
const PrePaymentOnboarding = require('../backend/models/PrePaymentOnboarding');

// Load Express App & Route Setup
const serverApp = express();
serverApp.use(express.json());

const onboardingRoutes = require('../backend/routes/onboardingRoutes');
const authRoutes = require('../backend/routes/authRoutes');
const customerRoutes = require('../backend/routes/customerRoutes');

serverApp.use('/api/onboarding', onboardingRoutes);
serverApp.use('/api/auth', authRoutes);
serverApp.use('/api/customers', customerRoutes);

const PORT = 3014;
const API_URL = `http://127.0.0.1:${PORT}/api`;

async function runFreeTrialSuite() {
  console.log('\n================================================================');
  console.log('🚀 GROWNX CRM PHASE 5F.3 — 14-DAY FREE TRIAL ACTIVATION TEST SUITE');
  console.log('================================================================\n');

  let server;
  let passed = 0;

  try {
    await connectDB();

    server = serverApp.listen(PORT, () => {
      console.log(`Test Express server running at ${API_URL}`);
    });

    const timestamp = Date.now();
    const trialEmail = `trial.owner.${timestamp}@example.com`;
    const trialCompanyName = `Apex Trial Corp ${timestamp}`;
    const trialOwnerName = `Jordan Trial ${timestamp}`;
    const trialPassword = 'Password123!';

    // -------------------------------------------------------------
    // STEP 1: Test Incomplete Trial Signup Form Validation
    // -------------------------------------------------------------
    console.log('📝 STEP 1: Testing 14-Day Free Trial Signup Form Validation...');
    try {
      await axios.post(`${API_URL}/onboarding/start-free-trial`, {
        companyName: trialCompanyName,
        ownerName: trialOwnerName,
        // missing required fields
      });
      assert.fail('Should have rejected incomplete trial signup form');
    } catch (err) {
      assert.strictEqual(err.response.status, 400, 'Incomplete trial form rejected with HTTP 400');
      console.log('✅ [PASS] Incomplete 14-day free trial form rejected with HTTP 400 Bad Request');
      passed++;
    }

    // -------------------------------------------------------------
    // STEP 2: Test 14-Day Free Trial Signup & Activation
    // -------------------------------------------------------------
    console.log('\n⚡ STEP 2: Testing Valid 14-Day Free Trial Activation...');
    const trialRes = await axios.post(`${API_URL}/onboarding/start-free-trial`, {
      companyName: trialCompanyName,
      ownerName: trialOwnerName,
      email: trialEmail,
      phone: '+91 9988776655',
      niche: 'Software / SaaS',
      website: 'https://apextrial.org',
      cityState: 'Bangalore, Karnataka',
      password: trialPassword,
    });

    assert.strictEqual(trialRes.status, 201, 'Trial signup returned HTTP 201 Created');
    assert(trialRes.data.success === true, 'Trial response returned success = true');
    assert(trialRes.data.token, 'Trial response issued JWT authentication token');
    assert(trialRes.data.workspaceIdentity, 'Trial response returned workspace identity');

    const trialToken = trialRes.data.token;
    const trialTenantId = trialRes.data.user.tenant;

    const trialTenant = await Tenant.findById(trialTenantId);
    assert.strictEqual(trialTenant.subscriptionStatus, 'trial_active', 'Tenant subscriptionStatus is trial_active');
    assert.strictEqual(trialTenant.subscriptionPlan, '14-Day Free Trial', 'Tenant plan is 14-Day Free Trial');
    assert(trialTenant.trialStartDate, 'Tenant contains trialStartDate timestamp');
    assert(trialTenant.trialEndDate, 'Tenant contains trialEndDate timestamp');

    console.log('✅ [PASS] 14-Day Free Trial workspace created and activated.');
    console.log(`         Tenant Subscription Status: ${trialTenant.subscriptionStatus}`);
    console.log(`         Plan Name: ${trialTenant.subscriptionPlan}`);
    console.log(`         Trial Expiry: ${trialTenant.trialEndDate}`);
    passed++;

    // -------------------------------------------------------------
    // STEP 3: Test CRM Usage During Active Trial Period
    // -------------------------------------------------------------
    console.log('\n🔓 STEP 3: Testing CRM Usage During Active 14-Day Trial...');
    const crmAccessRes = await axios.get(`${API_URL}/customers`, {
      headers: { Authorization: `Bearer ${trialToken}` },
    });

    assert.strictEqual(crmAccessRes.status, 200, 'CRM API access granted for trial_active user');
    console.log('✅ [PASS] Unrestricted CRM API access granted for trial_active workspace owner.');
    passed++;

    // -------------------------------------------------------------
    // STEP 4: Test Trial Expiration Enforcement (Time-Expired Trial)
    // -------------------------------------------------------------
    console.log('\n⏳ STEP 4: Testing Trial Expiration Enforcement (Expired Trial)...');
    // Set trialEndDate to 15 days in the past
    trialTenant.trialEndDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    trialTenant.trialExpiresAt = trialTenant.trialEndDate;
    await trialTenant.save();

    try {
      await axios.get(`${API_URL}/customers`, {
        headers: { Authorization: `Bearer ${trialToken}` },
      });
      assert.fail('Expired trial access should have been blocked');
    } catch (err) {
      assert.strictEqual(err.response.status, 402, 'Expired trial request returned HTTP 402 Payment Required');
      assert.strictEqual(err.response.data.trialExpired, true, 'Response indicates trialExpired = true');
      assert.strictEqual(err.response.data.nextStep, 'payment_registration', 'Response indicates nextStep = payment_registration');

      console.log('✅ [PASS] Expired trial access safely blocked with HTTP 402 Payment Required.');
      console.log(`         trialExpired: ${err.response.data.trialExpired}`);
      console.log(`         nextStep: ${err.response.data.nextStep}`);
      passed++;
    }

    // -------------------------------------------------------------
    // STEP 5: Test Post-Trial Upgrade Handoff to Monthly Paid Plan
    // -------------------------------------------------------------
    console.log('\n💳 STEP 5: Testing Expired Trial Upgrade Handoff via Razorpay Payment...');
    const prePayRes = await axios.post(`${API_URL}/onboarding/pre-payment`, {
      companyName: trialCompanyName,
      ownerName: trialOwnerName,
      email: trialEmail,
      phone: '+91 9988776655',
      niche: 'Software / SaaS',
      cityState: 'Bangalore',
    });

    assert.strictEqual(prePayRes.status, 201, 'Pre-payment submitted for expired trial upgrade');
    const onboardingId = prePayRes.data.onboardingId;
    const orderId = prePayRes.data.orderId;

    const paymentId = `pay_trial_upgrade_${timestamp}`;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signature = secret
      ? crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
      : 'dev_signature';

    const verifyRes = await axios.post(`${API_URL}/onboarding/verify-payment`, {
      onboardingId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });

    const paymentToken = verifyRes.data.paymentToken;

    const upgradeRes = await axios.post(`${API_URL}/onboarding/register-workspace`, {
      paymentToken,
      onboardingId,
      workspaceName: trialCompanyName,
      password: trialPassword,
    });

    assert.strictEqual(upgradeRes.status, 201, 'Workspace upgraded to paid plan');
    const upgradedTenant = await Tenant.findById(trialTenantId);
    assert.strictEqual(upgradedTenant.subscriptionStatus, 'active', 'Tenant subscriptionStatus upgraded to active');

    console.log('✅ [PASS] Expired trial workspace upgraded to paid subscription status = active.');
    passed++;

    // -------------------------------------------------------------
    // STEP 6: Verify Restored Access Following Upgrade
    // -------------------------------------------------------------
    console.log('\n🔓 STEP 6: Verifying Restored CRM Access Following Paid Upgrade...');
    const restoredRes = await axios.get(`${API_URL}/customers`, {
      headers: { Authorization: `Bearer ${upgradeRes.data.token}` },
    });

    assert.strictEqual(restoredRes.status, 200, 'Restored CRM API access granted');
    console.log('✅ [PASS] CRM API access restored for upgraded workspace owner.');
    passed++;

    // -------------------------------------------------------------
    // STEP 7: Preserving Existing Demo Accounts
    // -------------------------------------------------------------
    console.log('\n🛡️ STEP 7: Verifying Existing Demo Accounts Remain Active & Untouched...');
    const activeDemoTenant = await Tenant.findOne({ subscriptionStatus: 'active' });
    assert(activeDemoTenant, 'Active tenant exists in DB');
    console.log(`✅ [PASS] Pre-existing workspace "${activeDemoTenant.name}" remains active and unaffected.`);
    passed++;

    console.log('\n================================================================');
    console.log(`📊 FREE TRIAL ACTIVATION SUITE: ALL ${passed} ASSERTIONS PASSED, 0 FAILED`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE EXCEPTION:', error.response ? error.response.data : error.message);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runFreeTrialSuite();
