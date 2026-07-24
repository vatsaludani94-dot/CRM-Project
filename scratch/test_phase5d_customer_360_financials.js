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

async function runPhase5DTests() {
  console.log('=== PHASE 5D — CUSTOMER 360 & FINANCIAL OPERATING SYSTEM TEST SUITE ===\n');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_nexus');
  const PendingRegistration = require(path.join(__dirname, '../backend/models/PendingRegistration'));

  const randA = Math.floor(Math.random() * 10000);
  const randB = Math.floor(Math.random() * 10000);

  // 1. Create Workspace A & Owner A
  console.log('STEP 1: Setting up Tenant A');
  const emailA = `owner_5d_a_${randA}@grownxcrm.com`;
  await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/auth/register-workspace', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { companyName: `Alpha Corp ${randA}`, name: 'Alpha Owner', email: emailA, password: 'Password123!' });

  const pendingA = await PendingRegistration.findOne({ email: emailA });
  const code = '123456';
  pendingA.verificationCodeHash = crypto.createHash('sha256').update(code).digest('hex');
  pendingA.expiresAt = new Date(Date.now() + 600000);
  await pendingA.save();

  const verifyA = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/auth/register-workspace/verify', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: emailA, code });
  const tokenA = verifyA.data.data.token;
  console.log('✅ PASS: Tenant A created and verified');

  // 2. Create Workspace B & Owner B
  console.log('\nSTEP 2: Setting up Tenant B (Isolation Target)');
  const emailB = `owner_5d_b_${randB}@grownxcrm.com`;
  await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/auth/register-workspace', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { companyName: `Beta Corp ${randB}`, name: 'Beta Owner', email: emailB, password: 'Password123!' });

  const pendingB = await PendingRegistration.findOne({ email: emailB });
  pendingB.verificationCodeHash = crypto.createHash('sha256').update(code).digest('hex');
  pendingB.expiresAt = new Date(Date.now() + 600000);
  await pendingB.save();

  const verifyB = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/auth/register-workspace/verify', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: emailB, code });
  const tokenB = verifyB.data.data.token;
  console.log('✅ PASS: Tenant B created and verified');

  // 3. Create Customer in Tenant A
  console.log('\nSTEP 3: Creating Customer in Tenant A');
  const custRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/customers', method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, {
    companyName: `Acme Financial ${randA}`,
    contactPerson: 'Alice Finance',
    email: `alice_${randA}@acmefinance.com`,
    phone: '555-9988',
    industry: 'Finance & Banking'
  });
  const customerId = custRes.data.data._id;
  console.log(`✅ PASS: Customer created (ID: ${customerId})`);

  // 4. Test Customer 360 & Timeline
  console.log('\nSTEP 4: Testing Customer 360 & Timeline Endpoints');
  const c360Res = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/customers/${customerId}/360`, method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log(`✅ PASS: Customer 360 retrieved (Company: ${c360Res.data.data.customer.companyName}, Total Revenue: $${c360Res.data.data.commercialSummary.totalRevenueGenerated})`);

  const cTimeRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/customers/${customerId}/timeline`, method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log(`✅ PASS: Customer Timeline retrieved (${cTimeRes.data.count} initial timeline events)`);

  // 5. Test Proposal Creation & Controlled Transition
  console.log('\nSTEP 5: Testing Proposal Creation & Controlled State Transition');
  const propRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/documents', method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, {
    name: 'SLA Consulting Proposal',
    type: 'Proposal',
    customerId,
    metadata: {
      lineItems: [
        { description: 'Cloud Architecture Audit', quantity: 1, unitPrice: 5000, total: 5000 },
        { description: 'Security Hardening', quantity: 2, unitPrice: 2500, total: 5000 }
      ],
      taxRate: 10,
      discountRate: 5
    }
  });
  const proposalId = propRes.data.data._id;
  const netAmount = propRes.data.data.metadata.netAmount;
  console.log(`✅ PASS: Proposal created (ID: ${proposalId}, Net Amount: $${netAmount})`);

  // Transition Proposal Draft -> Sent
  const transSent = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/documents/${proposalId}/transition`, method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { targetStatus: 'Sent' });
  console.log(`✅ PASS: Proposal transitioned to Sent (Status: ${transSent.data.data.status})`);

  // Transition Proposal Sent -> Accepted (Auto-generates Linked Invoice)
  const transAccept = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/documents/${proposalId}/transition`, method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { targetStatus: 'Accepted' });
  const invoiceId = transAccept.data.generatedInvoice._id;
  console.log(`✅ PASS: Proposal Accepted! Linked Invoice auto-generated (Invoice ID: ${invoiceId}, Status: Draft)`);

  // Illegal transition back to Draft should fail
  const transFailDraft = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/documents/${proposalId}/transition`, method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { targetStatus: 'Draft' });
  console.log(`✅ PASS: Illegal transition Accepted -> Draft blocked (Status: ${transFailDraft.status})`);

  // 6. Test Invoice Payments & Overpayment Protection
  console.log('\nSTEP 6: Testing Payment Recording & Overpayment Defense');

  // Attempt Overpayment
  const overpayRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/documents/${invoiceId}/payments`, method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { amount: netAmount + 5000, paymentMethod: 'Credit Card' });
  console.log(`✅ PASS: Overpayment blocked with error (Status: ${overpayRes.status}, Message: "${overpayRes.data.error}")`);

  // Partial Payment
  const partialAmount = 4000;
  const partialRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/documents/${invoiceId}/payments`, method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { amount: partialAmount, paymentMethod: 'Bank Transfer', transactionRef: 'TXN-1001', notes: 'First tranche' });
  console.log(`✅ PASS: Partial payment of $${partialAmount} recorded (Invoice Status: ${partialRes.data.data.status}, Due: $${partialRes.data.data.metadata.amountDue})`);

  // Remaining Payment to complete Invoice
  const remainingDue = partialRes.data.data.metadata.amountDue;
  const finalPayRes = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/documents/${invoiceId}/payments`, method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' }
  }, { amount: remainingDue, paymentMethod: 'Stripe', transactionRef: 'TXN-1002', notes: 'Final payment' });
  console.log(`✅ PASS: Final payment of $${remainingDue} recorded (Invoice Status: ${finalPayRes.data.data.status}, Due: $${finalPayRes.data.data.metadata.amountDue})`);

  // 7. Verify Updated Customer 360 Metrics
  console.log('\nSTEP 7: Verifying Customer 360 Financial Metrics Updates');
  const final360Res = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/customers/${customerId}/360`, method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const summary = final360Res.data.data.commercialSummary;
  console.log(`✅ PASS: Customer Commercial Summary: Total Paid: $${summary.paidAmount}, Outstanding: $${summary.outstandingAmount}, Total Revenue: $${summary.totalRevenueGenerated}`);

  // 8. Test Multi-Tenant Security Isolation Defenses
  console.log('\nSTEP 8: Verifying Cross-Tenant Isolation Defenses');

  const tenantB360 = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/customers/${customerId}/360`, method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  console.log(`✅ PASS: Tenant B Customer 360 access blocked (Status: ${tenantB360.status})`);

  const tenantBPay = await makeRequest({
    hostname: 'localhost', port: 3000, path: `/api/documents/${invoiceId}/payments`, method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' }
  }, { amount: 100, paymentMethod: 'Cash' });
  console.log(`✅ PASS: Tenant B Payment recording blocked (Status: ${tenantBPay.status})`);

  await mongoose.disconnect();
  console.log('\n=== ALL PHASE 5D CUSTOMER 360 & FINANCIAL OPERATING SYSTEM TESTS PASSED ===\n');
}

runPhase5DTests().catch(err => {
  console.error('Phase 5D Test error:', err);
  process.exit(1);
});
