const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  comment: {
    type: String,
    required: true,
  },
  commentedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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
      default: 'General Inquiry', // Support, Billing, Technical, Sales, etc.
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    comments: [CommentSchema],
    attachments: [
      {
        fileName: String,
        fileUrl: String,
      },
    ],
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }
  },
  {
    timestamps: true,
  }
);

// Auto-generate ticketCode if not provided
TicketSchema.pre('validate', function (next) {
  if (!this.ticketCode) {
    const random = Math.floor(10000 + Math.random() * 90000);
    this.ticketCode = `TKT-${random}`;
  }
  next();
});

// Indexing for ticketing dashboards
TicketSchema.index({ status: 1, priority: 1, assignedEmployee: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);
