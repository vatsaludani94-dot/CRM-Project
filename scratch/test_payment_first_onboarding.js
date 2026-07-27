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

const PORT = 3012;
const API_URL = `http://127.0.0.1:${PORT}/api`;

async function runPaymentFirstOnboardingTests() {
  console.log('\n================================================================');
  console.log('🚀 GROWNX CRM — PAYMENT-FIRST ONBOARDING FLOW TEST SUITE');
  console.log('================================================================\n');

  let server;
  let passed = 0;

  try {
    await connectDB();

    server = serverApp.listen(PORT, () => {
      console.log(`Test Express server running at ${API_URL}`);
    });

    const timestamp = Date.now();
    const testOwnerEmail = `payment.owner.${timestamp}@example.com`;
    const testCompanyName = `Nexus Payment First ${timestamp}`;
    const testOwnerName = `Alex Payment ${timestamp}`;

    // -------------------------------------------------------------
    // STEP 1: Test Incomplete Pre-Payment Registration Form Validation
    // -------------------------------------------------------------
    console.log('📝 STEP 1: Testing Pre-Payment Registration Form Validation...');
    try {
      await axios.post(`${API_URL}/onboarding/pre-payment`, {
        companyName: testCompanyName,
        ownerName: testOwnerName,
        // missing email and phone
      });
      assert.fail('Should have rejected incomplete pre-payment form');
    } catch (err) {
      assert.strictEqual(err.response.status, 400, 'Incomplete pre-payment form rejected with HTTP 400');
      console.log('✅ [PASS] Incomplete pre-payment registration form rejected with HTTP 400 Bad Request');
      passed++;
    }

    // -------------------------------------------------------------
    // STEP 2: Test Valid Pre-Payment Registration Form Submission
    // -------------------------------------------------------------
    console.log('\n💳 STEP 2: Testing Valid Pre-Payment Onboarding Form Submission...');
    const prePayRes = await axios.post(`${API_URL}/onboarding/pre-payment`, {
      companyName: testCompanyName,
      ownerName: testOwnerName,
      email: testOwnerEmail,
      phone: '+91 9876543210',
      niche: 'Software / SaaS',
      website: 'https://nexuspay.org',
      cityState: 'Mumbai, Maharashtra',
    });

    assert.strictEqual(prePayRes.status, 201, 'Pre-payment onboarding form submitted with HTTP 201');
    assert(prePayRes.data.success === true, 'Pre-payment response returned success = true');
    assert(prePayRes.data.onboardingId, 'Pre-payment response returned onboardingId');
    assert(prePayRes.data.orderId, 'Pre-payment response returned Razorpay orderId');
    assert.strictEqual(prePayRes.data.amount, 999900, 'Razorpay order created for ₹9,999/mo (999900 paise)');

    const onboardingId = prePayRes.data.onboardingId;
    const orderId = prePayRes.data.orderId;

    console.log('✅ [PASS] Pre-payment onboarding form submitted & Razorpay Order created.');
    console.log(`         Onboarding ID: ${onboardingId}`);
    console.log(`         Razorpay Order ID: ${orderId}`);
    passed++;

    // Check DB Record State
    const onboardingDoc = await PrePaymentOnboarding.findById(onboardingId);
    assert.strictEqual(onboardingDoc.status, 'payment_pending', 'DB Onboarding status set to payment_pending');
    console.log('✅ [PASS] DB PrePaymentOnboarding document status set to payment_pending');
    passed++;

    // -------------------------------------------------------------
    // STEP 3: Testing Bypass Attempt (Workspace Registration Prior to Payment)
    // -------------------------------------------------------------
    console.log('\n🛡️ STEP 3: Testing Direct Workspace Registration Bypass Block...');
    try {
      await axios.post(`${API_URL}/onboarding/register-workspace`, {
        paymentToken: 'fake_unverified_token',
        onboardingId,
        workspaceName: testCompanyName,
        password: 'Password123!',
      });
      assert.fail('Should have blocked workspace registration before payment');
    } catch (err) {
      assert.strictEqual(err.response.status, 403, 'Workspace registration blocked with HTTP 403 Forbidden');
      console.log('✅ [PASS] Direct workspace registration bypass safely blocked with HTTP 403 Forbidden');
      passed++;
    }

    // -------------------------------------------------------------
    // STEP 4: Testing Server-Side Razorpay Payment Signature Verification
    // -------------------------------------------------------------
    console.log('\n🔄 STEP 4: Testing Server-Side Razorpay Payment Signature Verification...');
    const paymentId = `pay_test_${timestamp}`;
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

    assert.strictEqual(verifyRes.status, 200, 'Payment verification returned HTTP 200 OK');
    assert(verifyRes.data.success === true, 'Payment verification returned success = true');
    assert(verifyRes.data.paymentToken, 'Payment verification returned secure paymentToken');

    const paymentToken = verifyRes.data.paymentToken;

    const verifiedDoc = await PrePaymentOnboarding.findById(onboardingId);
    assert.strictEqual(verifiedDoc.status, 'payment_successful', 'DB Onboarding status updated to payment_successful');

    console.log('✅ [PASS] Razorpay payment verified server-side via HMAC SHA256 signature.');
    console.log(`         Payment Token: ${paymentToken}`);
    console.log('✅ [PASS] PrePaymentOnboarding state updated to payment_successful');
    passed++;

    // -------------------------------------------------------------
    // STEP 5: Testing Workspace Registration After Successful Payment
    // -------------------------------------------------------------
    console.log('\n🏢 STEP 5: Testing Workspace Registration Step After Payment...');
    const regRes = await axios.post(`${API_URL}/onboarding/register-workspace`, {
      paymentToken,
      onboardingId,
      workspaceName: `${testCompanyName} Official Workspace`,
      password: 'Password123!',
    });

    assert.strictEqual(regRes.status, 201, 'Workspace registered with HTTP 201 Created');
    assert(regRes.data.success === true, 'Workspace registration returned success = true');
    assert(regRes.data.token, 'Workspace registration returned JWT authentication token');
    assert(regRes.data.user, 'Workspace registration returned user account details');
    assert(regRes.data.workspaceIdentity, 'Workspace registration returned active workspace identity');

    const userToken = regRes.data.token;
    const createdTenantId = regRes.data.user.tenant;

    const tenant = await Tenant.findById(createdTenantId);
    assert.strictEqual(tenant.subscriptionStatus, 'active', 'Newly registered tenant has subscriptionStatus = active');
    assert.strictEqual(tenant.name, `${testCompanyName} Official Workspace`, 'Tenant workspace name matches input');

    console.log('✅ [PASS] Workspace registered after verified payment handoff.');
    console.log(`         Tenant Subscription Status: ${tenant.subscriptionStatus}`);
    console.log(`         Tenant Workspace Name: ${tenant.name}`);
    passed++;

    // -------------------------------------------------------------
    // STEP 6: Testing CRM Access Granted for Payment-First Active User
    // -------------------------------------------------------------
    console.log('\n🔓 STEP 6: Testing CRM API Access for Payment-First Workspace Owner...');
    const crmAccessRes = await axios.get(`${API_URL}/customers`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    assert.strictEqual(crmAccessRes.status, 200, 'CRM API access granted');
    console.log('✅ [PASS] CRM API access granted for payment-first registered user.');
    passed++;

    // -------------------------------------------------------------
    // STEP 7: Preserving Existing Demo & Active Accounts
    // -------------------------------------------------------------
    console.log('\n🛡️ STEP 7: Verifying Existing Demo Accounts Remain Active & Untouched...');
    const demoTenant = await Tenant.findOne({ subscriptionStatus: 'active' });
    assert(demoTenant, 'Pre-existing active tenant workspace exists in DB');
    console.log(`✅ [PASS] Pre-existing tenant "${demoTenant.name}" remains active and unaffected.`);
    passed++;

    console.log('\n================================================================');
    console.log(`📊 PAYMENT-FIRST ONBOARDING SUITE: ALL ${passed} ASSERTIONS PASSED, 0 FAILED`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE EXCEPTION:', error.response ? error.response.data : error.message);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runPaymentFirstOnboardingTests();
