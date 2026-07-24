const mongoose = require('mongoose');

const ScoreFactorSchema = new mongoose.Schema({
  factor: { type: String, required: true },
  impact: { type: Number, required: true },
  explanation: { type: String, required: true },
});

const LeadScoreHistorySchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    previousScore: {
      type: Number,
      default: 50,
    },
    newScore: {
      type: Number,
      required: true,
    },
    scoreChange: {
      type: Number,
      required: true,
    },
    factors: [ScoreFactorSchema],
    model: {
      type: String,
      enum: ['gemini', 'heuristic'],
      default: 'heuristic',
    },
    reason: {
      type: String,
      default: 'Automated Recalculation',
    },
  },
  {
    timestamps: true,
  }
);

LeadScoreHistorySchema.index({ tenant: 1, lead: 1, createdAt: -1 });

module.exports = mongoose.model('LeadScoreHistory', LeadScoreHistorySchema);
