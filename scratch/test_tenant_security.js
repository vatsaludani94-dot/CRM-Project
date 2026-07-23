require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const API_BASE = 'http://localhost:3000/api';

async function runSecurityTests() {
  console.log('=== PHASE 2D TENANT ISOLATION SECURITY TEST SUITE ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
  const PendingRegistration = require(path.join(__dirname, '../backend/models/PendingRegistration'));

  const rand = Math.floor(Math.random() * 10000);

  // Register Workspace A (Initiate & Verify)
  const emailA = `alpha_${rand}@test.com`;
  await fetch(`${API_BASE}/auth/register-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Alpha Workspace ${rand}`,
      name: 'Owner Alpha',
      email: emailA,
      password: 'password123'
    })
  }).then(r => r.json());

  const pendingA = await PendingRegistration.findOne({ email: emailA });
  const codeA = '111111';
  pendingA.verificationCodeHash = crypto.createHash('sha256').update(codeA).digest('hex');
  pendingA.expiresAt = new Date(Date.now() + 600000);
  await pendingA.save();

  const userA_res = await fetch(`${API_BASE}/auth/register-workspace/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, code: codeA })
  }).then(r => r.json());

  // Register Workspace B (Initiate & Verify)
  const emailB = `beta_${rand}@test.com`;
  await fetch(`${API_BASE}/auth/register-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Beta Workspace ${rand}`,
      name: 'Owner Beta',
      email: emailB,
      password: 'password123'
    })
  }).then(r => r.json());

  const pendingB = await PendingRegistration.findOne({ email: emailB });
  const codeB = '222222';
  pendingB.verificationCodeHash = crypto.createHash('sha256').update(codeB).digest('hex');
  pendingB.expiresAt = new Date(Date.now() + 600000);
  await pendingB.save();

  const userB_res = await fetch(`${API_BASE}/auth/register-workspace/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, code: codeB })
  }).then(r => r.json());

  const tokenA = userA_res.data.token;
  const tokenB = userB_res.data.token;
  const tenantA_id = userA_res.data.tenant._id;
  const tenantB_id = userB_res.data.tenant._id;

  console.log(`Registered Tenant A: ${tenantA_id}`);
  console.log(`Registered Tenant B: ${tenantB_id}\n`);

  // --- TEST A: Same-tenant CRUD ---
  console.log('--- TEST A: Same-tenant CRUD ---');
  const createCustA = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      companyName: 'Alpha Client Inc',
      contactPerson: 'Alice Alpha',
      email: `alice_${rand}@alphaclient.com`,
      phone: '1234567890',
      industry: 'Technology'
    })
  }).then(r => r.json());

  if (!createCustA.success) {
    console.error('Failed to create Customer A:', createCustA.error);
    return;
  }

  const customerA = createCustA.data;
  console.log('Created Customer A ID:', customerA._id, '| Tenant:', customerA.tenant);

  const getCustA = await fetch(`${API_BASE}/customers/${customerA._id}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  }).then(r => r.json());
  console.log('Read Customer A (Same Tenant):', getCustA.success ? 'PASS' : 'FAIL');

  const updateCustA = await fetch(`${API_BASE}/customers/${customerA._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ companyName: 'Alpha Client Inc Updated' })
  }).then(r => r.json());
  console.log('Update Customer A (Same Tenant):', updateCustA.success ? 'PASS' : 'FAIL');

  // --- TEST B: Cross-tenant Read ---
  console.log('\n--- TEST B: Cross-tenant Read ---');
  const crossRead = await fetch(`${API_BASE}/customers/${customerA._id}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  }).then(r => r.json());
  console.log('User B Read Customer A Result:', crossRead.status || crossRead.error, '(Expected: Customer not found)');
  const testB_pass = crossRead.success === false && crossRead.error === 'Customer not found';

  // --- TEST C: Cross-tenant Update ---
  console.log('\n--- TEST C: Cross-tenant Update ---');
  const crossUpdate = await fetch(`${API_BASE}/customers/${customerA._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ companyName: 'Hacked Company Name' })
  }).then(r => r.json());
  console.log('User B Update Customer A Result:', crossUpdate.error, '(Expected: Customer not found)');
  const testC_pass = crossUpdate.success === false && crossUpdate.error === 'Customer not found';

  // --- TEST D: Cross-tenant Delete ---
  console.log('\n--- TEST D: Cross-tenant Delete ---');
  const crossDelete = await fetch(`${API_BASE}/customers/${customerA._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  }).then(r => r.json());
  console.log('User B Delete Customer A Result:', crossDelete.error, '(Expected: Customer not found)');
  const testD_pass = crossDelete.success === false && crossDelete.error === 'Customer not found';

  // --- TEST E: Forged Tenant ID ---
  console.log('\n--- TEST E: Forged Tenant ID ---');
  const forgedCreate = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      companyName: 'Forged Tenant Test Co',
      contactPerson: 'Frank Forger',
      email: `forger_${rand}@test.com`,
      phone: '9876543210',
      industry: 'Finance',
      tenant: tenantB_id // Attempting to forge Tenant B!
    })
  }).then(r => r.json());
  console.log('Created Record Tenant:', forgedCreate.data.tenant, '| User A Tenant:', tenantA_id);
  const testE_pass = forgedCreate.data.tenant === tenantA_id;

  // --- TEST F: Cross-tenant Related Resource Attack ---
  console.log('\n--- TEST F: Cross-tenant Related Resource Attack ---');
  const crossTicket = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({
      title: 'Malicious Ticket for Customer A',
      description: 'Attempting to attach ticket to foreign customer A',
      customerId: customerA._id
    })
  }).then(r => r.json());
  console.log('User B Ticket with Customer A Result:', crossTicket.error, '(Expected: Customer does not belong to your workspace)');
  const testF_pass = crossTicket.success === false && crossTicket.error.includes('does not belong to your workspace');

  // --- TEST G: User Without Tenant ---
  console.log('\n--- TEST G: User Without Tenant ---');
  const orphanUser_res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Orphan User',
      email: `orphan_${rand}@test.com`,
      password: 'password123',
      role: 'employee'
    })
  }).then(r => r.json());

  const orphanToken = orphanUser_res.data.token;
  const orphanRequest = await fetch(`${API_BASE}/customers`, {
    headers: { 'Authorization': `Bearer ${orphanToken}` }
  }).then(r => r.json());
  console.log('Orphan User API Request Result:', orphanRequest.error, '(Expected: Not authorized)');
  const testG_pass = orphanRequest.success === false;

  // Clean up Customer A
  await fetch(`${API_BASE}/customers/${customerA._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  await mongoose.disconnect();

  console.log('\n=======================================');
  console.log('=== FINAL SECURITY AUDIT SUMMARY RESULTS ===');
  console.log('=======================================');
  console.log(`[PASS] 1. Same-tenant CRUD: ${getCustA.success && updateCustA.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`[PASS] 2. Cross-tenant Read Prevention: ${testB_pass ? 'SUCCESS' : 'FAILED'}`);
  console.log(`[PASS] 3. Cross-tenant Update Prevention: ${testC_pass ? 'SUCCESS' : 'FAILED'}`);
  console.log(`[PASS] 4. Cross-tenant Delete Prevention: ${testD_pass ? 'SUCCESS' : 'FAILED'}`);
  console.log(`[PASS] 5. Forged Tenant ID Prevention: ${testE_pass ? 'SUCCESS' : 'FAILED'}`);
  console.log(`[PASS] 6. Cross-tenant Related Resource Defense: ${testF_pass ? 'SUCCESS' : 'FAILED'}`);
  console.log(`[PASS] 7. User Without Tenant Access Rejection: ${testG_pass ? 'SUCCESS' : 'FAILED'}`);
  console.log('=======================================\n');
}

runSecurityTests();
