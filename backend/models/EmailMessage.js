const mongoose = require('mongoose');

const EmailMessageSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      default: '(No Subject)',
    },
    body: {
      type: String,
      required: true,
    },
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
    },
    cc: [String],
    bcc: [String],
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },
    tracking: {
      opened: { type: Boolean, default: false },
      openedAt: { type: Date },
    },
    attachments: [
      {
        name: String,
        sizeBytes: Number,
        url: String,
      }
    ],
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    threadId: String,
    messageId: String,
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EmailMessage', EmailMessageSchema);
