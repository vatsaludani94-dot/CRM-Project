const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:3000/api';

async function runPhase5FTest() {
  console.log('================================================================');
  console.log('🚀 GROWNX CRM PHASE 5F — MARKETING AUTOMATION TEST SUITE');
  console.log('================================================================\n');

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
    console.log('🔑 STEP 1: Setting up Workspace Alpha and Workspace Beta...');

    const regAlpha = await axios.post(`${API_URL}/auth/register`, {
      name: 'Owner Alpha',
      email: `owner.alpha.${timestamp}@mktg-alpha.com`,
      password: 'Password123!',
      workspaceName: `Alpha Growth Corp ${timestamp}`,
    });
    const tokenAlpha = regAlpha.data.data.token;
    const authAlpha = { headers: { Authorization: `Bearer ${tokenAlpha}` } };

    const regBeta = await axios.post(`${API_URL}/auth/register`, {
      name: 'Owner Beta',
      email: `owner.beta.${timestamp}@mktg-beta.com`,
      password: 'Password123!',
      workspaceName: `Beta Media Ltd ${timestamp}`,
    });
    const tokenBeta = regBeta.data.data.token;
    const authBeta = { headers: { Authorization: `Bearer ${tokenBeta}` } };

    assert(tokenAlpha && tokenBeta, 'Workspace Alpha and Beta created and authenticated');

    // 2. POPULATE LEADS & CUSTOMERS
    console.log('\n📦 STEP 2: Creating Leads and Customers in Workspace Alpha...');

    const lead1 = await axios.post(
      `${API_URL}/leads`,
      {
        company: 'Apex Innovations',
        contactName: 'Alice Alpha',
        email: `alice.alpha.${timestamp}@apex.com`,
        phone: '+1 555-0199',
        expectedRevenue: 60000,
        leadSource: 'Website',
      },
      authAlpha
    );

    const cust1 = await axios.post(
      `${API_URL}/customers`,
      {
        companyName: 'Starlight Retail',
        contactPerson: 'Bhavini Shah',
        email: `bhavini.${timestamp}@starlight.com`,
        phone: '+1 555-0299',
        industry: 'Retail',
        revenueGenerated: 120000,
      },
      authAlpha
    );

    assert(lead1.data.success && cust1.data.success, 'Lead and Customer created in Workspace Alpha');

    // 3. AUDIENCE PREVIEW & SEGMENTATION
    console.log('\n🎯 STEP 3: Testing Audience Preview & Segmentation Engine...');

    const previewRes = await axios.post(
      `${API_URL}/marketing/audience/preview`,
      {
        audienceDefinition: {
          targetType: 'Both',
          leadFilters: { minExpectedRevenue: 10000 },
          customerFilters: { minRevenue: 50000 },
        },
        emailContent: {
          subject: 'Exclusive Update for {{contactName}}',
          body: 'Hi {{firstName}},\n\nWelcome to {{workspaceName}}! We are excited to collaborate with {{companyName}}.',
        },
      },
      authAlpha
    );

    assert(previewRes.data.success, 'Audience preview query succeeded');
    assert(previewRes.data.data.totalMatched >= 2, 'Matched eligible Lead and Customer records');
    assert(previewRes.data.data.eligibleRecipients >= 2, 'Eligible recipient count matches expected data');
    assert(previewRes.data.data.sampleRecipients.length > 0, 'Sample recipient list generated with personalization preview');

    const sample = previewRes.data.data.sampleRecipients[0];
    assert(!sample.personalizedSubjectPreview.includes('{{contactName}}'), 'Personalization token {{contactName}} replaced in subject');
    assert(!sample.personalizedBodyPreview.includes('{{firstName}}'), 'Personalization token {{firstName}} replaced in body');

    // 4. CAMPAIGN CRUD & LIFECYCLE
    console.log('\n📝 STEP 4: Testing Campaign Creation & Lifecycle Management...');

    const campRes = await axios.post(
      `${API_URL}/marketing/campaigns`,
      {
        name: 'Q3 Enterprise Product Launch',
        description: 'Target high value leads and customers',
        type: 'Email Campaign',
        audienceDefinition: {
          targetType: 'Both',
          leadFilters: { minExpectedRevenue: 10000 },
        },
        emailContent: {
          subject: 'New Enterprise Feature Launch for {{companyName}}',
          body: 'Hello {{contactName}},\n\n{{workspaceName}} is proud to introduce our new enterprise suite for {{companyName}}.',
        },
        schedule: { sendType: 'Now' },
      },
      authAlpha
    );

    assert(campRes.data.success, 'Campaign created in Draft status');
    const campaignId = campRes.data.data._id;

    const listRes = await axios.get(`${API_URL}/marketing/campaigns`, authAlpha);
    assert(listRes.data.data.some((c) => c._id === campaignId), 'Created campaign appears in campaign list');

    // 5. TEST EMAIL DELIVERY (DOES NOT ALTER CAMPAIGN STATUS)
    console.log('\n📧 STEP 5: Testing Campaign Test Email Delivery...');

    const testEmailRes = await axios.post(
      `${API_URL}/marketing/campaigns/${campaignId}/test`,
      { testEmail: `tester.${timestamp}@mktg-alpha.com` },
      authAlpha
    );

    assert(testEmailRes.data.success, 'Test email delivered successfully using workspace sender identity');

    const checkCampAfterTest = await axios.get(`${API_URL}/marketing/campaigns/${campaignId}`, authAlpha);
    assert(checkCampAfterTest.data.data.campaign.status === 'Draft', 'Campaign remains in Draft status after test email');

    // 6. UNSUBSCRIBE & SUPPRESSION SYSTEM
    console.log('\n🔕 STEP 6: Testing Unsubscribe Link & Suppression Engine...');

    const jwt = require('jsonwebtoken');
    const meAlpha = await axios.get(`${API_URL}/auth/me`, authAlpha);
    const tenantIdAlpha = meAlpha.data.data.tenant._id || meAlpha.data.data.tenant;
    const unsubToken = jwt.sign(
      { tenantId: tenantIdAlpha, email: `alice.alpha.${timestamp}@apex.com` },
      process.env.JWT_SECRET || 'grownxcrm_jwt_secret_key_2026'
    );

    const unsubHttpRes = await axios.get(`${API_URL}/marketing/unsubscribe/${unsubToken}`);
    assert(unsubHttpRes.status === 200 && unsubHttpRes.data.includes('Unsubscribed Successfully'), 'Public unsubscribe link decoded and processed successfully');

    // Verify unsubscribed contact is excluded in audience preview
    const previewAfterUnsub = await axios.post(
      `${API_URL}/marketing/audience/preview`,
      {
        audienceDefinition: { targetType: 'Both' },
      },
      authAlpha
    );

    assert(previewAfterUnsub.data.data.unsubscribedExcluded >= 1, 'Unsubscribed recipient correctly excluded from eligible recipients');

    // 7. CAMPAIGN IMMEDIATE EXECUTION & IDEMPOTENCY
    console.log('\n⚡ STEP 7: Testing Immediate Campaign Send & Idempotent Lock...');

    const sendRes = await axios.post(`${API_URL}/marketing/campaigns/${campaignId}/send`, {}, authAlpha);
    assert(sendRes.data.success, 'Immediate campaign send executed successfully');

    const campCompleted = await axios.get(`${API_URL}/marketing/campaigns/${campaignId}`, authAlpha);
    assert(campCompleted.data.data.campaign.status === 'Completed', 'Campaign status updated to Completed');
    assert(campCompleted.data.data.campaign.metrics.sentCount >= 1, 'Delivery metrics recorded sent recipient count');
    assert(campCompleted.data.data.recipients.length >= 1, 'Individual CampaignRecipient records saved');

    // Test Idempotent Protection: Second send attempt must be rejected
    try {
      await axios.post(`${API_URL}/marketing/campaigns/${campaignId}/send`, {}, authAlpha);
      assert(false, 'Duplicate campaign send was NOT blocked');
    } catch (err) {
      assert(err.response && err.response.status === 400, 'Duplicate campaign send safely blocked by execution lock');
    }

    // 8. CRM INTEGRATION (LEAD TIMELINE & CUSTOMER 360)
    console.log('\n📊 STEP 8: Testing CRM Intelligence Integration (Timelines)...');

    const cust360Res = await axios.get(`${API_URL}/customers/${cust1.data.data._id}/360`, authAlpha);
    const hasMktgActivity = cust360Res.data.data.customer.activities.some((a) => a.description.includes('Marketing Campaign Email Sent'));
    assert(hasMktgActivity, 'Marketing campaign execution recorded in Customer 360 activity log');

    // 9. WORKFLOW AUTOMATION INTEGRATION
    console.log('\n⚡ STEP 9: Testing Workflow Engine Marketing Integration...');

    const wfRes = await axios.post(
      `${API_URL}/workflows`,
      {
        name: 'Auto Welcome Marketing Email',
        trigger: 'Lead Created',
        steps: [
          {
            type: 'Action',
            config: {
              actionType: 'Send Direct Marketing Email',
              emailSubject: 'Welcome to Workspace Alpha!',
              emailBody: '<p>Thank you for reaching out!</p>',
            },
          },
        ],
      },
      authAlpha
    );
    assert(wfRes.data.success, 'Created workflow rule with marketing action');

    // 10. MARKETING ANALYTICS
    console.log('\n📈 STEP 10: Testing Workspace Marketing Analytics...');

    const analyticsRes = await axios.get(`${API_URL}/marketing/analytics`, authAlpha);
    assert(analyticsRes.data.success && analyticsRes.data.data.completedCampaigns >= 1, 'Workspace marketing analytics aggregated completed campaign metrics');

    // 11. SECURITY & CROSS-TENANT ISOLATION
    console.log('\n🛡️ STEP 11: Testing Bidirectional Multi-Tenant Security Isolation...');

    // Beta attempting to read Alpha's campaign
    try {
      await axios.get(`${API_URL}/marketing/campaigns/${campaignId}`, authBeta);
      assert(false, 'Beta accessed Alpha campaign by ID');
    } catch (err) {
      assert(err.response && err.response.status === 404, 'Beta access to Alpha campaign blocked with HTTP 404');
    }

    // Beta attempting to execute Alpha's campaign
    try {
      await axios.post(`${API_URL}/marketing/campaigns/${campaignId}/send`, {}, authBeta);
      assert(false, 'Beta executed Alpha campaign');
    } catch (err) {
      assert(err.response && err.response.status === 404, 'Beta execution of Alpha campaign blocked with HTTP 404');
    }

    // Beta attempting to delete Alpha's campaign
    try {
      await axios.delete(`${API_URL}/marketing/campaigns/${campaignId}`, authBeta);
      assert(false, 'Beta deleted Alpha campaign');
    } catch (err) {
      assert(err.response && err.response.status === 404, 'Beta deletion of Alpha campaign blocked with HTTP 404');
    }

    console.log('\n================================================================');
    console.log(`📊 PHASE 5F TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('CRITICAL TEST ERROR:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

runPhase5FTest();
