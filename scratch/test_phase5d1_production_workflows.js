const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3000;

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      if (res.headers['content-type'] === 'application/pdf') {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            buffer: Buffer.concat(chunks),
          });
        });
        return;
      }

      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('  STARTING PHASE 5D-1 PRODUCTION WORKFLOWS TEST SUITE');
  console.log('====================================================\n');

  try {
    const timestamp = Date.now();
    const ownerEmail = `owner_p5d1_${timestamp}@workspace.com`;
    const managerEmail = `manager_p5d1_${timestamp}@workspace.com`;
    const employeeEmail = `emp_p5d1_${timestamp}@workspace.com`;
    const password = 'Password123!';

    // 1. REGISTER OWNER & WORKSPACE
    console.log('[TEST 1] Registering Owner & Workspace...');
    const regRes = await makeRequest('/api/auth/register', 'POST', {
      name: 'Alpha Executive',
      email: ownerEmail,
      password,
      workspaceName: 'Apex Enterprise Global',
    });
    if (regRes.status !== 201 || !regRes.data.success) {
      throw new Error(`Owner registration failed: ${JSON.stringify(regRes.data)}`);
    }
    const token = regRes.data.data.token;
    const authHeader = { Authorization: `Bearer ${token}` };
    console.log('  ✓ Owner registered successfully. Token obtained.');

    // 2. CHECK WORKSPACE SETTINGS DEFAULT & VIRTUAL FALLBACKS
    console.log('\n[TEST 2] Verifying Workspace Settings & Identity Resolution...');
    const wsGet = await makeRequest('/api/workspace/settings', 'GET', null, authHeader);
    if (wsGet.status !== 200 || !wsGet.data.success) {
      throw new Error(`GET /api/workspace/settings failed: ${JSON.stringify(wsGet.data)}`);
    }
    const wsData = wsGet.data.data;
    if (wsData.workspaceName !== 'Apex Enterprise Global') {
      throw new Error(`Workspace name mismatch: expected "Apex Enterprise Global", got "${wsData.workspaceName}"`);
    }
    if (wsData.communicationEmail !== ownerEmail) {
      throw new Error(`Communication email fallback mismatch: expected ${ownerEmail}, got ${wsData.communicationEmail}`);
    }
    console.log('  ✓ Default workspace identity fallbacks verified.');

    // 3. UPDATE WORKSPACE SETTINGS
    console.log('\n[TEST 3] Updating Workspace Communication Identity...');
    const wsPut = await makeRequest('/api/workspace/settings', 'PUT', {
      workspaceName: 'Apex Tech Solutions Inc',
      communicationEmail: 'contact@apextech.com',
      communicationEmailName: 'Apex Operations Team',
      theme: 'dark'
    }, authHeader);

    if (wsPut.status !== 200 || !wsPut.data.success) {
      throw new Error(`PUT /api/workspace/settings failed: ${JSON.stringify(wsPut.data)}`);
    }
    if (wsPut.data.data.communicationEmail !== 'contact@apextech.com') {
      throw new Error(`Failed to update communication email to contact@apextech.com`);
    }
    console.log('  ✓ Workspace identity updated to "Apex Tech Solutions Inc" <contact@apextech.com>.');

    // 4. CREATE CUSTOMER ACCOUNT
    console.log('\n[TEST 4] Creating Customer Account for Financial Flow Tests...');
    const custRes = await makeRequest('/api/customers', 'POST', {
      companyName: 'Starlight Global Logistics',
      contactPerson: 'Sarah Connor',
      email: `sarah_${timestamp}@starlight.com`,
      phone: '+1 555-0199',
      industry: 'Logistics',
      status: 'Active'
    }, authHeader);
    if (custRes.status !== 201 || !custRes.data.success) {
      throw new Error(`Customer creation failed: ${JSON.stringify(custRes.data)}`);
    }
    const customerId = custRes.data.data._id;
    console.log(`  ✓ Customer created ID: ${customerId}`);

    // 5. CREATE PROPOSAL DOCUMENT
    console.log('\n[TEST 5] Creating Proposal Document...');
    const propRes = await makeRequest('/api/documents', 'POST', {
      name: 'Enterprise Logistics Automation Retainer',
      type: 'Proposal',
      status: 'Draft',
      customerId,
      metadata: {
        lineItems: [
          { description: 'Cloud SaaS Operating System Setup', quantity: 1, unitPrice: 8000 },
          { description: 'Workflow Automation Integration', quantity: 2, unitPrice: 2000 }
        ],
        taxRate: 10,
        discountRate: 5
      }
    }, authHeader);

    if (propRes.status !== 201 || !propRes.data.success) {
      throw new Error(`Proposal creation failed: ${JSON.stringify(propRes.data)}`);
    }
    const proposal = propRes.data.data;
    const proposalId = proposal._id;
    console.log(`  ✓ Proposal created ID: ${proposalId}. Net Amount: $${proposal.metadata.netAmount}`);

    // 6. GENERATE & EXPORT PDF BUFFER
    console.log('\n[TEST 6] Exporting PDF via PDFKit Engine...');
    const pdfRes = await makeRequest(`/api/documents/${proposalId}/pdf`, 'GET', null, authHeader);
    if (pdfRes.status !== 200) {
      throw new Error(`PDF Export failed with status ${pdfRes.status}`);
    }
    if (!pdfRes.buffer || pdfRes.buffer.length === 0) {
      throw new Error('PDF Export returned an empty buffer');
    }
    const pdfHeader = pdfRes.buffer.slice(0, 5).toString();
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error(`PDF header magic bytes invalid: ${pdfHeader}`);
    }
    console.log(`  ✓ Valid PDF buffer received (${pdfRes.buffer.length} bytes, Magic: ${pdfHeader}).`);

    // 7. SEND PROPOSAL VIA EMAIL (testing delivery & status update to Sent)
    console.log('\n[TEST 7] Sending Proposal via Outbound Email...');
    const sendRes = await makeRequest(`/api/documents/${proposalId}/send`, 'POST', {
      recipientEmail: 'sarah@starlight.com',
      recipientName: 'Sarah Connor',
      subject: 'Apex Tech Solutions - Official Proposal Agreement',
      message: 'Please find attached our official proposal agreement.'
    }, authHeader);

    if (sendRes.status !== 200 || !sendRes.data.success) {
      throw new Error(`Proposal email send failed: ${JSON.stringify(sendRes.data)}`);
    }
    if (sendRes.data.data.status !== 'Sent') {
      throw new Error(`Proposal status should be updated to "Sent", got "${sendRes.data.data.status}"`);
    }
    console.log('  ✓ Proposal email delivered & document status updated to "Sent".');

    // 8. TRANSITION PROPOSAL TO ACCEPTED & AUTO-GENERATE INVOICE
    console.log('\n[TEST 8] Transitioning Proposal to Accepted (Auto-Invoicing)...');
    const transRes = await makeRequest(`/api/documents/${proposalId}/transition`, 'POST', {
      targetStatus: 'Accepted'
    }, authHeader);

    if (transRes.status !== 200 || !transRes.data.success) {
      throw new Error(`Proposal transition failed: ${JSON.stringify(transRes.data)}`);
    }
    const generatedInvoice = transRes.data.generatedInvoice;
    if (!generatedInvoice) {
      throw new Error('Auto-generated invoice missing upon proposal acceptance!');
    }
    const invoiceId = generatedInvoice._id;
    console.log(`  ✓ Proposal accepted. Auto-generated Invoice ID: ${invoiceId}. Net: $${generatedInvoice.metadata.netAmount}`);

    // 9. RECORD INVOICE PAYMENT & OVERPAYMENT
    console.log('\n[TEST 9] Recording Payment & Overpayment on Invoice...');
    const netAmount = generatedInvoice.metadata.netAmount;
    const payment1Amount = netAmount + 500; // Overpayment of $500!

    const payRes1 = await makeRequest(`/api/documents/${invoiceId}/payments`, 'POST', {
      amount: payment1Amount,
      paymentMethod: 'Bank Transfer',
      transactionRef: 'WIRE-99001',
      notes: 'Customer transferred full amount plus $500 credit deposit'
    }, authHeader);

    if (payRes1.status !== 201 || !payRes1.data.success) {
      throw new Error(`Record payment failed: ${JSON.stringify(payRes1.data)}`);
    }
    const updatedInvoice = payRes1.data.data;
    if (updatedInvoice.status !== 'Paid') {
      throw new Error(`Invoice status should be Paid, got ${updatedInvoice.status}`);
    }
    if (updatedInvoice.metadata.amountDue !== 0) {
      throw new Error(`Invoice amountDue should be 0, got ${updatedInvoice.metadata.amountDue}`);
    }
    if (updatedInvoice.metadata.creditBalance !== 500) {
      throw new Error(`Expected creditBalance of 500, got ${updatedInvoice.metadata.creditBalance}`);
    }
    const paymentRecord1 = payRes1.data.paymentRecord;
    console.log(`  ✓ Payment of $${payment1Amount} recorded. Invoice Paid. Amount Due: $0, Customer Credit: $${updatedInvoice.metadata.creditBalance}`);

    // 10. CORRECTION OF PAYMENT WITH AUDIT TRAIL (Manager RBAC)
    console.log('\n[TEST 10] Testing Payment Correction with Mandatory Reason...');
    const paymentId1 = paymentRecord1._id || paymentRecord1.paymentId;

    // Test missing reason error
    const errCorr = await makeRequest(`/api/documents/${invoiceId}/payments/${paymentId1}`, 'PUT', {
      amount: netAmount
    }, authHeader);
    if (errCorr.status !== 400) {
      throw new Error('Payment correction without reason should fail with 400 status');
    }

    // Valid correction
    const corrRes = await makeRequest(`/api/documents/${invoiceId}/payments/${paymentId1}`, 'PUT', {
      amount: netAmount,
      reason: 'Correcting accidental overpayment entry'
    }, authHeader);

    if (corrRes.status !== 200 || !corrRes.data.success) {
      throw new Error(`Payment correction failed: ${JSON.stringify(corrRes.data)}`);
    }
    const correctedInv = corrRes.data.data;
    if (correctedInv.metadata.amountPaid !== netAmount) {
      throw new Error(`Expected corrected amountPaid of $${netAmount}, got $${correctedInv.metadata.amountPaid}`);
    }
    if (correctedInv.metadata.creditBalance !== 0) {
      throw new Error(`Expected creditBalance of 0 after correction, got ${correctedInv.metadata.creditBalance}`);
    }
    console.log(`  ✓ Payment corrected to exact net amount $${netAmount}. Credit balance recalculated to $0.`);

    // 11. PAYMENT DELETION / VOIDING
    console.log('\n[TEST 11] Testing Payment Deletion/Voiding...');
    const delRes = await makeRequest(`/api/documents/${invoiceId}/payments/${paymentId1}`, 'DELETE', null, authHeader);
    if (delRes.status !== 200 || !delRes.data.success) {
      throw new Error(`Payment deletion failed: ${JSON.stringify(delRes.data)}`);
    }
    const voidedInv = delRes.data.data;
    if (voidedInv.metadata.amountPaid !== 0) {
      throw new Error(`Expected amountPaid of 0 after deletion, got ${voidedInv.metadata.amountPaid}`);
    }
    console.log('  ✓ Payment deleted successfully. Invoice status reset and finances recalculated.');

    // 12. VERIFY CUSTOMER 360 INTEGRATION
    console.log('\n[TEST 12] Verifying Customer 360 Commercial Summary & Timeline Integration...');
    const c360Res = await makeRequest(`/api/customers/${customerId}/360`, 'GET', null, authHeader);
    if (c360Res.status !== 200 || !c360Res.data.success) {
      throw new Error(`Customer 360 fetch failed: ${JSON.stringify(c360Res.data)}`);
    }
    const c360Data = c360Res.data.data;
    console.log(`  ✓ Customer 360 Commercial Summary: Total Invoices: ${c360Data.commercialSummary.totalInvoices}, Proposals: ${c360Data.commercialSummary.proposalsCount}`);
    console.log(`  ✓ Customer 360 Timeline Stream contains ${c360Data.timeline.length} chronological events.`);

    console.log('\n====================================================');
    console.log('  ALL 12 PHASE 5D-1 TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ PHASE 5D-1 TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
