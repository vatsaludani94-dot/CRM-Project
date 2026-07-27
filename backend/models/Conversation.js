const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    conversationKey: {
      type: String,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['email', 'web_form', 'live_chat', 'phone', 'internal'],
      default: 'email',
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'pending'],
      default: 'open',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    participants: [
      {
        email: String,
        name: String,
        role: {
          type: String,
          enum: ['customer', 'lead', 'agent', 'visitor'],
          default: 'customer',
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessagePreview: {
      type: String,
      default: '',
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ tenant: 1, channel: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
