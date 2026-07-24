const mongoose = require('mongoose');

const LeadNoteSchema = new mongoose.Schema({
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

const LeadActivitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Email', 'Call', 'Meeting', 'Proposal', 'Note', 'System'],
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

const LeadSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Please provide a company name'],
      trim: true,
    },
    contactName: {
      type: String,
      required: [true, 'Please provide a contact name'],
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
    leadSource: {
      type: String,
      enum: ['Website', 'Referral', 'Cold Call', 'Social Media', 'Organic', 'Paid Ad', 'Email', 'Web Form', 'Other'],
      default: 'Website',
    },
    expectedRevenue: {
      type: Number,
      default: 0,
    },
    stage: {
      type: String,
      default: 'New',
    },
    stageKey: {
      type: String,
      default: 'NEW',
      uppercase: true,
    },
    lostReason: {
      type: String,
      enum: ['Price', 'Competitor', 'No Response', 'Feature Gap', 'Not Interested', 'Other', null],
      default: null,
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    aiScore: {
      type: Number,
      default: 50, // 0 to 100 probability of conversion
    },
    notes: [LeadNoteSchema],
    activityLog: [LeadActivitySchema],
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }
  },
  {
    timestamps: true,
  }
);

// Index for Kanban sorting & assignments
LeadSchema.index({ stage: 1, assignedEmployee: 1 });

module.exports = mongoose.model('Lead', LeadSchema);
