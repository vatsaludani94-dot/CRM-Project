const axios = require('axios');
const assert = require('assert');

const API_URL = 'http://localhost:3000/api';

async function runPhase5ETests() {
  console.log('================================================================');
  console.log('🚀 RUNNING PHASE 5E CUSTOMER RETENTION & SUPPORT TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    const timestamp = Date.now();
    const ownerEmail = `owner.retention.${timestamp}@example.com`;
    const tenantBEmail = `tenantb.retention.${timestamp}@example.com`;

    // TEST 1: Register Tenant A & Tenant B Workspace Owners
    console.log('🔐 Test 1: Registering & Authenticating Tenant Workspaces...');
    const regA = await axios.post(`${API_URL}/auth/register`, {
      name: 'Owner Retention A',
      email: ownerEmail,
      password: 'Password123!',
      workspaceName: `Retention Enterprise A ${timestamp}`
    });
    assert(regA.data.success && regA.data.data.token, 'Tenant A registered');
    const tokenA = regA.data.data.token;
    const authA = { headers: { Authorization: `Bearer ${tokenA}` } };

    const regB = await axios.post(`${API_URL}/auth/register`, {
      name: 'Owner Retention B',
      email: tenantBEmail,
      password: 'Password123!',
      workspaceName: `Retention Enterprise B ${timestamp}`
    });
    assert(regB.data.success && regB.data.data.token, 'Tenant B registered');
    const tokenB = regB.data.data.token;
    const authB = { headers: { Authorization: `Bearer ${tokenB}` } };
    console.log(' ✅ PASS: Multi-tenant workspace accounts authenticated');
    passed += 2;

    // TEST 2: Create Customer Account in Tenant A
    console.log('\n👤 Test 2: Creating Test Customer Account...');
    const custRes = await axios.post(`${API_URL}/customers`, {
      companyName: 'Starling Global Retentions',
      contactPerson: 'Amanda Ripley',
      email: `amanda.${timestamp}@starling.com`,
      phone: '+1 555-019-9988',
      industry: 'Logistics',
    }, authA);
    assert(custRes.data.success, 'Customer created');
    const customerId = custRes.data.data._id;
    console.log(` ✅ PASS: Customer created (ID: ${customerId})`);
    passed++;

    // TEST 3: Health Score Initial Calculation (Default Base 80 / Healthy)
    console.log('\n💚 Test 3: Verifying Customer Health Score & Explainable Factors...');
    const healthRes = await axios.post(`${API_URL}/retention/customers/${customerId}/health/recalculate`, {}, authA);
    assert(healthRes.data.success, 'Health score calculated');
    const health = healthRes.data.data;
    assert(typeof health.healthScore === 'number', 'Health score is a number');
    assert(['Healthy', 'Stable', 'At Risk', 'Critical'].includes(health.healthStatus), 'Valid health status classification');
    assert(Array.isArray(health.positiveFactors), 'Positive factors array present');
    assert(Array.isArray(health.riskFactors), 'Risk factors array present');
    console.log(` ✅ PASS: Initial Health Score: ${health.healthScore}/100 Status: ${health.healthStatus}`);
    passed += 4;

    // TEST 4: Create Urgent Support Ticket and Verify Impact on Health Score
    console.log('\n🎫 Test 4: Creating Urgent Support Ticket & Verifying Health Impact...');
    const tktRes = await axios.post(`${API_URL}/tickets`, {
      title: 'Critical Service Outage on Main Warehouse',
      description: 'Logistics tracking API is throwing error 500 across server cluster.',
      category: 'Technical',
      priority: 'Critical',
      customerId
    }, authA);
    assert(tktRes.data.success, 'Ticket created');
    const ticketId = tktRes.data.data._id;

    // Re-fetch 360 to inspect health score reduction
    const c360AfterTicket = await axios.get(`${API_URL}/customers/${customerId}/360`, authA);
    assert(c360AfterTicket.data.success, 'Customer 360 fetched');
    const healthAfterTicket = c360AfterTicket.data.data.health;
    assert(healthAfterTicket.openTickets > 0, 'Open ticket count updated');
    assert(healthAfterTicket.riskFactors.some(r => r.factor.includes('urgent') || r.factor.includes('unresolved')), 'Risk factor recorded for support issue');
    console.log(` ✅ PASS: Health score updated to ${healthAfterTicket.healthScore}/100 Status: ${healthAfterTicket.healthStatus}`);
    passed += 3;

    // TEST 5: Controlled Ticket Status Transitions
    console.log('\n🔄 Test 5: Testing Controlled Ticket Status Transitions...');
    
    // Valid transition: Open -> In Progress
    const trans1 = await axios.put(`${API_URL}/tickets/${ticketId}`, { status: 'In Progress' }, authA);
    assert(trans1.data.success && trans1.data.data.status === 'In Progress', 'Transition Open -> In Progress allowed');

    // Invalid transition: In Progress -> Assigned (should fail with 400)
    try {
      await axios.put(`${API_URL}/tickets/${ticketId}`, { status: 'Assigned' }, authA);
      assert(false, 'Should have rejected invalid status transition');
    } catch (err) {
      assert(err.response.status === 400, 'Invalid transition rejected with 400 Bad Request');
    }

    // Valid transition: In Progress -> Resolved
    const trans2 = await axios.put(`${API_URL}/tickets/${ticketId}`, { status: 'Resolved' }, authA);
    assert(trans2.data.success && trans2.data.data.status === 'Resolved', 'Transition In Progress -> Resolved allowed');
    console.log(' ✅ PASS: Status transitions strictly controlled');
    passed += 3;

    // TEST 6: Customer Follow-Up Task Creation
    console.log('\n📅 Test 6: Creating Customer Follow-up Task...');
    const followupRes = await axios.post(`${API_URL}/retention/customers/${customerId}/followup`, {
      title: 'Quarterly Executive Account Review',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: 'Discuss logistics integration roadmap & SLA agreements'
    }, authA);
    assert(followupRes.data.success, 'Follow-up task created');
    console.log(' ✅ PASS: Customer follow-up scheduled');
    passed++;

    // TEST 7: Customer Retention Dashboard & Priority Actions
    console.log('\n📊 Test 7: Fetching Retention & Customer Success Dashboard...');
    const dashRes = await axios.get(`${API_URL}/retention/dashboard`, authA);
    assert(dashRes.data.success, 'Retention dashboard fetched');
    assert(typeof dashRes.data.data.distribution.total === 'number', 'Distribution total present');
    assert(Array.isArray(dashRes.data.data.priorityActions), 'Priority actions list present');
    console.log(` ✅ PASS: Retention dashboard returns ${dashRes.data.data.distribution.total} total account(s)`);
    passed += 3;

    // TEST 8: Customer Segmentation API
    console.log('\n🎯 Test 8: Querying Segmented Customer Health Records...');
    const segRes = await axios.get(`${API_URL}/retention/customers?segment=all`, authA);
    assert(segRes.data.success, 'Segmented customers fetched');
    assert(segRes.data.count > 0, 'Customer health records returned');
    console.log(` ✅ PASS: Segmented query returned ${segRes.data.count} record(s)`);
    passed += 2;

    // TEST 9: Tenant Isolation Security Defense
    console.log('\n🛡️ Test 9: Verifying Cross-Tenant Security Defense on Retention API...');
    const dashB = await axios.get(`${API_URL}/retention/dashboard`, authB);
    assert(dashB.data.success, 'Tenant B dashboard query succeeded');
    const bCustomerIds = (dashB.data.data.atRiskCustomers || []).map(r => String(r.customer?._id || r.customer));
    assert(!bCustomerIds.includes(String(customerId)), 'Tenant B dashboard strictly excludes Tenant A customers');
    console.log(' ✅ PASS: Multi-tenant retention isolation verified');
    passed += 2;

  } catch (err) {
    console.error(' ❌ CRITICAL TEST ERROR:', err.response ? JSON.stringify(err.response.data) : err.stack || err.message);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5ETests();
