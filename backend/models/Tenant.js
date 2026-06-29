const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a tenant name'],
      trim: true,
    },
    subdomain: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    plan: {
      type: String,
      enum: ['free', 'growth', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    trialExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day default
    },
    whiteLabelSettings: {
      logo: { type: String, default: '' },
      customDomain: { type: String, default: '' },
      primaryColor: { type: String, default: '#6366f1' }, // Default Indigo
      secondaryColor: { type: String, default: '#0f172a' }, // Default Slate
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Tenant', TenantSchema);
