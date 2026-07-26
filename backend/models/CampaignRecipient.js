const mongoose = require('mongoose');

const campaignRecipientSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingCampaign',
      required: true,
      index: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    recipientType: {
      type: String,
      enum: ['lead', 'customer'],
      required: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    contactName: {
      type: String,
      default: 'Valued Contact',
    },
    companyName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Queued', 'Sent', 'Failed', 'Skipped', 'Unsubscribed', 'Duplicate', 'Invalid'],
      default: 'Queued',
    },
    personalizedSubject: {
      type: String,
    },
    personalizedContent: {
      type: String,
    },
    messageId: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    error: {
      type: String,
    },
    unsubscribeSkipped: {
      type: Boolean,
      default: false,
    },
    duplicateSkipped: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

campaignRecipientSchema.index({ campaign: 1, recipientEmail: 1 });
campaignRecipientSchema.index({ tenant: 1, recipientEmail: 1 });

module.exports = mongoose.model('CampaignRecipient', campaignRecipientSchema);
