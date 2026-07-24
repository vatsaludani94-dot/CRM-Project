const mongoose = require('mongoose');

const PipelineStageSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a stage display name'],
      trim: true,
    },
    key: {
      type: String,
      required: [true, 'Please provide a stage key'],
      trim: true,
      uppercase: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    color: {
      type: String,
      default: '#d97706', // Default Amber HEX
    },
    probability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 10,
    },
    isWon: {
      type: Boolean,
      default: false,
    },
    isLost: {
      type: Boolean,
      default: false,
    },
    isSystemStage: {
      type: Boolean,
      default: false,
    },
    exitRules: [{
      type: String,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for tenant isolation and stage ordering
PipelineStageSchema.index({ tenant: 1, order: 1 });
PipelineStageSchema.index({ tenant: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('PipelineStage', PipelineStageSchema);
