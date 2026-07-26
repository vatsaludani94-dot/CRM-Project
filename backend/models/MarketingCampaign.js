const mongoose = require('mongoose');

const marketingCampaignSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: [
        'Email Campaign',
        'Automated Campaign',
        'Email Sequence',
        'Re-Engagement Campaign',
        'Customer Nurture Campaign',
      ],
      default: 'Email Campaign',
    },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Processing', 'Completed', 'Paused', 'Cancelled', 'Failed'],
      default: 'Draft',
    },
    audienceDefinition: {
      targetType: {
        type: String,
        enum: ['Leads', 'Customers', 'Both'],
        default: 'Leads',
      },
      leadFilters: {
        stages: [{ type: String }],
        minAiScore: { type: Number },
        maxAiScore: { type: Number },
        leadSources: [{ type: String }],
        minExpectedRevenue: { type: Number },
        maxExpectedRevenue: { type: Number },
        inactiveDays: { type: Number },
      },
      customerFilters: {
        statuses: [{ type: String }],
        healthStatuses: [{ type: String }],
        minHealthScore: { type: Number },
        maxHealthScore: { type: Number },
        minRevenue: { type: Number },
        maxRevenue: { type: Number },
        minOutstandingBalance: { type: Number },
        inactiveDays: { type: Number },
      },
    },
    emailContent: {
      subject: {
        type: String,
        required: [true, 'Campaign email subject is required'],
      },
      body: {
        type: String,
        required: [true, 'Campaign email body content is required'],
      },
      attachments: [
        {
          name: String,
          url: String,
          type: String,
        },
      ],
    },
    schedule: {
      sendType: {
        type: String,
        enum: ['Now', 'Scheduled'],
        default: 'Now',
      },
      scheduledAt: { type: Date },
      timezone: { type: String, default: 'UTC' },
      sentAt: { type: Date },
      completedAt: { type: Date },
    },
    metrics: {
      totalMatched: { type: Number, default: 0 },
      eligibleRecipients: { type: Number, default: 0 },
      sentCount: { type: Number, default: 0 },
      deliveredCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      unsubscribedCount: { type: Number, default: 0 },
      duplicateCount: { type: Number, default: 0 },
      invalidEmailCount: { type: Number, default: 0 },
      openedCount: { type: Number, default: 0 },
      clickedCount: { type: Number, default: 0 },
      convertedCount: { type: Number, default: 0 },
      revenueInfluenced: { type: Number, default: 0 },
    },
    executionState: {
      status: {
        type: String,
        enum: ['idle', 'processing', 'completed', 'failed'],
        default: 'idle',
      },
      executionId: { type: String, default: null },
      executionStartedAt: { type: Date },
      executionCompletedAt: { type: Date },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

marketingCampaignSchema.index({ tenant: 1, status: 1 });
marketingCampaignSchema.index({ tenant: 1, 'schedule.scheduledAt': 1 });

module.exports = mongoose.model('MarketingCampaign', marketingCampaignSchema);
