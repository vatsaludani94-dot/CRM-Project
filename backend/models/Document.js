const mongoose = require('mongoose');

const CorrectionRecordSchema = new mongoose.Schema({
  originalAmount: Number,
  correctedAmount: Number,
  reason: String,
  correctedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  correctedAt: {
    type: Date,
    default: Date.now,
  },
});

const PaymentRecordSchema = new mongoose.Schema({
  paymentId: String,
  amount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Credit Card', 'Stripe', 'Check', 'Cheque', 'Cash', 'Other'],
    default: 'Bank Transfer',
  },
  transactionRef: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  isCorrected: {
    type: Boolean,
    default: false,
  },
  correctionHistory: [CorrectionRecordSchema],
});

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
      enum: ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Approved', 'Declined', 'Partially_Paid', 'Paid', 'Overdue', 'Expired', 'Void', 'Cancelled'],
      default: 'Draft',
    },
    documentNumber: {
      type: String,
      trim: true,
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
      amountPaid: { type: Number, default: 0 },
      amountDue: { type: Number, default: 0 },
      creditBalance: { type: Number, default: 0 },
      paymentHistory: [PaymentRecordSchema],
      signaturePng: String,
      notes: String,
      validUntil: Date,
      dueDate: Date,
      aiSummary: String,
      linkedProposal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
      linkedInvoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
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
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

DocumentSchema.index({ tenant: 1, type: 1, status: 1 });
DocumentSchema.index({ tenant: 1, customer: 1 });

module.exports = mongoose.model('Document', DocumentSchema);
