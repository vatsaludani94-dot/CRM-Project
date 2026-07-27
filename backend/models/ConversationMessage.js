const mongoose = require('mongoose');

const ConversationMessageSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    },
    senderType: {
      type: String,
      enum: ['customer', 'lead', 'agent', 'system', 'visitor'],
      default: 'agent',
    },
    senderUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    senderEmail: {
      type: String,
      trim: true,
    },
    senderName: {
      type: String,
      trim: true,
    },
    recipientEmail: {
      type: String,
      trim: true,
    },
    channel: {
      type: String,
      enum: ['email', 'web_form', 'live_chat', 'phone', 'internal'],
      default: 'email',
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound', 'internal'],
      default: 'outbound',
    },
    subject: {
      type: String,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    bodyHtml: {
      type: String,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
      },
    ],
    externalMessageId: {
      type: String,
    },
    deliveryStatus: {
      type: String,
      enum: ['received', 'queued', 'sent', 'delivered', 'failed'],
      default: 'sent',
    },
    isInternal: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ConversationMessageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('ConversationMessage', ConversationMessageSchema);
