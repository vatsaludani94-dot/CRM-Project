const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const InteractionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Call', 'Email', 'Meeting', 'Note', 'System', 'Ticket Created', 'Ticket Resolved', 'Lead Converted'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const LeadHistorySchema = new mongoose.Schema({
  stage: {
    type: String,
    required: true,
  },
  changedAt: {
    type: Date,
    default: Date.now,
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const CustomerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Please provide a company name'],
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Please provide a contact person name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    industry: {
      type: String,
      required: [true, 'Please provide an industry'],
      trim: true,
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'VIP'],
      default: 'Active',
    },
    revenueGenerated: {
      type: Number,
      default: 0,
    },
    notes: [NoteSchema],
    activities: [InteractionSchema],
    leadHistory: [LeadHistorySchema],
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }
  },
  {
    timestamps: true,
  }
);

// Auto-generate customerCode if not provided
CustomerSchema.pre('validate', function (next) {
  if (!this.customerCode) {
    const random = Math.floor(1000 + Math.random() * 9000);
    this.customerCode = `CUST-${random}`;
  }
  next();
});

// Create index on search-heavy fields
CustomerSchema.index({ companyName: 'text', contactPerson: 'text', customerCode: 1 });

module.exports = mongoose.model('Customer', CustomerSchema);
