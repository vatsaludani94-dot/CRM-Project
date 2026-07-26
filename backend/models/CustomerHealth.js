const mongoose = require('mongoose');

const RiskFactorSchema = new mongoose.Schema({
  factor: { type: String, required: true },
  impact: { type: Number, required: true } // e.g. -20
});

const PositiveFactorSchema = new mongoose.Schema({
  factor: { type: String, required: true },
  impact: { type: Number, required: true } // e.g. +15
});

const HealthHistorySchema = new mongoose.Schema({
  score: { type: Number, required: true },
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  reason: { type: String }
});

const CustomerHealthSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    healthScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 80
    },
    healthStatus: {
      type: String,
      enum: ['Healthy', 'Stable', 'At Risk', 'Critical'],
      default: 'Healthy'
    },
    lastInteractionAt: { type: Date },
    lastPurchaseAt: { type: Date },
    lastPaymentAt: { type: Date },
    lastSupportTicketAt: { type: Date },
    nextFollowUpDate: { type: Date },

    totalRevenue: { type: Number, default: 0 },
    totalInteractions: { type: Number, default: 0 },
    openTickets: { type: Number, default: 0 },
    overdueInvoices: { type: Number, default: 0 },
    recentActivityCount: { type: Number, default: 0 },

    engagementScore: { type: Number, default: 25 },
    paymentScore: { type: Number, default: 25 },
    supportScore: { type: Number, default: 25 },
    recencyScore: { type: Number, default: 25 },

    riskFactors: [RiskFactorSchema],
    positiveFactors: [PositiveFactorSchema],
    history: [HealthHistorySchema],
    calculatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

CustomerHealthSchema.index({ tenant: 1, healthStatus: 1 });
CustomerHealthSchema.index({ tenant: 1, customer: 1 }, { unique: true });

module.exports = mongoose.model('CustomerHealth', CustomerHealthSchema);
