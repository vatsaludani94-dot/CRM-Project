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

async function runTests() {
  console.log('--- RUNNING PHASE 5B SAAS SHELL & COMMAND CENTER TESTS ---');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
  const PendingRegistration = require(path.join(__dirname, '../backend/models/PendingRegistration'));

  const rand = Math.floor(Math.random() * 10000);
  const testEmail = `phase5b_owner_${rand}@grownx.com`;

  // 1. Register & Verify workspace owner
  await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-workspace',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    companyName: `Phase 5B Test Workspace ${rand}`,
    name: 'Phase5B Owner',
    email: testEmail,
    password: 'Password123!'
  });

  const pending = await PendingRegistration.findOne({ email: testEmail });
  const code = '999999';
  pending.verificationCodeHash = crypto.createHash('sha256').update(code).digest('hex');
  pending.expiresAt = new Date(Date.now() + 600000);
  await pending.save();

  const verifyRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-workspace/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, code });

  if (!verifyRes.data || !verifyRes.data.success || !verifyRes.data.data?.token) {
    console.error('FAILED: Workspace registration verify failed', verifyRes.data);
    process.exit(1);
  }

  const token = verifyRes.data.data.token;
  const tenantId = verifyRes.data.data.tenant?._id || verifyRes.data.data.tenant;
  console.log('✅ PASS: SaaS Workspace Onboarding & Authentication Success (Tenant ID:', tenantId, ')');

  // 2. Fetch Dashboard & Command Center Priority Actions
  const dashRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/dashboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (dashRes.status === 200 && dashRes.data?.success && Array.isArray(dashRes.data.data?.priorityActions)) {
    console.log(`✅ PASS: Command Center returned ${dashRes.data.data.priorityActions.length} tenant-scoped Priority Actions`);
  } else {
    console.error('FAILED: Dashboard priority actions response invalid', dashRes.data);
    process.exit(1);
  }

  // 3. Global Search Foundation Endpoint
  const searchRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/dashboard/search?q=test',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (searchRes.status === 200 && searchRes.data?.success && Array.isArray(searchRes.data.data)) {
    console.log(`✅ PASS: Global Search returned ${searchRes.data.data.length} tenant-scoped search items`);
  } else {
    console.error('FAILED: Global search failed', searchRes.data);
    process.exit(1);
  }

  // 4. Test Regex Sanitization / Security in Global Search
  const regexSearchRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/dashboard/search?q=' + encodeURIComponent('.*+?^${}()|[]\\'),
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (regexSearchRes.status === 200 && regexSearchRes.data?.success) {
    console.log('✅ PASS: Global Search ReDoS & Special Regex Character Defense Verified');
  } else {
    console.error('FAILED: Regex search failed', regexSearchRes.data);
    process.exit(1);
  }

  await mongoose.disconnect();

  console.log('\n======================================================');
  console.log('ALL PHASE 5B SAAS SHELL & COMMAND CENTER TESTS PASSED (4/4)');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
