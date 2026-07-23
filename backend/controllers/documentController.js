const Document = require('../models/Document');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const { autoCreateCustomerFolder } = require('./driveController');
const DriveFolder = require('../models/DriveFolder');
const DriveFile = require('../models/DriveFile');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

const getDocuments = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { type, status } = req.query;
    let query = { ...tenantFilter };

    if (type) query.type = type;
    if (status) query.status = status;

    const documents = await Document.find(query)
      .populate('customer', 'companyName contactPerson')
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
    };

    const doc = await Document.create({
      name,
      type,
      status: status || 'Draft',
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

const exportDocumentPdf = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const doc = await Document.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('customer', 'companyName contactPerson email phone')
      .populate('lead', 'company contactName email');

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name.replace(/\s+/g, '_')}_v${doc.version}.pdf"`);
    
    const dummyPdfContent = Buffer.from(`%PDF-1.4\n%GrownX Document Generator\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 100 >>\nstream\nBT /F1 12 Tf 50 700 Td (GrownX ${doc.type}: ${doc.name}) Tj ET\nBT /F1 10 Tf 50 650 Td (Status: ${doc.status} - Total Amount: $${doc.metadata.netAmount}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000018 00000 n\n0000000069 00000 n\n0000000135 00000 n\n0000000212 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n360\n%%EOF`);
    
    res.send(dummyPdfContent);
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
};
