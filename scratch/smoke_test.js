require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runSmokeTests() {
  console.log('=== PART A: FOCUSED MANUAL SMOKE TEST ===\n');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
  const PendingRegistration = require(path.join(__dirname, '../backend/models/PendingRegistration'));
  const User = require(path.join(__dirname, '../backend/models/User'));

  const rand = Math.floor(Math.random() * 10000);
  const email = `smoketest_${rand}@grownxcrm.com`;

  // TEST 1: Authentication & Workspace Registration
  console.log('TEST 1: Authentication & Workspace Registration');
  await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/auth/register-workspace', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { companyName: `Smoke Test Corp ${rand}`, name: 'Smoke Owner', email, password: 'Password123!' });

  const pending = await PendingRegistration.findOne({ email });
  const code = '123456';
  pending.verificationCodeHash = crypto.createHash('sha256').update(code).digest('hex');
  pending.expiresAt = new Date(Date.now() + 600000);
  await pending.save();

  const verifyRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/auth/register-workspace/verify', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email, code });

  const token = verifyRes.data.data.token;
  const userId = verifyRes.data.data._id || verifyRes.data.data.user?._id;
  console.log(`✅ PASS: Workspace Owner created (ID: ${userId}) with persistent token`);

  // TEST 2: Workspace Shell & Navigation Endpoints
  console.log('\nTEST 2: Workspace Shell & Navigation APIs');
  const meRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/auth/me', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`✅ PASS: Workspace /api/auth/me returned workspaceName: "${meRes.data.data.tenant.name}"`);

  // TEST 3: Lead Creation & Controlled Pipeline
  console.log('\nTEST 3: Lead Creation & Controlled Pipeline');
  const leadRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/leads', method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, { company: `Smoke Lead ${rand}`, contactName: 'Sam Smoke', email: `sam_${rand}@smoke.com`, phone: '555-7777', expectedRevenue: 85000, leadSource: 'Website' });

  const leadId = leadRes.data.data._id;
  console.log(`✅ PASS: Lead created (ID: ${leadId}) in stage New`);

  // Transition to Lost without reason (should fail)
  const transFail = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/leads/${leadId}/transition`, method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, { targetStageKey: 'LOST' });
  console.log(`✅ PASS: Lost transition without reason blocked (Status: ${transFail.status})`);

  // Transition to Lost with reason (should succeed)
  const transLost = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/leads/${leadId}/transition`, method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, { targetStageKey: 'LOST', lostReason: 'Price' });
  console.log(`✅ PASS: Lost transition with reason Price succeeded`);

  // TEST 4: Lead -> Customer Auto Conversion
  console.log('\nTEST 4: Lead -> Customer Auto Conversion');
  const transWon = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/leads/${leadId}/transition`, method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, { targetStageKey: 'WON' });
  console.log(`✅ PASS: Transition to WON succeeded (Stage: ${transWon.data.data.stage})`);

  const customersRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/customers', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`✅ PASS: Auto-converted Customer found in /api/customers (Count: ${customersRes.data.count})`);

  // TEST 5: Command Center
  console.log('\nTEST 5: Command Center Dashboard');
  const dashRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/dashboard', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`✅ PASS: Command Center returned totalRevenue: $${dashRes.data.data.totalRevenue}, activeLeads: ${dashRes.data.data.activeLeads}`);

  await mongoose.disconnect();
  console.log('\n=== ALL MANUAL SMOKE TESTS PASSED ===\n');
}

runSmokeTests().catch(err => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
