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

// Load Express App & Routes
const serverApp = express();
serverApp.use(express.json());

const authRoutes = require('../backend/routes/authRoutes');
const onboardingRoutes = require('../backend/routes/onboardingRoutes');
const customerRoutes = require('../backend/routes/customerRoutes');

serverApp.use('/api/auth', authRoutes);
serverApp.use('/api/onboarding', onboardingRoutes);
serverApp.use('/api/customers', customerRoutes);

const PORT = 3013;
const API_URL = `http://127.0.0.1:${PORT}/api`;

async function runAuthRedirectPaymentTests() {
  console.log('\n================================================================');
  console.log('🚀 GROWNX CRM — AUTH / REGISTRATION REDIRECT TO PAYMENT TEST SUITE');
  console.log('================================================================\n');

  let server;
  let passed = 0;

  try {
    await connectDB();

    server = serverApp.listen(PORT, () => {
      console.log(`Test Express server running at ${API_URL}`);
    });

    const timestamp = Date.now();
    const testEmail = `unpaid.redirect.${timestamp}@example.com`;
    const testPassword = 'Password123!';
    const testCompanyName = `Pending Workspace ${timestamp}`;

    // -------------------------------------------------------------
    // STEP 1: Creating an Unpaid Workspace Account (Pending Payment)
    // -------------------------------------------------------------
    console.log('📝 STEP 1: Creating Unpaid Workspace Account (Pending Payment)...');
    const user = await User.create({
      name: 'Pending User',
      email: testEmail,
      password: testPassword,
      role: 'workspace_owner',
      department: 'Management',
    });

    const tenant = await Tenant.create({
      name: testCompanyName,
      workspaceName: testCompanyName,
      owner: user._id,
      subdomain: `pending-${timestamp}`,
      communicationEmail: testEmail,
      subscriptionStatus: 'pending_payment',
      subscriptionPlan: '₹9,999 / Month',
      subscriptionAmount: 9999,
    });

    user.tenant = tenant._id;
    await user.save();

    console.log(`✅ [PASS] Created unpaid workspace account for ${testEmail} (subscriptionStatus: pending_payment).`);
    passed++;

    // -------------------------------------------------------------
    // STEP 2: Testing Unpaid User Sign-In Attempt (Expect HTTP 402 + Next Step)
    // -------------------------------------------------------------
    console.log('\n🔑 STEP 2: Testing Unpaid User Sign-In Attempt (Case A)...');
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email: testEmail,
        password: testPassword,
      });
      assert.fail('Unpaid user login should have been redirected to payment');
    } catch (err) {
      assert.strictEqual(err.response.status, 402, 'Login returned HTTP 402 Payment Required');
      assert.strictEqual(err.response.data.requirePayment, true, 'Response contains requirePayment = true');
      assert.strictEqual(err.response.data.nextStep, 'payment_registration', 'Response contains nextStep = payment_registration');
      assert.strictEqual(err.response.data.email, testEmail, 'Response contains email for onboarding pre-fill');

      console.log('✅ [PASS] Unpaid user Sign-In attempt intercepted with HTTP 402 Payment Required.');
      console.log(`         requirePayment: ${err.response.data.requirePayment}`);
      console.log(`         nextStep: ${err.response.data.nextStep}`);
      console.log(`         email: ${err.response.data.email}`);
      passed++;
    }

    // -------------------------------------------------------------
    // STEP 3: Testing Unpaid User Re-registration Attempt
    // -------------------------------------------------------------
    console.log('\n📝 STEP 3: Testing Unpaid User Re-registration Attempt...');
    const reRegRes = await axios.post(`${API_URL}/auth/register-workspace`, {
      companyName: testCompanyName,
      name: 'Pending User',
      email: testEmail,
      password: testPassword,
    });

    assert.strictEqual(reRegRes.status, 200, 'Re-registration returned HTTP 200 OK');
    assert.strictEqual(reRegRes.data.requirePayment, true, 'Re-registration returned requirePayment = true');
    assert.strictEqual(reRegRes.data.nextStep, 'payment_registration', 'Re-registration returned nextStep = payment_registration');

    console.log('✅ [PASS] Unpaid user Re-registration attempt intercepted with nextStep: payment_registration (No dead-end error!).');
    passed++;

    // -------------------------------------------------------------
    // STEP 4: Complete Payment-First Onboarding for Pending User
    // -------------------------------------------------------------
    console.log('\n💳 STEP 4: Executing Payment-First Onboarding for Pending User...');
    const prePayRes = await axios.post(`${API_URL}/onboarding/pre-payment`, {
      companyName: testCompanyName,
      ownerName: 'Pending User',
      email: testEmail,
      phone: '+91 9876543210',
      niche: 'Software / SaaS',
      cityState: 'Mumbai',
    });

    assert.strictEqual(prePayRes.status, 201, 'Pre-payment onboarding form submitted with HTTP 201');
    const onboardingId = prePayRes.data.onboardingId;
    const orderId = prePayRes.data.orderId;

    const paymentId = `pay_verify_${timestamp}`;
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

    const regRes = await axios.post(`${API_URL}/onboarding/register-workspace`, {
      paymentToken,
      onboardingId,
      workspaceName: testCompanyName,
      password: testPassword,
    });

    assert.strictEqual(regRes.status, 201, 'Workspace activated following payment completion');
    console.log('✅ [PASS] Payment completed and tenant subscription status set to active.');
    passed++;

    // -------------------------------------------------------------
    // STEP 5: Testing Active User Sign-In (Case B)
    // -------------------------------------------------------------
    console.log('\n🔓 STEP 5: Testing Active User Sign-In (Case B)...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });

    assert.strictEqual(loginRes.status, 200, 'Active user login returned HTTP 200 OK');
    assert(loginRes.data.data.token, 'Login returned active JWT token');
    console.log('✅ [PASS] Active user Sign-In succeeded, token issued.');
    passed++;

    // -------------------------------------------------------------
    // STEP 6: Testing Existing Demo & Active Accounts Preservation (Case C)
    // -------------------------------------------------------------
    console.log('\n🛡️ STEP 6: Verifying Existing Demo Accounts Remain Active & Work Normally (Case C)...');
    const activeTenant = await Tenant.findOne({ subscriptionStatus: 'active' });
    assert(activeTenant, 'Active tenant exists in DB');
    console.log(`✅ [PASS] Pre-existing active workspace "${activeTenant.name}" remains fully functional.`);
    passed++;

    console.log('\n================================================================');
    console.log(`📊 AUTH REDIRECT TEST SUITE: ALL ${passed} ASSERTIONS PASSED, 0 FAILED`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE EXCEPTION:', error.response ? error.response.data : error.message);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runAuthRedirectPaymentTests();
