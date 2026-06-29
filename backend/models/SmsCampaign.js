const mongoose = require('mongoose');

const SmsCampaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    messageTemplate: {
      type: String,
      required: true,
    },
    segments: {
      type: [String], // e.g. ['Lead', 'Customer', 'VIP', 'Sales']
      default: [],
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Sending', 'Completed'],
      default: 'Draft',
    },
    deliveryCount: {
      type: Number,
      default: 0,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SmsCampaign', SmsCampaignSchema);
