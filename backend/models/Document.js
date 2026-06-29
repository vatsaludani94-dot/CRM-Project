const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Contract', 'Proposal', 'Invoice', 'Agreement', 'Report'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Approved', 'Declined'],
      default: 'Draft',
    },
    metadata: {
      lineItems: [
        {
          description: String,
          quantity: Number,
          unitPrice: Number,
          total: Number,
        }
      ],
      taxRate: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      discountRate: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      subtotalAmount: { type: Number, default: 0 },
      netAmount: { type: Number, default: 0 },
      signaturePng: String, // Base64 signature
      notes: String,
      validUntil: Date,
      dueDate: Date,
      aiSummary: String, // Proposals can have AI summaries or notes
    },
    pdfUrl: {
      type: String,
      default: '',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    version: {
      type: Number,
      default: 1,
    },
    googleDriveLinked: {
      type: Boolean,
      default: false,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Document', DocumentSchema);
