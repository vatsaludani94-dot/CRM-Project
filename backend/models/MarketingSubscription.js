const mongoose = require('mongoose');

const marketingSubscriptionSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    status: {
      type: String,
      enum: ['subscribed', 'unsubscribed'],
      default: 'subscribed',
    },
    unsubscribedAt: {
      type: Date,
    },
    unsubscribeReason: {
      type: String,
      default: 'User requested unsubscribe via email link',
    },
  },
  {
    timestamps: true,
  }
);

marketingSubscriptionSchema.index({ tenant: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('MarketingSubscription', marketingSubscriptionSchema);
