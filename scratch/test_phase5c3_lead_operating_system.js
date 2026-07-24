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

async function runPhase5C3Tests() {
  console.log('=== PHASE 5C-3 LEAD OPERATING SYSTEM TEST SUITE ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
  const PendingRegistration = require(path.join(__dirname, '../backend/models/PendingRegistration'));
  const Task = require(path.join(__dirname, '../backend/models/Task'));
  const WorkflowLog = require(path.join(__dirname, '../backend/models/WorkflowLog'));

  const rand = Math.floor(Math.random() * 10000);

  // 1. Register Tenant A (Workspace Owner)
  const emailA = `owner_os_a_${rand}@leados.com`;
  await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-workspace',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { companyName: `Alpha Lead OS ${rand}`, name: 'Alpha Owner', email: emailA, password: 'Password123!' });

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
  const emailB = `owner_os_b_${rand}@leados.com`;
  await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-workspace',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { companyName: `Beta Lead OS ${rand}`, name: 'Beta Owner', email: emailB, password: 'Password123!' });

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

  // --- TEST 1: Lead Creation & Automated Workflow Execution ---
  console.log('--- TEST 1: Automated Workflow Trigger on Lead Creation ---');
  
  // Create an automated workflow in Tenant A
  const createWfRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workflows',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, {
    name: 'Auto Task on Inbound Lead',
    trigger: 'Lead Created',
    steps: [
      {
        type: 'Action',
        config: {
          actionType: 'Create Task',
          taskTitle: 'Initial Qualification Call',
          taskPriority: 'High'
        }
      }
    ]
  });

  if (createWfRes.status === 201 && createWfRes.data?.data?._id) {
    console.log(`✅ PASS: Created automated workflow rule (ID: ${createWfRes.data.data._id}) for Tenant A`);
  } else {
    console.error('FAILED: Workflow creation failed', createWfRes.data);
    process.exit(1);
  }

  // Create a lead in Tenant A
  const createLeadRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/leads',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, {
    company: `Apex Systems ${rand}`,
    contactName: 'Brian Apex',
    email: `brian_${rand}@apex.com`,
    phone: '555-9000',
    expectedRevenue: 250000,
    leadSource: 'Referral'
  });

  const leadA = createLeadRes.data.data;
  console.log(`Created Lead A ID: ${leadA._id}`);

  // Verify WorkflowLog and Task were auto-created
  const wfLog = await WorkflowLog.findOne({ entityId: leadA._id, tenant: tenantA_id });
  const autoTask = await Task.findOne({ title: 'Initial Qualification Call', tenant: tenantA_id });

  if (wfLog && wfLog.status === 'success' && autoTask) {
    console.log(`✅ PASS: Automated workflow executed successfully! Task created ID: ${autoTask._id}`);
  } else {
    console.error('FAILED: Automated workflow execution or task creation failed!');
    process.exit(1);
  }

  // --- TEST 2: Explainable AI Lead Scoring & Factors ---
  console.log('\n--- TEST 2: Explainable AI Lead Scoring & Factors ---');
  const scoreRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/score`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });

  if (scoreRes.status === 200 && scoreRes.data?.data?.factors?.length > 0) {
    console.log(`✅ PASS: Explained score retrieved: ${scoreRes.data.data.currentScore}% with ${scoreRes.data.data.factors.length} factors`);
    console.log(`   Sample Factor: [${scoreRes.data.data.factors[0].factor}] (${scoreRes.data.data.factors[0].impact >= 0 ? '+' : ''}${scoreRes.data.data.factors[0].impact}) - ${scoreRes.data.data.factors[0].explanation}`);
  } else {
    console.error('FAILED: Explainable score retrieval failed', scoreRes.data);
    process.exit(1);
  }

  // --- TEST 3: Score Refresh & Score History Traceability ---
  console.log('\n--- TEST 3: Score Refresh & Score History Traceability ---');
  // Add a note to lead first
  await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/notes`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { content: 'Client confirmed budget availability for enterprise tier.' });

  const refreshScoreRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/score/refresh`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  });

  if (refreshScoreRes.status === 200 && refreshScoreRes.data?.data?.historyEntry) {
    console.log(`✅ PASS: Refreshed score: ${refreshScoreRes.data.data.currentScore}% (Score History Entry ID: ${refreshScoreRes.data.data.historyEntry._id})`);
  } else {
    console.error('FAILED: Score refresh failed', refreshScoreRes.data);
    process.exit(1);
  }

  // --- TEST 4: Unified Chronological Lead Engagement Timeline ---
  console.log('\n--- TEST 4: Unified Chronological Lead Engagement Timeline ---');
  const timelineRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/timeline`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });

  if (timelineRes.status === 200 && timelineRes.data?.count >= 3) {
    console.log(`✅ PASS: Retrieved unified timeline with ${timelineRes.data.count} chronological events`);
    const eventTypes = timelineRes.data.data.map(e => e.type);
    console.log('   Timeline Stream Events:', eventTypes.join(' -> '));
  } else {
    console.error('FAILED: Timeline retrieval failed', timelineRes.data);
    process.exit(1);
  }

  // --- TEST 5: Cross-Tenant Timeline & Score Security Defense ---
  console.log('\n--- TEST 5: Cross-Tenant Timeline & Score Security Defense ---');
  const crossTimeline = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/timeline`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });

  const crossScore = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadA._id}/score`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });

  if (crossTimeline.status === 404 && crossScore.status === 404) {
    console.log('✅ PASS: Cross-tenant access to Lead Timeline and AI Score correctly rejected (404 Lead not found)');
  } else {
    console.error('FAILED: Cross-tenant timeline or score access allowed!', crossTimeline.data, crossScore.data);
    process.exit(1);
  }

  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log('ALL PHASE 5C-3 LEAD OPERATING SYSTEM TESTS PASSED (5/5)');
  console.log('================================================================\n');
}

runPhase5C3Tests().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
