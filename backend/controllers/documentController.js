const Document = require('../models/Document');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const { autoCreateCustomerFolder } = require('./driveController');
const DriveFolder = require('../models/DriveFolder');
const DriveFile = require('../models/DriveFile');
const { getTenantFilter, getTenantId, getWorkspaceIdentity } = require('../utils/tenantScope');
const PDFService = require('../services/pdfService');
const { sendOutboundEmail } = require('../services/invoice-email.service');
const mongoose = require('mongoose');

const getDocuments = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { type, status } = req.query;
    let query = { ...tenantFilter };

    if (type) query.type = type;
    if (status) query.status = status;

    const documents = await Document.find(query)
      .populate('customer', 'companyName contactPerson email phone')
      .populate('lead', 'company contactName email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: documents.length, data: documents });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const doc = await Document.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('customer', 'companyName contactPerson email phone')
      .populate('lead', 'company contactName email');

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const createDocument = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const { name, type, status, metadata, customerId, leadId } = req.body;

    if (customerId) {
      const cust = await Customer.findOne({ _id: customerId, ...tenantFilter });
      if (!cust) {
        return res.status(400).json({ success: false, error: 'Customer does not belong to your workspace' });
      }
    }

    if (leadId) {
      const leadObj = await Lead.findOne({ _id: leadId, ...tenantFilter });
      if (!leadObj) {
        return res.status(400).json({ success: false, error: 'Lead does not belong to your workspace' });
      }
    }

    const lineItems = metadata?.lineItems || [];
    let subtotalAmount = 0;
    lineItems.forEach(item => {
      item.total = (item.quantity || 0) * (item.unitPrice || 0);
      subtotalAmount += item.total;
    });

    const discountRate = metadata?.discountRate || 0;
    const discountAmount = parseFloat(((subtotalAmount * discountRate) / 100).toFixed(2));
    const subtotalAfterDiscount = subtotalAmount - discountAmount;

    const taxRate = metadata?.taxRate || 0;
    const taxAmount = parseFloat(((subtotalAfterDiscount * taxRate) / 100).toFixed(2));

    const netAmount = parseFloat((subtotalAfterDiscount + taxAmount).toFixed(2));

    const updatedMetadata = {
      ...metadata,
      lineItems,
      subtotalAmount,
      discountAmount,
      taxAmount,
      netAmount,
      amountPaid: 0,
      amountDue: netAmount,
      creditBalance: 0,
      paymentHistory: [],
    };

    const doc = await Document.create({
      name,
      type,
      status: status || 'Draft',
      documentNumber: `${type.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      metadata: updatedMetadata,
      customer: customerId || undefined,
      lead: leadId || undefined,
      tenant: tenantId,
    });

    doc.pdfUrl = `/api/documents/${doc._id}/pdf`;
    await doc.save();

    if (customerId) {
      let parentFolder = await DriveFolder.findOne({ type: 'Customer', referenceId: customerId, ...tenantFilter });
      
      if (!parentFolder) {
        const customer = await Customer.findOne({ _id: customerId, ...tenantFilter });
        if (customer) {
          await autoCreateCustomerFolder(customer, tenantId);
          parentFolder = await DriveFolder.findOne({ type: 'Customer', referenceId: customerId, ...tenantFilter });
        }
      }

      if (parentFolder) {
        let subfolderName = 'Contracts';
        if (type === 'Invoice') subfolderName = 'Invoices';
        else if (type === 'Proposal') subfolderName = 'Proposals';

        const targetFolder = await DriveFolder.findOne({ parentFolder: parentFolder._id, name: subfolderName, ...tenantFilter });
        
        if (targetFolder) {
          await DriveFile.create({
            name: `${name}.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 15420,
            url: doc.pdfUrl,
            folder: targetFolder._id,
            uploadedBy: req.user._id,
            tenant: tenantId,
          });
          doc.googleDriveLinked = true;
          await doc.save();
        }
      }
    }

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const updateDocument = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const doc = await Document.findOne({ _id: req.params.id, ...tenantFilter });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    doc.version += 1;
    
    const { name, status, metadata } = req.body;
    if (name) doc.name = name;
    if (status) doc.status = status;
    if (metadata) {
      const lineItems = metadata.lineItems || doc.metadata.lineItems || [];
      let subtotalAmount = 0;
      lineItems.forEach(item => {
        item.total = (item.quantity || 0) * (item.unitPrice || 0);
        subtotalAmount += item.total;
      });

      const discountRate = metadata.discountRate !== undefined ? metadata.discountRate : doc.metadata.discountRate;
      const discountAmount = parseFloat(((subtotalAmount * discountRate) / 100).toFixed(2));
      const subtotalAfterDiscount = subtotalAmount - discountAmount;

      const taxRate = metadata.taxRate !== undefined ? metadata.taxRate : doc.metadata.taxRate;
      const taxAmount = parseFloat(((subtotalAfterDiscount * taxRate) / 100).toFixed(2));

      const netAmount = parseFloat((subtotalAfterDiscount + taxAmount).toFixed(2));

      doc.metadata = {
        ...doc.metadata.toObject(),
        ...metadata,
        lineItems,
        subtotalAmount,
        discountAmount,
        taxAmount,
        netAmount,
      };
    }

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Export Document PDF buffer with validation
 * @route   GET /api/documents/:id/pdf
 * @access  Private
 */
const exportDocumentPdf = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const doc = await Document.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('customer', 'companyName contactPerson email phone')
      .populate('lead', 'company contactName email');

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const workspaceIdentity = await getWorkspaceIdentity(tenantId, req.user);
    const pdfBuffer = await PDFService.generateDocumentPdf(doc, workspaceIdentity);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(500).json({ success: false, error: 'Generated PDF buffer is empty or corrupted' });
    }

    const safeFilename = doc.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}_v${doc.version}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Controlled document status transition (Proposals, Invoices)
 * @route   POST /api/documents/:id/transition
 * @access  Private (Admin, Manager, Employee)
 */
const transitionDocument = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const doc = await Document.findOne({ _id: req.params.id, ...tenantFilter });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const { targetStatus } = req.body;
    const validStatuses = ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Approved', 'Declined', 'Partially_Paid', 'Paid', 'Overdue', 'Expired', 'Void', 'Cancelled'];
    
    if (!targetStatus || !validStatuses.includes(targetStatus)) {
      return res.status(400).json({ success: false, error: `Invalid target status. Valid values: ${validStatuses.join(', ')}` });
    }

    if (['Accepted', 'Paid', 'Approved'].includes(doc.status) && targetStatus === 'Draft') {
      return res.status(400).json({ success: false, error: `Cannot return document from ${doc.status} back to Draft` });
    }

    const previousStatus = doc.status;
    doc.status = targetStatus;

    let generatedInvoice = null;
    if (doc.type === 'Proposal' && ['Accepted', 'Approved'].includes(targetStatus)) {
      if (!doc.metadata?.linkedInvoice) {
        const invoiceDoc = await Document.create({
          name: `Invoice for ${doc.name}`,
          type: 'Invoice',
          status: 'Draft',
          documentNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          metadata: {
            lineItems: doc.metadata?.lineItems || [],
            taxRate: doc.metadata?.taxRate || 0,
            taxAmount: doc.metadata?.taxAmount || 0,
            discountRate: doc.metadata?.discountRate || 0,
            discountAmount: doc.metadata?.discountAmount || 0,
            subtotalAmount: doc.metadata?.subtotalAmount || 0,
            netAmount: doc.metadata?.netAmount || 0,
            amountPaid: 0,
            amountDue: doc.metadata?.netAmount || 0,
            creditBalance: 0,
            linkedProposal: doc._id,
            notes: doc.metadata?.notes || ''
          },
          customer: doc.customer,
          lead: doc.lead,
          tenant: tenantId
        });

        doc.metadata = {
          ...doc.metadata.toObject(),
          linkedInvoice: invoiceDoc._id
        };
        generatedInvoice = invoiceDoc;
      }

      try {
        const { triggerWorkflowEvents } = require('./workflowController');
        await triggerWorkflowEvents('Deal Won', 'Document', doc._id, tenantId);
      } catch (wfErr) {}
    }

    await doc.save();

    if (doc.customer) {
      const customer = await Customer.findOne({ _id: doc.customer, ...tenantFilter });
      if (customer) {
        customer.activities.push({
          type: 'Note',
          description: `${doc.type} "${doc.name}" status changed: ${previousStatus} → ${targetStatus}`,
          performedBy: req.user._id
        });
        await customer.save();
      }
    }

    res.json({
      success: true,
      message: `Document status updated to ${targetStatus}`,
      data: doc,
      generatedInvoice
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * Recalculate document payments & customer balances safely
 */
const recalculateDocumentFinances = (doc) => {
  const paymentHistory = doc.metadata.paymentHistory || [];
  const totalPaid = parseFloat(paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2));
  const netAmount = doc.metadata.netAmount || 0;

  const amountDue = Math.max(0, parseFloat((netAmount - totalPaid).toFixed(2)));
  const creditBalance = Math.max(0, parseFloat((totalPaid - netAmount).toFixed(2)));

  doc.metadata.amountPaid = totalPaid;
  doc.metadata.amountDue = amountDue;
  doc.metadata.creditBalance = creditBalance;

  doc.markModified('metadata');

  if (amountDue === 0 && totalPaid > 0) {
    doc.status = 'Paid';
  } else if (totalPaid > 0 && amountDue > 0) {
    doc.status = 'Partially_Paid';
  } else if (totalPaid === 0 && doc.status === 'Paid') {
    doc.status = 'Draft';
  }

  return { totalPaid, amountDue, creditBalance };
};

/**
 * @desc    Record payment against an invoice (supporting overpayment & customer credit)
 * @route   POST /api/documents/:id/payments
 * @access  Private (Admin, Manager, Employee)
 */
const recordInvoicePayment = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const doc = await Document.findOne({ _id: req.params.id, ...tenantFilter });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    if (doc.type !== 'Invoice' && doc.type !== 'Contract') {
      return res.status(400).json({ success: false, error: 'Payments can only be recorded against Invoice or Contract documents' });
    }

    const { amount, paymentMethod, transactionRef, notes } = req.body;
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Payment amount must be a positive number' });
    }

    if (!doc.metadata.paymentHistory) {
      doc.metadata.paymentHistory = [];
    }

    const newPaymentId = new mongoose.Types.ObjectId();
    const newPaymentRecord = {
      _id: newPaymentId,
      paymentId: newPaymentId.toString(),
      amount: paymentAmount,
      paymentMethod: paymentMethod || 'Bank Transfer',
      transactionRef: transactionRef || '',
      notes: notes || '',
      recordedBy: req.user._id,
      date: new Date()
    };

    doc.metadata.paymentHistory.push(newPaymentRecord);

    const { totalPaid, amountDue, creditBalance } = recalculateDocumentFinances(doc);
    await doc.save();

    if (doc.customer) {
      const customer = await Customer.findOne({ _id: doc.customer, ...tenantFilter });
      if (customer) {
        customer.revenueGenerated = (customer.revenueGenerated || 0) + paymentAmount;
        if (creditBalance > 0) {
          customer.creditBalance = (customer.creditBalance || 0) + creditBalance;
        }
        customer.activities.push({
          type: 'Note',
          description: `Payment of $${paymentAmount.toLocaleString()} recorded for Invoice "${doc.name}". Status: ${doc.status} (Due: $${amountDue.toLocaleString()}${creditBalance > 0 ? `, Credit: $${creditBalance.toLocaleString()}` : ''})`,
          performedBy: req.user._id
        });
        await customer.save();
      }
    }

    try {
      const { triggerWorkflowEvents } = require('./workflowController');
      await triggerWorkflowEvents('Customer Converted', 'Document', doc._id, tenantId);
    } catch (wfErr) {}

    res.status(201).json({
      success: true,
      message: `Payment of $${paymentAmount} recorded successfully`,
      data: doc,
      paymentRecord: newPaymentRecord
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Correct an existing payment entry with audit trail
 * @route   PUT /api/documents/:id/payments/:paymentId
 * @access  Private (Admin, Manager only)
 */
const correctInvoicePayment = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const doc = await Document.findOne({ _id: req.params.id, ...tenantFilter });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // RBAC Authorization: Manager & Super Admin only
    if (!['super_admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Financial payment correction requires manager or workspace owner role' });
    }

    const { paymentId } = req.params;
    const { amount, paymentMethod, transactionRef, notes, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Correction reason is mandatory for audit trail' });
    }

    const paymentIndex = (doc.metadata.paymentHistory || []).findIndex(
      p => (p._id && p._id.toString() === paymentId) || (p.paymentId && p.paymentId === paymentId)
    );

    if (paymentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Payment record not found in invoice history' });
    }

    const existingPayment = doc.metadata.paymentHistory[paymentIndex];
    const originalAmount = existingPayment.amount;
    const newAmount = amount !== undefined ? Number(amount) : originalAmount;

    if (isNaN(newAmount) || newAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Corrected payment amount must be a positive number' });
    }

    if (!existingPayment.correctionHistory) {
      existingPayment.correctionHistory = [];
    }

    existingPayment.correctionHistory.push({
      originalAmount,
      correctedAmount: newAmount,
      reason: reason.trim(),
      correctedBy: req.user._id,
      correctedAt: new Date()
    });

    existingPayment.amount = newAmount;
    if (paymentMethod) existingPayment.paymentMethod = paymentMethod;
    if (transactionRef !== undefined) existingPayment.transactionRef = transactionRef;
    if (notes !== undefined) existingPayment.notes = notes;
    existingPayment.isCorrected = true;

    doc.metadata.paymentHistory[paymentIndex] = existingPayment;

    const { totalPaid, amountDue, creditBalance } = recalculateDocumentFinances(doc);
    await doc.save();

    // Recalculate customer revenue
    if (doc.customer) {
      const customer = await Customer.findOne({ _id: doc.customer, ...tenantFilter });
      if (customer) {
        const diff = newAmount - originalAmount;
        customer.revenueGenerated = Math.max(0, (customer.revenueGenerated || 0) + diff);
        customer.activities.push({
          type: 'Note',
          description: `Payment corrected from $${originalAmount} to $${newAmount} for Invoice "${doc.name}". Reason: "${reason.trim()}"`,
          performedBy: req.user._id
        });
        await customer.save();
      }
    }

    res.json({
      success: true,
      message: `Payment corrected from $${originalAmount} to $${newAmount} successfully`,
      data: doc
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Delete/Void a payment entry from invoice
 * @route   DELETE /api/documents/:id/payments/:paymentId
 * @access  Private (Admin, Manager only)
 */
const deleteInvoicePayment = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const doc = await Document.findOne({ _id: req.params.id, ...tenantFilter });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    if (!['super_admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Deleting financial payments requires manager or workspace owner role' });
    }

    const { paymentId } = req.params;
    const paymentIndex = (doc.metadata.paymentHistory || []).findIndex(
      p => (p._id && p._id.toString() === paymentId) || (p.paymentId && p.paymentId === paymentId)
    );

    if (paymentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }

    const removedPayment = doc.metadata.paymentHistory[paymentIndex];
    doc.metadata.paymentHistory.splice(paymentIndex, 1);

    const { totalPaid, amountDue } = recalculateDocumentFinances(doc);
    await doc.save();

    if (doc.customer) {
      const customer = await Customer.findOne({ _id: doc.customer, ...tenantFilter });
      if (customer) {
        customer.revenueGenerated = Math.max(0, (customer.revenueGenerated || 0) - removedPayment.amount);
        customer.activities.push({
          type: 'Note',
          description: `Payment of $${removedPayment.amount} voided/deleted for Invoice "${doc.name}".`,
          performedBy: req.user._id
        });
        await customer.save();
      }
    }

    res.json({
      success: true,
      message: `Payment of $${removedPayment.amount} deleted successfully`,
      data: doc
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Send Proposal Email to Client with PDF Attachment
 * @route   POST /api/documents/:id/send
 * @access  Private (Admin, Manager, Employee)
 */
const sendProposalEmail = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const doc = await Document.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('customer', 'companyName contactPerson email phone')
      .populate('lead', 'company contactName email');

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    if (doc.type !== 'Proposal') {
      return res.status(400).json({ success: false, error: 'Only Proposal documents can be sent via this endpoint' });
    }

    const { recipientEmail, recipientName, cc, subject, message } = req.body;
    const targetEmail = recipientEmail || doc.customer?.email || doc.lead?.email;

    if (!targetEmail || !targetEmail.trim() || !/^\S+@\S+\.\S+$/.test(targetEmail.trim())) {
      return res.status(400).json({ success: false, error: 'Valid client recipient email address is required' });
    }

    const workspaceIdentity = await getWorkspaceIdentity(tenantId, req.user);
    const pdfBuffer = await PDFService.generateDocumentPdf(doc, workspaceIdentity);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(500).json({ success: false, error: 'Failed to generate proposal PDF attachment' });
    }

    const emailSubject = subject || `Proposal: ${doc.name} - ${workspaceIdentity.workspaceName}`;
    const emailBodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1c1917; margin: 0;">${workspaceIdentity.workspaceName}</h2>
          <p style="color: #44403c; font-size: 14px; margin-top: 4px;">Commercial Sales Proposal</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px;">
          <p style="color: #1c1917; font-size: 14px;">Dear ${recipientName || doc.customer?.contactPerson || doc.lead?.contactName || 'Valued Client'},</p>
          <p style="color: #44403c; font-size: 14px; line-height: 1.5;">${message || 'Please find attached our official sales proposal for your review.'}</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a;">Proposal Summary:</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Document Name: <strong>${doc.name}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #16a34a; font-weight: bold;">Total Amount: $${(doc.metadata?.netAmount || 0).toLocaleString()}</p>
          </div>
          <p style="color: #574c43; font-size: 12px; margin-top: 16px;">The complete detailed document is attached to this email as a PDF file.</p>
        </div>
      </div>
    `;

    // Attempt actual email delivery
    let deliveryResult;
    try {
      deliveryResult = await sendOutboundEmail({
        to: targetEmail.trim(),
        subject: emailSubject,
        html: emailBodyHtml,
        attachments: [
          {
            filename: `${doc.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          }
        ],
        fromName: workspaceIdentity.communicationEmailName,
        fromEmail: workspaceIdentity.communicationEmail,
      });
    } catch (deliveryErr) {
      return res.status(500).json({
        success: false,
        error: `Proposal delivery failed: ${deliveryErr.message}`
      });
    }

    // UPDATE STATUS ONLY AFTER SUCCESSFUL DELIVERY
    doc.status = 'Sent';
    await doc.save();

    if (doc.customer) {
      const customer = await Customer.findOne({ _id: doc.customer, ...tenantFilter });
      if (customer) {
        customer.activities.push({
          type: 'Email',
          description: `Sent Proposal "${doc.name}" via email to ${targetEmail}`,
          performedBy: req.user._id
        });
        await customer.save();
      }
    }

    res.json({
      success: true,
      message: `Proposal successfully delivered to ${targetEmail}`,
      data: doc,
      messageId: deliveryResult.messageId
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  exportDocumentPdf,
  transitionDocument,
  recordInvoicePayment,
  correctInvoicePayment,
  deleteInvoicePayment,
  sendProposalEmail,
};
