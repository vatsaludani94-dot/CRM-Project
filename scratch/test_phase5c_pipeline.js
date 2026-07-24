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

async function runPipelineTests() {
  console.log('=== PHASE 5C-2 CONTROLLED PIPELINE & TRANSITION ENGINE TEST SUITE ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
  const PendingRegistration = require(path.join(__dirname, '../backend/models/PendingRegistration'));
  const Customer = require(path.join(__dirname, '../backend/models/Customer'));

  const rand = Math.floor(Math.random() * 10000);

  // 1. Register Tenant A (Workspace Owner)
  const emailA = `owner_a_${rand}@pipeline.com`;
  await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-workspace',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { companyName: `Alpha Workspace ${rand}`, name: 'Alpha Owner', email: emailA, password: 'Password123!' });

  const pendingA = await PendingRegistration.findOne({ email: emailA });
  const codeA = '123456';
  pendingA.verificationCodeHash = crypto.createHash('sha256').update(codeA).digest('hex');
  pendingA.expiresAt = new Date(Date.now() + 600000);
  await pendingA.save();

  const userA_res = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-workspace/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: emailA, code: codeA });

  const tokenA = userA_res.data.data.token;
  const tenantA_id = userA_res.data.data.tenant._id || userA_res.data.data.tenant;
  console.log(`✅ PASS: Registered Tenant A: ${tenantA_id}`);

  // 2. Register Tenant B (Workspace Owner)
  const emailB = `owner_b_${rand}@pipeline.com`;
  await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-workspace',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { companyName: `Beta Workspace ${rand}`, name: 'Beta Owner', email: emailB, password: 'Password123!' });

  const pendingB = await PendingRegistration.findOne({ email: emailB });
  const codeB = '654321';
  pendingB.verificationCodeHash = crypto.createHash('sha256').update(codeB).digest('hex');
  pendingB.expiresAt = new Date(Date.now() + 600000);
  await pendingB.save();

  const userB_res = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-workspace/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: emailB, code: codeB });

  const tokenB = userB_res.data.data.token;
  const tenantB_id = userB_res.data.data.tenant._id || userB_res.data.data.tenant;
  console.log(`✅ PASS: Registered Tenant B: ${tenantB_id}\n`);

  // --- TEST 1: Default Pipeline Stage Auto-Initialization ---
  console.log('--- TEST 1: Default Pipeline Stage Auto-Initialization ---');
  const getStagesA = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/pipeline/stages',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });

  if (getStagesA.status === 200 && getStagesA.data?.count === 7) {
    console.log(`✅ PASS: Auto-initialized ${getStagesA.data.count} default pipeline stages for Tenant A`);
  } else {
    console.error('FAILED: Default stages initialization failed', getStagesA.data);
    process.exit(1);
  }

  // --- TEST 2: Custom Pipeline Stage Creation & Tenant Isolation ---
  console.log('\n--- TEST 2: Custom Pipeline Stage Creation & Tenant Isolation ---');
  const createStageRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/pipeline/stages',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { name: 'Demo Completed', probability: 50, color: '#10b981' });

  if (createStageRes.status === 201 && createStageRes.data?.data?.key === 'DEMO_COMPLETED') {
    console.log(`✅ PASS: Created custom stage DEMO_COMPLETED (ID: ${createStageRes.data.data._id}) for Tenant A`);
  } else {
    console.error('FAILED: Custom stage creation failed', createStageRes.data);
    process.exit(1);
  }

  // Tenant B attempts to duplicate same key (should succeed because keys are tenant-isolated)
  const createStageBRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/pipeline/stages',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' }
  }, { name: 'Demo Completed', probability: 50 });

  if (createStageBRes.status === 201) {
    console.log('✅ PASS: Tenant B created same stage key DEMO_COMPLETED independently (Tenant Isolation Verified)');
  } else {
    console.error('FAILED: Tenant-isolated stage creation failed', createStageBRes.data);
    process.exit(1);
  }

  // --- TEST 3: Protected System Stage Deletion Block ---
  console.log('\n--- TEST 3: Protected System Stage Deletion Block ---');
  const systemLostStage = getStagesA.data.data.find(s => s.key === 'LOST');
  const deleteSystemRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/pipeline/stages/${systemLostStage._id}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });

  if (deleteSystemRes.status === 400 && deleteSystemRes.data?.error?.includes('System stages')) {
    console.log('✅ PASS: Deletion of protected System LOST stage correctly blocked');
  } else {
    console.error('FAILED: System stage deletion protection failed', deleteSystemRes.data);
    process.exit(1);
  }

  // --- TEST 4: Controlled Lead Creation & Stage Transition ---
  console.log('\n--- TEST 4: Controlled Lead Creation & Stage Transition ---');
  const createLeadRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/leads',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, {
    company: `Acme Corp ${rand}`,
    contactName: 'Alice Acme',
    email: `alice_${rand}@acme.com`,
    phone: '555-0199',
    expectedRevenue: 150000,
    leadSource: 'Website'
  });

  const leadA = createLeadRes.data.data;
  console.log(`Created Lead A ID: ${leadA._id} (Stage: ${leadA.stage})`);

  // Transition to INTERESTED
  const transInterested = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/transition`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { targetStageKey: 'INTERESTED' });

  if (transInterested.status === 200 && transInterested.data?.data?.stage === 'Interested') {
    console.log('✅ PASS: Lead transition to INTERESTED succeeded with event payload:', transInterested.data.event.eventType);
  } else {
    console.error('FAILED: Transition to INTERESTED failed', transInterested.data);
    process.exit(1);
  }

  // --- TEST 5: Lost Stage Transition - Missing Lost Reason Rejection ---
  console.log('\n--- TEST 5: Lost Stage Transition - Missing Lost Reason Rejection ---');
  const transLostNoReason = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/transition`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { targetStageKey: 'LOST' });

  if (transLostNoReason.status === 400 && transLostNoReason.data?.error?.includes('Lost reason is required')) {
    console.log('✅ PASS: Transition to LOST without reason correctly rejected (400)');
  } else {
    console.error('FAILED: Lost stage transition without reason allowed!', transLostNoReason.data);
    process.exit(1);
  }

  // --- TEST 6: Lost Stage Transition - Valid Lost Reason Success ---
  console.log('\n--- TEST 6: Lost Stage Transition - Valid Lost Reason Success ---');
  const transLostValid = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/transition`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { targetStageKey: 'LOST', lostReason: 'Competitor' });

  if (transLostValid.status === 200 && transLostValid.data?.data?.lostReason === 'Competitor') {
    console.log('✅ PASS: Transition to LOST with reason "Competitor" succeeded');
  } else {
    console.error('FAILED: Transition to LOST with valid reason failed', transLostValid.data);
    process.exit(1);
  }

  // --- TEST 7: Won Stage Transition & Auto Customer Conversion ---
  console.log('\n--- TEST 7: Won Stage Transition & Auto Customer Conversion ---');
  const transWon = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/transition`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { targetStageKey: 'WON' });

  if (transWon.status === 200 && transWon.data?.data?.stage === 'Won') {
    console.log('✅ PASS: Transition to WON succeeded');
    const autoCustomer = await Customer.findOne({ email: `alice_${rand}@acme.com`, tenant: tenantA_id });
    if (autoCustomer) {
      console.log(`✅ PASS: Auto-converted Customer created ID: ${autoCustomer._id} ($${autoCustomer.revenueGenerated} contract value)`);
    } else {
      console.error('FAILED: Auto-converted Customer record not found!');
      process.exit(1);
    }
  } else {
    console.error('FAILED: Transition to WON failed', transWon.data);
    process.exit(1);
  }

  // --- TEST 8: Cross-Tenant Lead Transition Defense ---
  console.log('\n--- TEST 8: Cross-Tenant Lead Transition Defense ---');
  const crossTrans = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/transition`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' }
  }, { targetStageKey: 'INTERESTED' });

  if (crossTrans.status === 404 && crossTrans.data?.error === 'Lead not found') {
    console.log('✅ PASS: Cross-tenant Lead transition by Tenant B correctly rejected (404 Lead not found)');
  } else {
    console.error('FAILED: Cross-tenant Lead transition allowed!', crossTrans.data);
    process.exit(1);
  }

  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log('ALL PHASE 5C-2 PIPELINE & TRANSITION ENGINE TESTS PASSED (8/8)');
  console.log('================================================================\n');
}

runPipelineTests().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
