/**
 * PHASE 5D-2 AUTOMATED VERIFICATION TEST SUITE
 * GrownX CRM SaaS Platform — Workspace Identity, Secure Email, Attachments, Payment Credit & UI Hardening
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING PHASE 5D-2 AUTOMATED INTEGRATION & HARDENING SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // TEST 1: Codebase Audit - Stale Email Purge Check
    console.log('📋 Test 1: Verifying Purge of Stale/Fake Account Credentials...');
    const searchScript = require('./find_references.js');
    const emailCenterFile = fs.readFileSync(path.join(__dirname, '../frontend/angular-app/src/app/features/email-center/email-center.component.ts'), 'utf8');
    assert(!emailCenterFile.includes('owner.workspace@apextech.com'), 'Stale email owner.workspace@apextech.com removed from email-center.component.ts');
    
    const emailControllerFile = fs.readFileSync(path.join(__dirname, '../backend/controllers/emailController.js'), 'utf8');
    assert(!emailControllerFile.includes('user@grownox.com'), 'Stale fallback email user@grownox.com removed from emailController.js');

    // TEST 2: Workspace Registration & User Login
    console.log('\n🔐 Test 2: Registering & Authenticating BCME Test Workspace...');
    const timestamp = Date.now();
    const testEmail = `bcme.owner.${timestamp}@example.com`;
    const companyName = `BCME Operations ${timestamp}`;

    const regRes = await axios.post(`${API_URL}/auth/register`, {
      workspaceName: companyName,
      name: 'Vatsal Udani',
      email: testEmail,
      password: 'Password123!',
    });
    assert(regRes.data.success && regRes.data.data.token, 'Workspace owner registered & authenticated');
    const token = regRes.data.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // TEST 3: Get Initial Workspace Settings & Separate Auth vs Comm Email
    console.log('\n⚙️ Test 3: Checking Initial Workspace Settings & Email Separation...');
    const settingsGet = await axios.get(`${API_URL}/workspace/settings`, authHeaders);
    assert(settingsGet.data.success, 'GET /api/workspace/settings returned 200 OK');
    assert(settingsGet.data.data.workspaceName === companyName, `Workspace name resolves to "${companyName}"`);
    assert(settingsGet.data.data.communicationEmail === testEmail, `Communication email defaults to owner email "${testEmail}"`);

    // TEST 4: Update Workspace Settings (Name -> BCME, Custom Comm Email, Primary Accent Color)
    console.log('\n🎨 Test 4: Updating Workspace Identity to BCME Enterprise & Accent Theme...');
    const updatedName = `BCME Enterprise Suite`;
    const commEmail = `contact@bcme.org`;
    const commName = `BCME Customer Relations`;
    const primaryColor = `#d97706`;

    const settingsPut = await axios.put(`${API_URL}/workspace/settings`, {
      workspaceName: updatedName,
      communicationEmail: commEmail,
      communicationEmailName: commName,
      primaryColor,
      theme: 'dark'
    }, authHeaders);

    assert(settingsPut.data.success, 'PUT /api/workspace/settings returned 200 OK');
    assert(settingsPut.data.data.workspaceName === updatedName, `Saved workspaceName is "${updatedName}"`);
    assert(settingsPut.data.data.communicationEmail === commEmail, `Saved communicationEmail is "${commEmail}"`);
    assert(settingsPut.data.data.communicationEmailName === commName, `Saved communicationEmailName is "${commName}"`);
    assert(settingsPut.data.data.primaryColor === primaryColor, `Saved primaryColor is "${primaryColor}"`);

    // TEST 5: GET /api/auth/me Returns Fresh Workspace Identity
    console.log('\n🔄 Test 5: Verifying GET /api/auth/me Workspace Identity Persistence...');
    const meRes = await axios.get(`${API_URL}/auth/me`, authHeaders);
    assert(meRes.data.success, 'GET /api/auth/me returned 200 OK');
    assert(meRes.data.data.workspaceIdentity.workspaceName === updatedName, 'GET /api/auth/me contains updated workspaceName');
    assert(meRes.data.data.workspaceIdentity.communicationEmail === commEmail, 'GET /api/auth/me contains updated communicationEmail');

    // TEST 6: Create Customer & Generate Invoice
    console.log('\n📄 Test 6: Creating Customer & Document for Financial Credit Logic...');
    const custRes = await axios.post(`${API_URL}/customers`, {
      companyName: 'Starling Global Logistics',
      contactPerson: 'Sarah Connor',
      email: `sarah.${timestamp}@starling.com`,
      phone: '+1 555-019-2834',
      industry: 'Logistics',
    }, authHeaders);
    assert(custRes.data.success, 'Customer created');
    const customerId = custRes.data.data._id;

    const docRes = await axios.post(`${API_URL}/documents`, {
      name: 'BCME Platform Implementation Invoice',
      type: 'Invoice',
      customer: customerId,
      metadata: {
        taxRate: 0,
        discountRate: 0,
        lineItems: [
          { description: 'CRM SaaS License', quantity: 1, unitPrice: 500 }
        ]
      }
    }, authHeaders);
    assert(docRes.data.success, 'Invoice document created (Net Amount: ₹500)');
    const documentId = docRes.data.data._id;
    assert(docRes.data.data.metadata.netAmount === 500, 'Net Amount calculated as 500');

    // TEST 7: Record Partial Payment (₹400) -> Balance Due ₹100
    console.log('\n💳 Test 7: Recording Partial Payment of ₹400...');
    const pay1 = await axios.post(`${API_URL}/documents/${documentId}/payments`, {
      amount: 400,
      paymentMethod: 'Bank Transfer',
      notes: 'Initial partial payment'
    }, authHeaders);
    assert(pay1.data.success, 'Payment recorded');
    assert(pay1.data.data.metadata.amountPaid === 400, 'Total Paid is ₹400');
    assert(pay1.data.data.metadata.amountDue === 100, 'Balance Due is ₹100');
    assert(pay1.data.data.status === 'Partially_Paid', 'Status is Partially_Paid');

    // TEST 8: Overpayment / Advance Payment Logic (Additional ₹200 Paid -> Total Paid ₹600)
    console.log('\n💰 Test 8: Recording Overpayment (Additional ₹200 -> Total Paid ₹600)...');
    const pay2 = await axios.post(`${API_URL}/documents/${documentId}/payments`, {
      amount: 200,
      paymentMethod: 'Credit Card',
      notes: 'Overpayment advance'
    }, authHeaders);
    assert(pay2.data.success, 'Overpayment recorded');
    assert(pay2.data.data.metadata.amountPaid === 600, 'Total Paid is ₹600');
    assert(pay2.data.data.metadata.amountDue === 0, 'Balance Due is ₹0');
    assert(pay2.data.data.metadata.creditBalance === 100, 'Paid in Advance / Customer Credit is ₹100');
    assert(pay2.data.data.status === 'Paid', 'Invoice status updated to Paid');

    // TEST 9: Authenticated PDF Stream with Query Token
    console.log('\n📑 Test 9: Testing Authenticated Direct PDF Viewing with Query Token...');
    const pdfRes = await axios.get(`${API_URL}/documents/${documentId}/pdf?token=${token}`, { responseType: 'arraybuffer' });
    assert(pdfRes.status === 200, 'PDF generated and streamed (200 OK)');
    assert(pdfRes.headers['content-type'] === 'application/pdf', 'Content-Type is application/pdf');
    assert(pdfRes.data.length > 500, `PDF size is valid (${pdfRes.data.length} bytes)`);

    // TEST 10: Send Outbound Email with Attachment Payload
    console.log('\n📧 Test 10: Sending Outbound Email with Custom Identity & Attachment Payload...');
    const emailRes = await axios.post(`${API_URL}/emails/send`, {
      to: 'sarah@starling.com',
      subject: 'BCME Platform Setup Confirmation',
      body: '<p>Thank you for choosing BCME Enterprise Suite.</p>',
      customerId,
      attachments: [
        {
          filename: 'welcome_guide.txt',
          content: Buffer.from('Welcome to BCME Platform!').toString('base64'),
          contentType: 'text/plain'
        }
      ]
    }, authHeaders);
    assert(emailRes.data.success, 'Outbound email with file attachment sent successfully');

    // TEST 11: Feature Matrix Check - "Funnel Tracker" Purge
    console.log('\n🔍 Test 11: Verifying Removal of Non-Existent "Funnel Tracker" Feature...');
    const websiteFile = fs.readFileSync(path.join(__dirname, '../frontend/angular-app/src/app/features/public-website/public-website.component.ts'), 'utf8');
    assert(!websiteFile.includes("title: 'Funnel Tracker'"), 'Funnel Tracker removed from Features Matrix');
    assert(websiteFile.includes("title: 'Sales Pipeline & Kanban'"), 'Replaced with Sales Pipeline & Kanban');

    // TEST 12: Re-login Workspace Identity Persistence
    console.log('\n🔄 Test 12: Verifying Workspace Identity Persistence Across Sign-out & Re-login...');
    const reloginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: 'Password123!'
    });
    assert(reloginRes.data.success, 'Re-login successful');
    assert(reloginRes.data.data.workspaceIdentity, 'workspaceIdentity included in login response');
    assert(reloginRes.data.data.workspaceIdentity.workspaceName === updatedName, `Workspace name "${updatedName}" preserved across re-login`);

    // TEST 13: Proposal Deletion API (DELETE /api/documents/:id)
    console.log('\n🗑️ Test 13: Testing Proposal Deletion (DELETE /api/documents/:id)...');
    const delDocRes = await axios.delete(`${API_URL}/documents/${documentId}`, authHeaders);
    assert(delDocRes.data.success, 'Proposal document deleted successfully');

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

runTests();
