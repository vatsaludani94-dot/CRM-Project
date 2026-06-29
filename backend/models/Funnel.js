const mongoose = require('mongoose');

const FunnelStepSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  content: mongoose.Schema.Types.Mixed, // Drag-and-drop page block elements
});

const FunnelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    template: {
      type: String,
      enum: [
        'Lead Generation Funnel',
        'Appointment Funnel',
        'Webinar Funnel',
        'Product Funnel',
        'Consultation Funnel',
        'Agency Funnel'
      ],
      default: 'Lead Generation Funnel',
    },
    steps: [FunnelStepSchema],
    stats: {
      visitors: { type: Number, default: 0 },
      leads: { type: Number, default: 0 },
      appointments: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 }, // percentage
      revenue: { type: Number, default: 0 },
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

module.exports = mongoose.model('Funnel', FunnelSchema);
