const mongoose = require('mongoose');

const PrePaymentOnboardingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    niche: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    cityState: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'pre_payment_registered',
        'trial_registered',
        'payment_pending',
        'payment_successful',
        'workspace_registration_pending',
        'workspace_registered',
        'active',
      ],
      default: 'pre_payment_registered',
    },
    razorpayOrderId: {
      type: String,
      default: '',
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    paymentToken: {
      type: String,
      default: '',
    },
    paymentVerifiedAt: {
      type: Date,
    },
    workspaceRegisteredAt: {
      type: Date,
    },
    createdUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdTenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  },
  {
    timestamps: true,
  }
);

PrePaymentOnboardingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PrePaymentOnboarding', PrePaymentOnboardingSchema);
