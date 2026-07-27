const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  comment: {
    type: String,
    required: true,
  },
  commentedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  isInternal: {
    type: Boolean,
    default: false,
  },
  attachments: [
    {
      fileName: String,
      fileUrl: String,
      fileType: String,
      fileSize: Number,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const TicketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a ticket title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a ticket description'],
    },
    category: {
      type: String,
      default: 'General Inquiry',
    },
    channel: {
      type: String,
      enum: ['email', 'web_form', 'live_chat', 'phone', 'internal'],
      default: 'email',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent', 'Critical'],
      default: 'Medium',
    },
    priorityExplanation: {
      type: String,
      default: '',
    },
    priorityDrivers: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: [
        'Open',
        'Assigned',
        'In Progress',
        'In_Progress',
        'Waiting for Customer',
        'Waiting for Agent',
        'Resolved',
        'Closed',
        'Reopened',
      ],
      default: 'Open',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: false,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: false,
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    assignedTeam: {
      type: String,
      default: 'Customer Care Support',
    },
    acknowledgmentSentAt: {
      type: Date,
    },
    firstResponseDueAt: {
      type: Date,
    },
    resolutionDueAt: {
      type: Date,
    },
    firstRespondedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionSummary: {
      type: String,
      default: '',
    },
    resolutionDurationMinutes: {
      type: Number,
      default: 0,
    },
    reopenedAt: {
      type: Date,
    },
    reopenCount: {
      type: Number,
      default: 0,
    },
    slaStatus: {
      type: String,
      enum: ['On Track', 'At Risk', 'Breached', 'Completed'],
      default: 'On Track',
    },
    comments: [CommentSchema],
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
      },
    ],
    aiClarification: {
      active: { type: Boolean, default: false },
      questionsGathered: [{ type: String }],
      issueSummary: { type: String, default: '' },
      urgencyRating: { type: String, default: 'Medium' },
      affectedItems: { type: String, default: 'Single' },
      recentChangeDetails: { type: String, default: '' },
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

TicketSchema.pre('validate', function (next) {
  if (!this.ticketCode) {
    const random = Math.floor(10000 + Math.random() * 90000);
    this.ticketCode = `TKT-${random}`;
  }
  next();
});

TicketSchema.index({ tenant: 1, status: 1, priority: 1, assignedEmployee: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);
