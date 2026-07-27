const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Load Models & DB
const connectDB = require('../backend/config/db');
const User = require('../backend/models/User');
const Tenant = require('../backend/models/Tenant');
const PendingRegistration = require('../backend/models/PendingRegistration');

// Express App setup
const app = express();
app.use(express.json());

// Routes
const authRoutes = require('../backend/routes/authRoutes');
const paymentRoutes = require('../backend/routes/paymentRoutes');
const leadRoutes = require('../backend/routes/leadRoutes');
const customerRoutes = require('../backend/routes/customerRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/customers', customerRoutes);

const PORT = 3009;
const API_URL = `http://127.0.0.1:${PORT}/api`;

async function runTests() {
  console.log('================================================================');
  console.log('🚀 GROWNX CRM — PRICING & RAZORPAY SUBSCRIPTION FLOW SUITE');
  console.log('================================================================\n');

  let server;

  try {
    await connectDB();
    
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test_jwt_secret_key_32_bytes_long_xxxx';
    }

    // Start Express server on PORT 3009
    server = app.listen(PORT);
    console.log(`Test Express server running at ${API_URL}`);

    let passedCount = 0;
    let failedCount = 0;

    function assert(condition, message) {
      if (condition) {
        console.log(`✅ [PASS] ${message}`);
        passedCount++;
      } else {
        console.log(`❌ [FAIL] ${message}`);
        failedCount++;
      }
    }

    console.log('\n🔑 STEP 1: Testing Pre-Existing Demo Accounts Access Preservation...');
    const demoOwner = await User.findOne({ email: 'admin@grownx.com' }).populate('tenant');
    if (demoOwner && demoOwner.tenant) {
      const demoTenant = await Tenant.findById(demoOwner.tenant._id);
      console.log(`   - Pre-existing demo tenant subscriptionStatus: ${demoTenant.subscriptionStatus || 'active'}`);
      
      const demoToken = jwt.sign({ id: demoOwner._id, tokenVersion: demoOwner.tokenVersion || 0 }, process.env.JWT_SECRET);
      
      try {
        const resLeads = await axios.get(`${API_URL}/leads`, {
          headers: { Authorization: `Bearer ${demoToken}` }
        });
        assert(resLeads.status === 200, 'Pre-existing demo account retained full CRM access without forced payment.');
      } catch (err) {
        assert(false, `Demo account access blocked: ${err.message}`);
      }
    } else {
      console.log('⚠️ [SKIP] Demo account admin@grownx.com not found in DB.');
    }

    console.log('\n📝 STEP 2: Testing New User Workspace Registration (Pending Payment)...');
    const testCompany = `Test Enterprise ${Date.now()}`;
    const testEmail = `direct_owner_${Date.now()}@example.com`;

    const regRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'New Business Owner',
      email: testEmail,
      password: 'Password123!',
      workspaceName: testCompany
    });

    assert(regRes.status === 201 && regRes.data.success, 'Direct workspace registration succeeded.');

    const newUserToken = regRes.data.data.token;
    const newUserId = regRes.data.data._id;
    const newUser = await User.findById(newUserId).populate('tenant');
    const newTenant = await Tenant.findById(newUser.tenant._id);

    assert(newTenant.subscriptionStatus === 'pending_payment', 'Newly registered workspace created with subscriptionStatus = pending_payment.');

    console.log('\n🛡️ STEP 3: Testing CRM Access Block for Unpaid Workspace...');
    try {
      await axios.get(`${API_URL}/leads`, {
        headers: { Authorization: `Bearer ${newUserToken}` }
      });
      assert(false, 'Unpaid workspace was allowed access when it should be blocked!');
    } catch (err) {
      assert(
        err.response && err.response.status === 402 && err.response.data.requireSubscriptionPayment,
        'Unpaid workspace direct CRM API access successfully blocked with HTTP 402 Payment Required.'
      );
    }

    console.log('\n💳 STEP 4: Testing Razorpay Order Creation...');
    const orderRes = await axios.post(
      `${API_URL}/payments/create-order`,
      { planName: 'GrownX Enterprise SaaS Plan', amount: 9999 },
      { headers: { Authorization: `Bearer ${newUserToken}` } }
    );

    assert(
      orderRes.status === 200 && orderRes.data.success && orderRes.data.orderId,
      `Razorpay order created successfully. OrderId: ${orderRes.data.orderId}, Amount: ${orderRes.data.amount}`
    );

    const orderId = orderRes.data.orderId;

    console.log('\n🔄 STEP 5: Testing Payment Verification & Subscription Activation...');
    const paymentId = `pay_test_${Date.now()}`;
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
        planName: 'GrownX Enterprise SaaS Plan',
        amount: 9999
      },
      { headers: { Authorization: `Bearer ${newUserToken}` } }
    );

    assert(
      verifyRes.status === 200 && verifyRes.data.success && verifyRes.data.data.subscriptionStatus === 'active',
      'Payment verified successfully and subscription status updated to active.'
    );

    // Verify tenant status updated in DB
    const updatedTenant = await Tenant.findById(newUser.tenant._id);
    assert(
      updatedTenant.subscriptionStatus === 'active' && updatedTenant.paidAt,
      'MongoDB Tenant document updated with subscriptionStatus = active and paidAt timestamp.'
    );

    console.log('\n🔓 STEP 6: Testing CRM Access Granted After Payment Verification...');
    const allowedRes = await axios.get(`${API_URL}/leads`, {
      headers: { Authorization: `Bearer ${newUserToken}` }
    });

    assert(allowedRes.status === 200, 'CRM API access granted after successful subscription payment verification.');

    console.log('\n🔒 STEP 7: Testing Tenant Isolation for Payment Records...');
    const user2Res = await axios.post(`${API_URL}/auth/register`, {
      name: 'Second Business Owner',
      email: `second_owner_${Date.now()}@example.com`,
      password: 'Password123!',
      workspaceName: `Workspace 2 ${Date.now()}`
    });

    const user2Token = user2Res.data.data.token;
    try {
      await axios.get(`${API_URL}/leads`, {
        headers: { Authorization: `Bearer ${user2Token}` }
      });
      assert(false, 'Second workspace was allowed access without payment!');
    } catch (err) {
      assert(
        err.response && err.response.status === 402,
        'Subscription state strictly isolated per tenant. Second workspace remains pending_payment.'
      );
    }

    console.log('\n================================================================');
    console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    server.close();
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ EXCEPTION IN TEST SUITE:', error.message);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
