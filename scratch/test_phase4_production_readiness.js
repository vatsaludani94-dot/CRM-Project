require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const API_BASE = 'http://localhost:3000/api';

async function runPhase4Tests() {
  console.log('=== PHASE 4 — PRODUCTION READINESS & HARDENING TEST SUITE ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
  const PendingRegistration = require(path.join(__dirname, '../backend/models/PendingRegistration'));
  const User = require(path.join(__dirname, '../backend/models/User'));
  const Tenant = require(path.join(__dirname, '../backend/models/Tenant'));

  const rand = Math.floor(Math.random() * 10000);

  // Setup Workspace Alpha (Tenant A)
  const emailA = `p4_alpha_${rand}@test.com`;
  await fetch(`${API_BASE}/auth/register-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Phase4 Alpha Corp ${rand}`,
      name: 'Alpha Owner',
      email: emailA,
      password: 'Password123!'
    })
  }).then(r => r.json());

  const pendingA = await PendingRegistration.findOne({ email: emailA });
  const codeA = '654321';
  pendingA.verificationCodeHash = crypto.createHash('sha256').update(codeA).digest('hex');
  pendingA.expiresAt = new Date(Date.now() + 600000);
  await pendingA.save();

  const verifyA = await fetch(`${API_BASE}/auth/register-workspace/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, code: codeA })
  }).then(r => r.json());

  const tokenA = verifyA.data.token;
  const userA_id = verifyA.data._id;
  const tenantA_id = verifyA.data.tenant._id;

  // Setup Workspace Beta (Tenant B)
  const emailB = `p4_beta_${rand}@test.com`;
  await fetch(`${API_BASE}/auth/register-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Phase4 Beta Corp ${rand}`,
      name: 'Beta Owner',
      email: emailB,
      password: 'Password123!'
    })
  }).then(r => r.json());

  const pendingB = await PendingRegistration.findOne({ email: emailB });
  const codeB = '123456';
  pendingB.verificationCodeHash = crypto.createHash('sha256').update(codeB).digest('hex');
  pendingB.expiresAt = new Date(Date.now() + 600000);
  await pendingB.save();

  const verifyB = await fetch(`${API_BASE}/auth/register-workspace/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, code: codeB })
  }).then(r => r.json());

  const tokenB = verifyB.data.token;
  const userB_id = verifyB.data._id;
  const tenantB_id = verifyB.data.tenant._id;

  // Setup Employee in Workspace A
  const emailEmpA = `p4_empa_${rand}@test.com`;
  await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alpha Employee',
      email: emailEmpA,
      password: 'Password123!',
      role: 'employee',
      department: 'Sales'
    })
  }).then(r => r.json());

  // Link employee to Tenant A
  const empA_user = await User.findOne({ email: emailEmpA });
  empA_user.tenant = tenantA_id;
  await empA_user.save();

  const empA_login = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailEmpA, password: 'Password123!' })
  }).then(r => r.json());

  const tokenEmpA = empA_login.data.token;

  console.log(`Initialized Tenant A (${tenantA_id}) & Tenant B (${tenantB_id})\n`);

  // --- FEATURE 1: Executive Dashboard ---
  console.log('--- 1. Executive Dashboard ---');
  const dashRes = await fetch(`${API_BASE}/dashboard`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  }).then(r => r.json());

  const test1_pass = dashRes.success && dashRes.data.kpi && dashRes.data.charts;
  console.log(`Feature 1 (Executive Dashboard API & Metrics): ${test1_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 2: Downloads & Updates ---
  console.log('--- 2. Downloads & Updates ---');
  const updateRes = await fetch(`${API_BASE}/updates/check?version=1.0.0`).then(r => r.json());
  const test2_pass = updateRes.success && updateRes.latestVersion === '1.0.1';
  console.log(`Feature 2 (Updates Check & Installer Route): ${test2_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 3: Kanban Sales Pipeline ---
  console.log('--- 3. Kanban Sales Pipeline (Leads) ---');
  const createLeadA = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      company: 'Alpha Lead Co',
      contactName: 'Liam Lead',
      email: `lead_${rand}@alphalead.com`,
      phone: '9988776655',
      leadSource: 'Website',
      expectedRevenue: 25000
    })
  }).then(r => r.json());

  const leadA = createLeadA.data;
  
  // Drag & drop stage update
  const updateLeadA = await fetch(`${API_BASE}/leads/${leadA._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ stage: 'Proposal Sent' })
  }).then(r => r.json());

  // Cross-tenant update protection
  const crossLeadUpdate = await fetch(`${API_BASE}/leads/${leadA._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ company: 'Hacked Lead Name' })
  }).then(r => r.json());

  const test3_pass = createLeadA.success && updateLeadA.data.stage === 'Proposal Sent' && !crossLeadUpdate.success;
  console.log(`Feature 3 (Kanban Pipeline CRUD, Stage Persist & Tenant Isolation): ${test3_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 4: Customer 360 Accounts ---
  console.log('--- 4. Customer 360 Accounts ---');
  const createCustA = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      companyName: 'Alpha Customer Ltd',
      contactPerson: 'Cathy Customer',
      email: `cust_${rand}@alphacust.com`,
      phone: '8877665544',
      industry: 'Technology',
      revenueGenerated: 50000
    })
  }).then(r => r.json());

  const customerA = createCustA.data;

  const getCust360 = await fetch(`${API_BASE}/customers/${customerA._id}/360`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  }).then(r => r.json());

  const crossCustRead = await fetch(`${API_BASE}/customers/${customerA._id}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  }).then(r => r.json());

  const test4_pass = createCustA.success && getCust360.success && getCust360.data.timeline && !crossCustRead.success;
  console.log(`Feature 4 (Customer 360 View Aggregation & Tenant Isolation): ${test4_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 5: Proposals & Quotes ---
  console.log('--- 5. Proposals & Quotes ---');
  const createDocA = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Enterprise Proposal Q3',
      type: 'Proposal',
      customerId: customerA._id,
      metadata: {
        lineItems: [{ description: 'SaaS License', quantity: 10, unitPrice: 100 }],
        taxRate: 10,
        discountRate: 5
      }
    })
  }).then(r => r.json());

  const docA = createDocA.data;
  // Subtotal = 1000, Discount 5% = 50, Tax 10% on 950 = 95, Net = 1045
  const test5_pass = createDocA.success && docA.metadata.netAmount === 1045;
  console.log(`Feature 5 (Proposals & Quotes Server Financial Calculations): ${test5_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 6: Support Desk & AI Tickets ---
  console.log('--- 6. Support Desk & AI Tickets ---');
  const createTicketA = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      title: 'Server Latency Issue',
      description: 'The database query is taking longer than usual during peak hours.',
      customerId: customerA._id
    })
  }).then(r => r.json());

  const ticketA = createTicketA.data;

  // Cross-tenant related customer validation test
  const crossTicketCreate = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({
      title: 'Malicious Foreign Ticket',
      description: 'Attempting to attach ticket to Workspace A customer',
      customerId: customerA._id
    })
  }).then(r => r.json());

  const test6_pass = createTicketA.success && ticketA.category && !crossTicketCreate.success;
  console.log(`Feature 6 (Support Desk AI Classification & Foreign Customer Defense): ${test6_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 7: Team Directory ---
  console.log('--- 7. Team Directory (Employees) ---');
  const getEmpList = await fetch(`${API_BASE}/employees`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  }).then(r => r.json());

  // Attempt role escalation to super_admin by Workspace Owner
  const escalateAttempt = await fetch(`${API_BASE}/employees/${empA_user._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ role: 'super_admin' })
  }).then(r => r.json());

  const test7_pass = getEmpList.success && !escalateAttempt.success && escalateAttempt.error.includes('super_admin');
  console.log(`Feature 7 (Team Directory & Super Admin Role Escalation Block): ${test7_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 8: Payroll Hub ---
  console.log('--- 8. Payroll Hub ---');
  const createPayrollA = await fetch(`${API_BASE}/payroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      employeeId: empA_user._id,
      month: '2026-07',
      baseSalary: 5000,
      bonus: 500,
      deductions: 200
    })
  }).then(r => r.json());

  const payrollA = createPayrollA.data;

  // Employee RBAC check: Employee B cannot access Employee A payroll
  const crossPayrollRead = await fetch(`${API_BASE}/payroll/${payrollA._id}/download`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  }).then(r => r.json());

  const test8_pass = createPayrollA.success && payrollA.netSalary === 5300 && !crossPayrollRead.success;
  console.log(`Feature 8 (Payroll Hub Calculations & Access Protection): ${test8_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 9: Social Auto-Responders ---
  console.log('--- 9. Social Auto-Responders (Workflows) ---');
  const createWorkflowA = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Lead Auto Responder',
      trigger: 'Lead Created',
      steps: [{ type: 'Action', config: { actionType: 'Create Task', taskTitle: 'Follow up lead' } }]
    })
  }).then(r => r.json());

  const test9_pass = createWorkflowA.success;
  console.log(`Feature 9 (Social Auto-Responders & Workflow Engine): ${test9_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 10: Calendar Scheduler ---
  console.log('--- 10. Calendar Scheduler (Appointments) ---');
  const createAppointmentA = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      subject: 'Quarterly Strategy Review',
      description: 'Discuss Q3 goals',
      appointmentDate: '2026-08-01',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      customerId: customerA._id
    })
  }).then(r => r.json());

  const test10_pass = createAppointmentA.success && createAppointmentA.data.subject === 'Quarterly Strategy Review';
  console.log(`Feature 10 (Calendar Scheduler & Appointment Booking): ${test10_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 11: Website Builder ---
  console.log('--- 11. Website Builder ---');
  const createWebsiteA = await fetch(`${API_BASE}/builders/websites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ name: `Alpha Landing ${rand}`, template: 'SaaS' })
  }).then(r => r.json());

  const test11_pass = createWebsiteA.success && createWebsiteA.data.sections.length > 0;
  console.log(`Feature 11 (Website Builder & Funnel Persistence): ${test11_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 12: Forms & Surveys ---
  console.log('--- 12. Forms & Surveys ---');
  const createFormA = await fetch(`${API_BASE}/forms-surveys/forms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Contact Sales Form',
      submissionAction: 'Create Lead',
      fields: [{ label: 'Name', type: 'Text' }, { label: 'Email', type: 'Email' }]
    })
  }).then(r => r.json());

  const formA = createFormA.data;

  // Submit public form
  const submitPublicForm = await fetch(`${API_BASE}/forms-surveys/forms/${formA._id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formData: { Name: 'Public Lead', Email: `public_${rand}@test.com` }
    })
  }).then(r => r.json());

  const test12_pass = createFormA.success && submitPublicForm.success;
  console.log(`Feature 12 (Forms & Surveys Public Submission Engine): ${test12_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 13: Gmail Center ---
  console.log('--- 13. Gmail Center ---');
  const getGmailUrl = await fetch(`${API_BASE}/emails/oauth-url`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  }).then(r => r.json());

  const sendEmailMsg = await fetch(`${API_BASE}/emails/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      subject: 'Follow up on proposal',
      body: 'Hi Cathy, checking in on the proposal.',
      to: customerA.email,
      customerId: customerA._id
    })
  }).then(r => r.json());

  const test13_pass = getGmailUrl.success && sendEmailMsg.success;
  console.log(`Feature 13 (Gmail Center OAuth & Message Dispatch): ${test13_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 14: SMS Marketing ---
  console.log('--- 14. SMS Marketing ---');
  const createSmsA = await fetch(`${API_BASE}/sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Summer Promo Campaign',
      messageTemplate: 'Enjoy 20% off SaaS renewal this week!',
      segments: ['Customer']
    })
  }).then(r => r.json());

  const test14_pass = createSmsA.success;
  console.log(`Feature 14 (SMS Marketing Campaign Management): ${test14_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 15: Team Collaboration Chat ---
  console.log('--- 15. Team Collaboration Chat ---');
  const createChannelA = await fetch(`${API_BASE}/collaboration/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ name: 'general', description: 'General Discussion' })
  }).then(r => r.json());

  const channelA = createChannelA.data;

  const sendMsgA = await fetch(`${API_BASE}/collaboration/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ channelId: channelA._id, messageText: 'Hello team!' })
  }).then(r => r.json());

  // Cross-tenant channel read protection
  const crossChannelRead = await fetch(`${API_BASE}/collaboration/messages?channelId=${channelA._id}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  }).then(r => r.json());

  const test15_pass = createChannelA.success && sendMsgA.success && !crossChannelRead.success;
  console.log(`Feature 15 (Team Collaboration Chat & Channel Isolation): ${test15_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 16: Google Drive Storage ---
  console.log('--- 16. Google Drive Storage ---');
  const createFolderA = await fetch(`${API_BASE}/drive/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ name: 'Project Contracts', type: 'General' })
  }).then(r => r.json());

  const folderA = createFolderA.data;

  const uploadFileA = await fetch(`${API_BASE}/drive/files/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Contract_2026.pdf',
      mimeType: 'application/pdf',
      folderId: folderA._id
    })
  }).then(r => r.json());

  // Cross-tenant parent folder creation attack
  const crossFolderCreate = await fetch(`${API_BASE}/drive/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ name: 'Malicious Subfolder', parentFolderId: folderA._id })
  }).then(r => r.json());

  const test16_pass = createFolderA.success && uploadFileA.success && !crossFolderCreate.success;
  console.log(`Feature 16 (Google Drive Storage & Parent Folder Isolation): ${test16_pass ? 'PASS' : 'FAIL'}`);

  // --- FEATURE 17: Tasks & Deadlines ---
  console.log('--- 17. Tasks & Deadlines ---');
  const createTaskA = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      title: 'Review Q3 Security Audit',
      description: 'Audit tenant isolation across all endpoints',
      priority: 'High',
      assignedTo: empA_user._id,
      customerId: customerA._id
    })
  }).then(r => r.json());

  const taskA = createTaskA.data;

  // Cross-tenant employee assignment attack
  const crossTaskCreate = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({
      title: 'Malicious Task Assignment',
      assignedTo: empA_user._id // Employee A belongs to Tenant A!
    })
  }).then(r => r.json());

  const test17_pass = createTaskA.success && !crossTaskCreate.success;
  console.log(`Feature 17 (Tasks & Deadlines & Cross-Tenant Assignee Block): ${test17_pass ? 'PASS' : 'FAIL'}`);

  // --- CLEANUP ---
  await User.deleteMany({ email: { $in: [emailA, emailB, emailEmpA] } });
  await Tenant.deleteMany({ _id: { $in: [tenantA_id, tenantB_id] } });
  await mongoose.disconnect();

  console.log('\n==================================================');
  console.log('=== PHASE 4 FEATURE VERIFICATION MATRIX SUMMARY ===');
  console.log('==================================================');
  console.log(`1. Executive Dashboard: ${test1_pass ? 'PASS' : 'FAIL'}`);
  console.log(`2. Downloads & Licenses: ${test2_pass ? 'PASS' : 'FAIL'}`);
  console.log(`3. Kanban Sales Pipeline: ${test3_pass ? 'PASS' : 'FAIL'}`);
  console.log(`4. Customer 360 Accounts: ${test4_pass ? 'PASS' : 'FAIL'}`);
  console.log(`5. Proposals & Quotes: ${test5_pass ? 'PASS' : 'FAIL'}`);
  console.log(`6. Support Desk & AI Tickets: ${test6_pass ? 'PASS' : 'FAIL'}`);
  console.log(`7. Team Directory: ${test7_pass ? 'PASS' : 'FAIL'}`);
  console.log(`8. Payroll Hub: ${test8_pass ? 'PASS' : 'FAIL'}`);
  console.log(`9. Social Auto-Responders: ${test9_pass ? 'PASS' : 'FAIL'}`);
  console.log(`10. Calendar Scheduler: ${test10_pass ? 'PASS' : 'FAIL'}`);
  console.log(`11. Website Builder: ${test11_pass ? 'PASS' : 'FAIL'}`);
  console.log(`12. Forms & Surveys: ${test12_pass ? 'PASS' : 'FAIL'}`);
  console.log(`13. Gmail Center: ${test13_pass ? 'PASS' : 'FAIL'}`);
  console.log(`14. SMS Marketing: ${test14_pass ? 'PASS' : 'FAIL'}`);
  console.log(`15. Team Collaboration Chat: ${test15_pass ? 'PASS' : 'FAIL'}`);
  console.log(`16. Google Drive Storage: ${test16_pass ? 'PASS' : 'FAIL'}`);
  console.log(`17. Tasks & Deadlines: ${test17_pass ? 'PASS' : 'FAIL'}`);
  console.log('==================================================\n');
}

runPhase4Tests();
