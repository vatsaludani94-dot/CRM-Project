const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const axios = require('axios');
const connectDB = require('../backend/config/db');

const API_URL = 'http://localhost:3000/api';

async function runPhase5G1EmailFirstSupportTest() {
  console.log('================================================================');
  console.log('🚀 GROWNX CRM PHASE 5G-1 — EMAIL-FIRST SUPPORT & AI CLARIFICATION SUITE');
  console.log('================================================================\n');

  await connectDB();

  const timestamp = Date.now();
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

  try {
    // 1. SETUP TENANTS & USERS
    console.log('🔑 STEP 1: Setting up Workspaces for Support Mailbox Tests...');

    const regAlpha = await axios.post(`${API_URL}/auth/register`, {
      name: 'Owner Alpha',
      email: `support.care.a.${timestamp}@mktg-alpha.com`,
      password: 'Password123!',
      workspaceName: `Support Mailbox Workspace Alpha ${timestamp}`,
    });
    const tokenAlpha = regAlpha.data.data.token;
    const authAlpha = { headers: { Authorization: `Bearer ${tokenAlpha}` } };

    const meAlpha = await axios.get(`${API_URL}/auth/me`, authAlpha);
    const tenantIdAlpha = meAlpha.data.data.tenant._id || meAlpha.data.data.tenant;

    const regBeta = await axios.post(`${API_URL}/auth/register`, {
      name: 'Owner Beta',
      email: `support.care.b.${timestamp}@mktg-beta.com`,
      password: 'Password123!',
      workspaceName: `Support Mailbox Workspace Beta ${timestamp}`,
    });
    const tokenBeta = regBeta.data.data.token;
    const authBeta = { headers: { Authorization: `Bearer ${tokenBeta}` } };

    // Create Employee User in Workspace Alpha for manual assignment
    const User = require('../backend/models/User');
    const agentAlpha = await User.create({
      name: 'Brian Williams Agent',
      email: `brian.agent.${timestamp}@mktg-alpha.com`,
      password: 'Password123!',
      role: 'employee',
      department: 'Customer Support',
      tenant: tenantIdAlpha,
    });
    const agentIdAlpha = agentAlpha._id;

    // Create Customer in Workspace Alpha
    const custAlpha = await axios.post(
      `${API_URL}/customers`,
      {
        customerCode: `CUST-G1-${timestamp}`,
        companyName: 'Omega Global Care',
        contactPerson: 'Sarah Support',
        email: `sarah.${timestamp}@omega.com`,
        phone: '+1 555-8888',
        industry: 'Technology',
        revenueGenerated: 120000,
      },
      authAlpha
    );
    const customerIdAlpha = custAlpha.data.data._id;

    assert(tokenAlpha && tokenBeta && agentIdAlpha && customerIdAlpha, 'Workspace Alpha, Beta, Agent, and Customer setup complete');

    // 2. SUPPORT MAILBOX IDENTITY
    console.log('\n📧 STEP 2: Testing Dedicated Support Mailbox Identity...');

    const mailboxRes = await axios.get(`${API_URL}/support/mailbox-identity`, authAlpha);
    assert(mailboxRes.data.success, 'Fetched workspace support mailbox identity');
    assert(mailboxRes.data.data.supportMailboxEmail.includes('@'), 'Support care mailbox email address resolved');
    assert(mailboxRes.data.data.connectionStatus !== undefined, 'Connection status returned without fake data');

    // 3. EMAIL SUPPORT INTAKE & TICKET REUSE / CREATION
    console.log('\n📩 STEP 3: Testing Email Support Intake Pipeline & Ticket Re-use Rules...');

    // 3A. First Email Inbound -> Creates Ticket + Sends Acknowledgment
    const intake1 = await axios.post(`${API_URL}/support/public/email-intake`, {
      tenantId: tenantIdAlpha,
      senderName: 'Sarah Support',
      senderEmail: `sarah.${timestamp}@omega.com`,
      subject: 'Payment Error on Checkout System',
      body: 'Our checkout system shows payment failed error with billing problem.',
    });

    assert(intake1.data.success, 'First support email intake processed');
    assert(intake1.data.isAppended === false, 'New support ticket created for fresh issue');
    assert(intake1.data.acknowledgmentSent === true, 'Automated customer-facing noreply acknowledgment sent');

    const ticketCode1 = intake1.data.ticketCode;

    // Fetch created ticket
    const ticketList1 = await axios.get(`${API_URL}/tickets`, authAlpha);
    const ticket1 = ticketList1.data.data.find((t) => t.ticketCode === ticketCode1);
    assert(ticket1 !== undefined, 'Created ticket retrieved in Support Queue');
    const ticketId1 = ticket1._id;

    // 3B. Second Email Inbound (Open Ticket Exists) -> Appends to existing ticket!
    const intake2 = await axios.post(`${API_URL}/support/public/email-intake`, {
      tenantId: tenantIdAlpha,
      senderName: 'Sarah Support',
      senderEmail: `sarah.${timestamp}@omega.com`,
      subject: 'Re: Payment Error on Checkout System',
      body: 'Here is additional context: Error code is ERR-402.',
    });

    assert(intake2.data.success && intake2.data.isAppended === true, 'Matching open ticket reused and message appended');

    // 4. MANUAL AGENT ASSIGNMENT & WORKSPACE ACTIONS
    console.log('\n👨‍💼 STEP 4: Testing Manual Agent Assignment & Agent Workspace...');

    const assignRes = await axios.put(`${API_URL}/tickets/${ticketId1}/assign`, { assignedEmployee: agentIdAlpha }, authAlpha);
    assert(assignRes.data.success, 'Ticket manually assigned to agent');
    const assignedEmpId = assignRes.data.data.assignedEmployee?._id || assignRes.data.data.assignedEmployee;
    assert(String(assignedEmpId) === String(agentIdAlpha), 'Assigned agent matches selected employee');
    assert(assignRes.data.data.status === 'Assigned', 'Ticket status updated to Assigned');

    // Add Internal Note vs Customer Reply
    const internalNote = await axios.post(
      `${API_URL}/tickets/${ticketId1}/comments`,
      { comment: 'Agent Note: Verified DB billing table status.', isInternal: true },
      authAlpha
    );
    assert(internalNote.data.data.isInternal === true, 'Internal note saved for workspace staff');

    const customerReply = await axios.post(
      `${API_URL}/tickets/${ticketId1}/comments`,
      { comment: 'Customer Reply: We have resolved the payment gateway issue.', isInternal: false },
      authAlpha
    );
    assert(customerReply.data.data.isInternal === false, 'Customer-facing reply saved');

    // 5. ATTACHMENT UPLOAD & SECURITY VALIDATION
    console.log('\n📎 STEP 5: Testing Attachment Uploads & File Validation...');

    const validAttRes = await axios.post(
      `${API_URL}/tickets/${ticketId1}/comments`,
      {
        comment: 'Uploading error log screenshot',
        isInternal: false,
        attachments: [{ fileName: 'error_log.png', fileUrl: '/uploads/error_log.png', fileType: 'image/png', fileSize: 102400 }],
      },
      authAlpha
    );
    assert(validAttRes.data.success, 'Valid image attachment accepted');

    try {
      await axios.post(
        `${API_URL}/tickets/${ticketId1}/comments`,
        {
          comment: 'Malicious payload',
          attachments: [{ fileName: 'virus.exe', fileUrl: '/uploads/virus.exe' }],
        },
        authAlpha
      );
      assert(false, 'Forbidden executable binary attachment should be rejected');
    } catch (e) {
      assert(e.response?.status === 400, 'Forbidden executable binary attachment rejected with HTTP 400');
    }

    // 6. AI CLARIFICATION FLOW
    console.log('\n🤖 STEP 6: Testing AI Clarification Flow (Agent Unavailable)...');

    const aiClarify1 = await axios.post(`${API_URL}/tickets/${ticketId1}/ai-clarify`, { step: 1 }, authAlpha);
    assert(aiClarify1.data.success, 'AI Clarification flow initiated');
    assert(aiClarify1.data.data.aiQuestion.includes('GrownX AI Support Assistant'), 'AI disclosure header present');

    const aiClarify5 = await axios.post(
      `${API_URL}/tickets/${ticketId1}/ai-clarify`,
      { step: 5, customerResponse: 'Single checkout service' },
      authAlpha
    );
    assert(aiClarify5.data.data.isFinalSummary === true, 'AI generated structured issue summary');

    // 7. TICKET RESOLUTION & REOPENING
    console.log('\n✅ STEP 7: Testing Ticket Resolution, Closure & Reopening...');

    // Attempt resolve without resolutionSummary -> HTTP 400
    try {
      await axios.put(`${API_URL}/tickets/${ticketId1}/resolve`, { resolutionSummary: '' }, authAlpha);
      assert(false, 'Resolution without summary should be blocked');
    } catch (e) {
      assert(e.response?.status === 400, 'Resolution without summary blocked with HTTP 400');
    }

    const resolveRes = await axios.put(
      `${API_URL}/tickets/${ticketId1}/resolve`,
      { resolutionSummary: 'Fixed payment gateway API key configuration.' },
      authAlpha
    );
    assert(resolveRes.data.success, 'Ticket resolved with resolution summary');
    assert(resolveRes.data.data.resolutionDurationMinutes !== undefined, 'Resolution duration in minutes recorded');

    // Reopen Ticket
    const reopenRes = await axios.put(`${API_URL}/tickets/${ticketId1}/reopen`, {}, authAlpha);
    assert(reopenRes.data.success && reopenRes.data.data.status === 'Reopened', 'Ticket reopened successfully');

    // 8. SECURITY & MULTI-TENANT ISOLATION DEFENSES
    console.log('\n🛡️ STEP 8: Testing Multi-Tenant Isolation Defenses...');

    try {
      await axios.get(`${API_URL}/tickets/${ticketId1}`, authBeta);
      assert(false, 'Workspace Beta access to Alpha ticket should be blocked');
    } catch (err) {
      assert(err.response?.status === 404, 'Cross-tenant ticket access blocked with HTTP 404');
    }

    console.log('\n================================================================');
    console.log(`📊 PHASE 5G-1 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL TEST ERROR:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

runPhase5G1EmailFirstSupportTest();
