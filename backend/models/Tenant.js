const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a tenant name'],
      trim: true,
    },
    workspaceName: {
      type: String,
      trim: true,
    },
    communicationEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    communicationEmailName: {
      type: String,
      trim: true,
    },
    communicationEmailStatus: {
      type: String,
      enum: ['unconfigured', 'pending_verification', 'verified'],
      default: 'unconfigured',
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light',
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
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    whiteLabelSettings: {
      logo: { type: String, default: '' },
      customDomain: { type: String, default: '' },
      primaryColor: { type: String, default: '#6366f1' },
      secondaryColor: { type: String, default: '#0f172a' },
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for resolved workspace name with fallback
TenantSchema.virtual('resolvedWorkspaceName').get(function () {
  return this.workspaceName || this.name || 'GrownX Workspace';
});

// Virtual for resolved communication email with fallback
TenantSchema.virtual('resolvedCommunicationEmail').get(function () {
  return this.communicationEmail || (this.owner ? this.owner.email : undefined);
});

module.exports = mongoose.model('Tenant', TenantSchema);
