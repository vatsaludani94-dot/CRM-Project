const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:3000/api';

const connectDB = require('../backend/config/db');

async function runPhase5F1HardeningTest() {
  console.log('================================================================');
  console.log('🚀 GROWNX CRM PHASE 5F-1 — MARKETING HARDENING & SCHEDULING TEST');
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
    console.log('🔑 STEP 1: Setting up Workspaces for Hardening Tests...');

    const regAlpha = await axios.post(`${API_URL}/auth/register`, {
      name: 'Owner Alpha',
      email: `owner.h1.${timestamp}@mktg-h1.com`,
      password: 'Password123!',
      workspaceName: `Hardened Alpha ${timestamp}`,
    });
    const tokenAlpha = regAlpha.data.data.token;
    const authAlpha = { headers: { Authorization: `Bearer ${tokenAlpha}` } };

    const meAlpha = await axios.get(`${API_URL}/auth/me`, authAlpha);
    const tenantIdAlpha = meAlpha.data.data.tenant._id || meAlpha.data.data.tenant;

    const regBeta = await axios.post(`${API_URL}/auth/register`, {
      name: 'Owner Beta',
      email: `owner.h2.${timestamp}@mktg-h2.com`,
      password: 'Password123!',
      workspaceName: `Hardened Beta ${timestamp}`,
    });
    const tokenBeta = regBeta.data.data.token;
    const authBeta = { headers: { Authorization: `Bearer ${tokenBeta}` } };

    assert(tokenAlpha && tokenBeta, 'Workspace Alpha and Beta created');

    // 2. PART 1: REAL-TIME UNSUBSCRIBE SUPPRESSION
    console.log('\n🔕 STEP 2: Testing Real-Time Unsubscribe Suppression Engine...');

    const lead1 = await axios.post(
      `${API_URL}/leads`,
      {
        company: 'Suppression Test Corp',
        contactName: 'Charlie Suppressed',
        email: `charlie.${timestamp}@suppressed.com`,
        phone: '+1 555-0999',
        expectedRevenue: 50000,
        leadSource: 'Website',
      },
      authAlpha
    );

    // Unsubscribe charlie in Workspace Alpha
    const unsubToken = jwt.sign(
      { tenantId: tenantIdAlpha, email: `charlie.${timestamp}@suppressed.com` },
      process.env.JWT_SECRET || 'grownxcrm_jwt_secret_key_2026'
    );
    await axios.get(`${API_URL}/marketing/unsubscribe/${unsubToken}`);

    // Create Campaign
    const camp1 = await axios.post(
      `${API_URL}/marketing/campaigns`,
      {
        name: 'Suppression Guard Campaign',
        type: 'Email Campaign',
        audienceDefinition: { targetType: 'Leads' },
        emailContent: {
          subject: 'Special Offer',
          body: 'Hello {{contactName}}',
        },
        schedule: { sendType: 'Now' },
      },
      authAlpha
    );
    const camp1Id = camp1.data.data._id;

    // Execute Campaign Send
    const execRes1 = await axios.post(`${API_URL}/marketing/campaigns/${camp1Id}/send`, {}, authAlpha);
    assert(execRes1.data.success, 'Campaign execution completed');

    const getCamp1 = await axios.get(`${API_URL}/marketing/campaigns/${camp1Id}`, authAlpha);
    const recs1 = getCamp1.data.data.recipients;

    const suppRec = recs1.find((r) => r.recipientEmail === `charlie.${timestamp}@suppressed.com`);
    assert(suppRec !== undefined, 'Suppressed recipient record exists in CampaignRecipient log');
    assert(suppRec.status === 'Suppressed', 'CampaignRecipient status is Suppressed');
    assert(suppRec.suppressionReason === 'marketing_unsubscribed', 'Suppression reason recorded as marketing_unsubscribed');
    assert(getCamp1.data.data.campaign.metrics.sentCount === 0, 'Zero outbound email delivered to unsubscribed recipient');

    // Verify sendTestEmail blocked for unsubscribed test recipient
    try {
      await axios.post(
        `${API_URL}/marketing/campaigns/${camp1Id}/test`,
        { testEmail: `charlie.${timestamp}@suppressed.com` },
        authAlpha
      );
      assert(false, 'Sending test email to unsubscribed recipient should be blocked');
    } catch (err) {
      assert(err.response?.status === 400, 'Sending test email to unsubscribed recipient returns HTTP 400');
      assert(
        err.response?.data?.error?.includes('unsubscribed'),
        'Test email endpoint clearly warns recipient is unsubscribed in workspace'
      );
    }

    // 3. PART 2: REAL CAMPAIGN SCHEDULING & SCHEDULER ISOLATION
    console.log('\n📅 STEP 3: Testing Real Campaign Scheduling & Scheduler Engine...');

    const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 mins in future
    const schedCamp = await axios.post(
      `${API_URL}/marketing/campaigns`,
      {
        name: 'Future Scheduled Campaign',
        type: 'Email Campaign',
        audienceDefinition: { targetType: 'Leads' },
        emailContent: {
          subject: 'Future Announcement',
          body: 'Hi {{contactName}}',
        },
        schedule: {
          sendType: 'Scheduled',
          scheduledAt: futureDate.toISOString(),
          timezone: 'Asia/Kolkata',
        },
        status: 'Scheduled',
      },
      authAlpha
    );
    const schedId = schedCamp.data.data._id;

    assert(schedCamp.data.data.status === 'Scheduled', 'Campaign created in Scheduled status');

    // Invoke scheduler manually before due time
    const { checkAndExecuteScheduledCampaigns } = require('../backend/services/marketingScheduler');
    await checkAndExecuteScheduledCampaigns();

    const checkBeforeDue = await axios.get(`${API_URL}/marketing/campaigns/${schedId}`, authAlpha);
    assert(checkBeforeDue.data.data.campaign.status === 'Scheduled', 'Campaign remains in Scheduled status before due time');

    // Update scheduledAt to past date and re-run scheduler
    await axios.post(
      `${API_URL}/marketing/campaigns/${schedId}/schedule`,
      {
        scheduledAt: new Date(Date.now() - 10000).toISOString(),
        timezone: 'Asia/Kolkata',
      },
      authAlpha
    );

    await checkAndExecuteScheduledCampaigns();

    const checkAfterDue = await axios.get(`${API_URL}/marketing/campaigns/${schedId}`, authAlpha);
    assert(checkAfterDue.data.data.campaign.status === 'Completed', 'Scheduler executed due campaign and updated status to Completed');

    // Test Pause & Cancel Actions
    const pauseCamp = await axios.post(
      `${API_URL}/marketing/campaigns`,
      {
        name: 'Pausable Campaign',
        type: 'Email Campaign',
        audienceDefinition: { targetType: 'Leads' },
        emailContent: { subject: 'Test', body: 'Test' },
        schedule: { sendType: 'Scheduled', scheduledAt: new Date(Date.now() - 5000).toISOString() },
        status: 'Scheduled',
      },
      authAlpha
    );
    const pauseId = pauseCamp.data.data._id;

    await axios.post(`${API_URL}/marketing/campaigns/${pauseId}/pause`, {}, authAlpha);
    const checkPaused = await axios.get(`${API_URL}/marketing/campaigns/${pauseId}`, authAlpha);
    assert(checkPaused.data.data.campaign.status === 'Paused', 'Campaign status updated to Paused');

    await checkAndExecuteScheduledCampaigns();
    const checkPausedAfterSched = await axios.get(`${API_URL}/marketing/campaigns/${pauseId}`, authAlpha);
    assert(checkPausedAfterSched.data.data.campaign.status === 'Paused', 'Paused campaign was NOT executed by scheduler');

    // 4. PART 3: NATURAL-LANGUAGE WORKFLOW BUILDER & CAPABILITY PARSER
    console.log('\n🤖 STEP 4: Testing Natural-Language Workflow Builder & Safety Validation...');

    const registryRes = await axios.get(`${API_URL}/workflows/capabilities`, authAlpha);
    assert(registryRes.data.success && registryRes.data.data.triggers.length > 0, 'Workspace capability registry returned implemented capabilities');

    // Parse Valid Prompt
    const validParse = await axios.post(
      `${API_URL}/workflows/parse-intent`,
      {
        prompt: 'When a lead becomes Interested, send them an email introducing our services and create a follow-up task after 2 days.',
      },
      authAlpha
    );

    assert(validParse.data.success, 'Natural language parser analyzed request');
    assert(validParse.data.data.canActivate === true, 'Valid workflow request marked as canActivate = true');
    assert(validParse.data.data.trigger.key === 'Lead Stage Changed', 'Trigger mapped to Lead Stage Changed');
    assert(validParse.data.data.steps.some((s) => s.config?.actionType === 'Send Direct Marketing Email'), 'Send Direct Marketing Email action recognized');
    assert(validParse.data.data.steps.some((s) => s.type === 'Delay'), 'Delay step recognized');

    // Parse Unsupported Channel Prompt (WhatsApp)
    const invalidParse = await axios.post(
      `${API_URL}/workflows/parse-intent`,
      {
        prompt: 'When a lead becomes Interested, send them a WhatsApp message.',
      },
      authAlpha
    );

    assert(invalidParse.data.success, 'Parser returned structured output for unsupported channel');
    assert(invalidParse.data.data.canActivate === false, 'Workflow with unsupported channel marked as canActivate = false');
    assert(invalidParse.data.data.unsupportedActions.length > 0, 'Unsupported action WhatsApp Message detected and flagged');
    assert(invalidParse.data.data.unsupportedActions[0].reason.includes('not currently connected'), 'Clear explanation provided for missing integration');
    assert(invalidParse.data.data.unsupportedActions[0].alternatives.length > 0, 'Supported alternatives suggested');

    console.log('\n================================================================');
    console.log(`📊 PHASE 5F-1 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
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

runPhase5F1HardeningTest();
