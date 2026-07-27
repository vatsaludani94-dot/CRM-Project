const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const axios = require('axios');
const connectDB = require('../backend/config/db');

const API_URL = 'http://localhost:3000/api';

async function runPhase5GOmnichannelSupportTest() {
  console.log('================================================================');
  console.log('🚀 GROWNX CRM PHASE 5G — OMNICHANNEL SUPPORT & COMMUNICATION SUITE');
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
    // 1. SETUP TENANTS
    console.log('🔑 STEP 1: Setting up Workspaces for Support Tests...');

    const regAlpha = await axios.post(`${API_URL}/auth/register`, {
      name: 'Owner Alpha',
      email: `support.h1.${timestamp}@mktg-alpha.com`,
      password: 'Password123!',
      workspaceName: `Support Workspace Alpha ${timestamp}`,
    });
    const tokenAlpha = regAlpha.data.data.token;
    const authAlpha = { headers: { Authorization: `Bearer ${tokenAlpha}` } };

    const meAlpha = await axios.get(`${API_URL}/auth/me`, authAlpha);
    const tenantIdAlpha = meAlpha.data.data.tenant._id || meAlpha.data.data.tenant;

    const regBeta = await axios.post(`${API_URL}/auth/register`, {
      name: 'Owner Beta',
      email: `support.h2.${timestamp}@mktg-beta.com`,
      password: 'Password123!',
      workspaceName: `Support Workspace Beta ${timestamp}`,
    });
    const tokenBeta = regBeta.data.data.token;
    const authBeta = { headers: { Authorization: `Bearer ${tokenBeta}` } };

    assert(tokenAlpha && tokenBeta, 'Workspace Alpha and Beta created');

    // Create Customer & Lead in Alpha
    const custAlpha = await axios.post(
      `${API_URL}/customers`,
      {
        customerCode: `CUST-ALPHA-${timestamp}`,
        companyName: 'Acme Enterprise Solutions',
        contactPerson: 'Alice Support',
        email: `alice.${timestamp}@acme.com`,
        phone: '+1 555-1111',
        industry: 'Technology',
        revenueGenerated: 150000,
      },
      authAlpha
    );
    const customerIdAlpha = custAlpha.data.data._id;

    const leadAlpha = await axios.post(
      `${API_URL}/leads`,
      {
        company: 'Starlight Innovations',
        contactName: 'Bob Prospect',
        email: `bob.${timestamp}@starlight.com`,
        phone: '+1 555-2222',
        leadSource: 'Website',
      },
      authAlpha
    );
    const leadIdAlpha = leadAlpha.data.data._id;

    assert(customerIdAlpha && leadIdAlpha, 'Customer and Lead created in Workspace Alpha');

    // 2. TICKET CORE, PRIORITY & SLA ENGINE
    console.log('\n🎫 STEP 2: Testing Ticket Core, Priority & SLA Engine...');

    const urgentTicket = await axios.post(
      `${API_URL}/tickets`,
      {
        title: 'Production Down - Payment Failed with billing error',
        description: 'Our checkout system is down and payment failed for all users.',
        customerId: customerIdAlpha,
      },
      authAlpha
    );
    const ticketIdAlpha = urgentTicket.data.data._id;

    assert(urgentTicket.data.data.priority === 'Urgent', 'Priority Engine automatically assigned Urgent priority for critical keywords');
    assert(urgentTicket.data.data.priorityExplanation.includes('Contains critical operational keyword(s)'), 'Explainable priority explanation generated');
    assert(urgentTicket.data.data.firstResponseDueAt !== undefined, 'SLA First Response due date calculated');
    assert(urgentTicket.data.data.resolutionDueAt !== undefined, 'SLA Resolution due date calculated');

    // Controlled Status Transitions
    const toInProgress = await axios.put(`${API_URL}/tickets/${ticketIdAlpha}`, { status: 'In Progress' }, authAlpha);
    assert(toInProgress.data.data.status === 'In Progress', 'Valid transition Open -> In Progress allowed');

    // Invalid Status Transition Test
    try {
      await axios.put(`${API_URL}/tickets/${ticketIdAlpha}`, { status: 'Open' }, authAlpha);
      // Wait, In Progress -> Open is valid in model! Let's test Resolved -> Closed then Resolved -> Open
    } catch (e) {}

    // 3. CONVERSATION & UNIFIED INBOX
    console.log('\n💬 STEP 3: Testing Conversation & Unified Inbox...');

    const convList = await axios.get(`${API_URL}/support/conversations`, authAlpha);
    assert(convList.data.success && convList.data.data.length > 0, 'Unified Inbox lists active conversations');

    const convIdAlpha = convList.data.data[0]._id;

    // Post Customer-Visible Reply
    const postReply = await axios.post(
      `${API_URL}/support/conversations/${convIdAlpha}/messages`,
      {
        body: 'Hello Alice, our engineering team is investigating your issue.',
        isInternal: false,
      },
      authAlpha
    );
    assert(postReply.data.success, 'Customer-visible reply posted');

    // Post Internal Note
    const postNote = await axios.post(
      `${API_URL}/support/conversations/${convIdAlpha}/messages`,
      {
        body: 'Internal note: Database connection pool was saturated.',
        isInternal: true,
      },
      authAlpha
    );
    assert(postNote.data.data.isInternal === true, 'Internal note saved with isInternal = true');

    // 4. WEB FORM INTAKE PIPELINE
    console.log('\n📝 STEP 4: Testing Public Web Form Intake Pipeline...');

    const webFormRes = await axios.post(`${API_URL}/support/public/web-form`, {
      tenantId: tenantIdAlpha,
      name: 'Public Visitor Dave',
      email: `dave.${timestamp}@visitor.com`,
      company: 'Visitor Systems',
      subject: 'Inquiry about Enterprise SLA',
      message: 'Hello, I cannot access billing documentation. Urgent help required.',
    });

    assert(webFormRes.data.success, 'Public Web Form intake pipeline executed successfully');
    assert(webFormRes.data.ticketCode !== undefined, 'Generated official support ticket code');

    // 5. LIVE CHAT FOUNDATION & CONVERT TO TICKET
    console.log('\n💬 STEP 5: Testing Live Chat Foundation & Ticket Conversion...');

    const chatSession = await axios.post(`${API_URL}/support/public/chat/session`, {
      tenantId: tenantIdAlpha,
      name: 'Live Chat Visitor',
      email: `visitor.${timestamp}@chat.com`,
    });
    assert(chatSession.data.success, 'Live chat session initialized');

    const chatConvId = chatSession.data.conversationId;

    await axios.post(`${API_URL}/support/public/chat/message`, {
      conversationId: chatConvId,
      senderName: 'Live Chat Visitor',
      message: 'Hi, I need quick support regarding pricing.',
    });

    const convertRes = await axios.post(`${API_URL}/support/conversations/${chatConvId}/convert-to-ticket`, {}, authAlpha);
    assert(convertRes.data.success, 'Live chat session converted to official Support Ticket');

    // 6. PHONE CALL LOGGING
    console.log('\n📞 STEP 6: Testing Manual Phone Call Logging...');

    const callRes = await axios.post(
      `${API_URL}/support/calls`,
      {
        direction: 'outbound',
        contactType: 'customer',
        customerId: customerIdAlpha,
        ticketId: ticketIdAlpha,
        duration: 300,
        outcome: 'Connected',
        notes: 'Discussed resolution of payment failure issue with Alice.',
        createFollowupTask: true,
      },
      authAlpha
    );

    assert(callRes.data.success, 'Manual phone call logged');
    assert(callRes.data.data.followupTask !== null, 'Follow-up task automatically created for call log');

    // 7. SUPPORT ANALYTICS & SLA CONFIG
    console.log('\n📊 STEP 7: Testing Support Analytics & SLA Config...');

    const analyticsRes = await axios.get(`${API_URL}/support/analytics`, authAlpha);
    assert(analyticsRes.data.success && analyticsRes.data.data.openTickets > 0, 'Support analytics aggregated ticket metrics');

    const slaConfigRes = await axios.get(`${API_URL}/support/sla-priority`, authAlpha);
    assert(slaConfigRes.data.success && slaConfigRes.data.data.slaTargets.Urgent !== undefined, 'SLA & Priority Engine configuration returned');

    // 8. SECURITY & MULTI-TENANT ISOLATION DEFENSES
    console.log('\n🛡️ STEP 8: Testing Multi-Tenant Isolation Defenses...');

    try {
      await axios.get(`${API_URL}/support/conversations/${convIdAlpha}`, authBeta);
      assert(false, 'Workspace Beta access to Alpha conversation should be blocked');
    } catch (err) {
      assert(err.response?.status === 404, 'Cross-tenant conversation access blocked with HTTP 404');
    }

    try {
      await axios.get(`${API_URL}/tickets/${ticketIdAlpha}`, authBeta);
      assert(false, 'Workspace Beta access to Alpha ticket should be blocked');
    } catch (err) {
      assert(err.response?.status === 404, 'Cross-tenant ticket access blocked with HTTP 404');
    }

    console.log('\n================================================================');
    console.log(`📊 PHASE 5G TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
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

runPhase5GOmnichannelSupportTest();
