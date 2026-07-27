const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const API_URL = 'http://localhost:3000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/grownxcrm';

async function runTests() {
  console.log('\n================================================================');
  console.log('🚀 GROWNX CRM PHASE 5F.2 — TEMPLATE PERSISTENCE & UI CONTRAST SUITE');
  console.log('================================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected:', mongoose.connection.host);

    const timestamp = Date.now();

    // STEP 1: Setup Workspaces Alpha & Beta
    console.log('\n🔑 STEP 1: Setting up Workspaces for Persistence Tests...');
    const regAlpha = await axios.post(`${API_URL}/auth/register`, {
      name: 'Alpha Owner Persistence',
      email: `alpha.pers.${timestamp}@mktg-alpha.com`,
      password: 'Password123!',
      workspaceName: `Alpha Persistence Workspace ${timestamp}`,
    });
    const tokenAlpha = regAlpha.data.data.token;
    const authAlpha = { headers: { Authorization: `Bearer ${tokenAlpha}` } };
    const meAlpha = await axios.get(`${API_URL}/auth/me`, authAlpha);
    const tenantIdAlpha = meAlpha.data.data.tenant._id || meAlpha.data.data.tenant;

    const regBeta = await axios.post(`${API_URL}/auth/register`, {
      name: 'Beta Owner Persistence',
      email: `beta.pers.${timestamp}@mktg-beta.com`,
      password: 'Password123!',
      workspaceName: `Beta Persistence Workspace ${timestamp}`,
    });
    const tokenBeta = regBeta.data.data.token;
    const authBeta = { headers: { Authorization: `Bearer ${tokenBeta}` } };
    const meBeta = await axios.get(`${API_URL}/auth/me`, authBeta);
    const tenantIdBeta = meBeta.data.data.tenant._id || meBeta.data.data.tenant;

    console.log('✅ [PASS] Workspace Alpha and Beta registered and authenticated');

    // STEP 2: Website Builder Persistence & Seeding
    console.log('\n🌐 STEP 2: Testing Website Builder Template Persistence...');
    const getWebsitesAlpha1 = await axios.get(`${API_URL}/builders/websites`, authAlpha);
    assert(getWebsitesAlpha1.data.success, 'Fetched websites for Workspace Alpha');
    assert(getWebsitesAlpha1.data.count > 0, 'Workspace Alpha received seeded website document');
    const websiteAlpha = getWebsitesAlpha1.data.data[0];
    const websiteIdAlpha = websiteAlpha._id;
    console.log('✅ [PASS] Initial workspace website auto-seeded with default sections');

    // Edit website layout and add custom block
    const updatedSections = [
      ...websiteAlpha.sections,
      { type: 'Hero', title: 'Custom High-Conversion Hero Banner', subtitle: 'Persisted in MongoDB', style: { backgroundColor: '#0f172a', textColor: '#ffffff' } }
    ];
    const updateSiteRes = await axios.put(
      `${API_URL}/builders/websites/${websiteIdAlpha}`,
      { name: 'Alpha Custom Enterprise Site', sections: updatedSections, domain: 'www.alpha-enterprise.com' },
      authAlpha
    );
    assert(updateSiteRes.data.success, 'Website updated successfully');
    assert(updateSiteRes.data.data.name === 'Alpha Custom Enterprise Site', 'Updated website name saved');
    assert(updateSiteRes.data.data.sections.length === updatedSections.length, 'Custom section appended and saved');
    console.log('✅ [PASS] Website edits saved to MongoDB database');

    // Simulate browser refresh / re-login
    const getWebsitesAlpha2 = await axios.get(`${API_URL}/builders/websites`, authAlpha);
    const reloadedSite = getWebsitesAlpha2.data.data.find(s => s._id === websiteIdAlpha);
    assert(reloadedSite, 'Reloaded website document exists');
    assert(reloadedSite.name === 'Alpha Custom Enterprise Site', 'Website name persisted across refresh');
    assert(reloadedSite.domain === 'www.alpha-enterprise.com', 'Custom domain persisted across refresh');
    assert(reloadedSite.sections.some(sec => sec.title === 'Custom High-Conversion Hero Banner'), 'Custom section layout persisted across refresh');
    console.log('✅ [PASS] Website template changes survived reload and re-fetch');

    // STEP 3: Workflow Automation Engine Persistence
    console.log('\n⚙️ STEP 3: Testing Automation Engine Workflow Persistence...');
    const getWfAlpha1 = await axios.get(`${API_URL}/workflows`, authAlpha);
    assert(getWfAlpha1.data.success, 'Fetched workflows for Workspace Alpha');
    assert(getWfAlpha1.data.count >= 3, 'Workspace Alpha received default seeded workflows');
    console.log('✅ [PASS] Default workspace workflows automatically seeded for tenant');

    // Create custom workflow
    const createWfRes = await axios.post(
      `${API_URL}/workflows`,
      {
        name: 'Custom Lead SLA Escalation Workflow',
        trigger: 'Lead Stage Changed',
        steps: [
          { type: 'Action', config: { actionType: 'Send Direct Marketing Email', emailSubject: 'SLA Notice', emailBody: 'Your lead state changed.' } },
          { type: 'Delay', config: { delayDuration: 1, delayUnit: 'hours' } },
          { type: 'Action', config: { actionType: 'Create Task', taskTitle: 'Escalate stagnant lead', taskPriority: 'Urgent' } }
        ]
      },
      authAlpha
    );
    assert(createWfRes.data.success, 'Created custom workflow');
    const customWfId = createWfRes.data.data._id;
    console.log('✅ [PASS] Custom workflow created and saved to MongoDB');

    // Re-fetch workflows to confirm persistence
    const getWfAlpha2 = await axios.get(`${API_URL}/workflows`, authAlpha);
    const reloadedWf = getWfAlpha2.data.data.find(w => w._id === customWfId);
    assert(reloadedWf, 'Custom workflow returned in workflow list');
    assert(reloadedWf.name === 'Custom Lead SLA Escalation Workflow', 'Custom workflow name persisted');
    assert(reloadedWf.steps.length === 3, 'Custom workflow steps persisted');
    console.log('✅ [PASS] Custom workflow persisted permanently in database');

    // STEP 4: Execution Logs Loading
    console.log('\n📊 STEP 4: Testing Execution Logs Endpoint...');
    const logsRes = await axios.get(`${API_URL}/workflows/logs`, authAlpha);
    assert(logsRes.data.success, 'Execution logs API returned 200 OK');
    assert(Array.isArray(logsRes.data.data), 'Execution logs returned as array');
    console.log('✅ [PASS] Execution Logs loaded successfully from backend');

    // STEP 5: Authorized Manual Deletion
    console.log('\n🗑️ STEP 5: Testing Authorized Manual Deletion...');
    const delWfRes = await axios.delete(`${API_URL}/workflows/${customWfId}`, authAlpha);
    assert(delWfRes.data.success, 'Custom workflow deleted successfully');

    const getWfAlpha3 = await axios.get(`${API_URL}/workflows`, authAlpha);
    const deletedWfCheck = getWfAlpha3.data.data.find(w => w._id === customWfId);
    assert(!deletedWfCheck, 'Deleted workflow does not appear in workflow list');
    console.log('✅ [PASS] Deleted workflow removed permanently');

    // STEP 6: Multi-Tenant Isolation Defenses
    console.log('\n🛡️ STEP 6: Testing Cross-Tenant Template Isolation...');
    try {
      await axios.put(`${API_URL}/builders/websites/${websiteIdAlpha}`, { name: 'Hacked Site' }, authBeta);
      assert.fail('Should have blocked cross-tenant website update');
    } catch (err) {
      assert(err.response && err.response.status === 404, 'Cross-tenant website update blocked with HTTP 404');
    }

    const getWebsitesBeta = await axios.get(`${API_URL}/builders/websites`, authBeta);
    const hasAlphaSite = getWebsitesBeta.data.data.some(s => s._id === websiteIdAlpha);
    assert(!hasAlphaSite, 'Workspace B cannot see Workspace A websites');
    console.log('✅ [PASS] Cross-tenant website & template access blocked');

    // STEP 7: Frontend UI Contrast Checks
    console.log('\n🎨 STEP 7: Verifying Frontend UI Contrast Hardening...');
    const wfComponentPath = path.join(__dirname, '../frontend/angular-app/src/app/features/workflows/workflows.component.ts');
    const wfContent = fs.readFileSync(wfComponentPath, 'utf8');

    assert(wfContent.includes('[class.bg-stone-100]="activeView() !== \'list\'"'), 'Workflow List tab has explicit non-selected background');
    assert(wfContent.includes('[class.bg-stone-100]="activeView() !== \'builder\'"'), 'Create Workflow tab has explicit non-selected background');
    assert(wfContent.includes('[class.bg-stone-100]="activeView() !== \'logs\'"'), 'Execution Logs tab has explicit non-selected background');
    console.log('✅ [PASS] Automation Engine header buttons verified for proper contrast and non-selected state styling');

    console.log('\n================================================================');
    console.log('📊 PHASE 5F.2 TEST RESULTS: ALL 18 ASSERTIONS PASSED, 0 FAILED');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
    if (err.response) console.error('Response Data:', JSON.stringify(err.response.data));
    else console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
