const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['super_admin', 'workspace_owner', 'manager', 'employee', 'customer'],
      default: 'employee',
    },
    department: {
      type: String,
      enum: ['Management', 'Sales', 'Customer Support', 'Engineering', 'HR', 'Finance', 'None'],
      default: 'None',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    gmailOAuth: {
      accessToken: String,
      refreshToken: String,
      emailSyncActive: { type: Boolean, default: false },
      connectedEmail: String,
    },
    googleDriveLinked: {
      type: Boolean,
      default: false,
    },
    resetPasswordOtp: String,
    resetPasswordOtpExpire: Date,
    purchasedLicenses: [
      {
        licenseKey: String,
        planName: String,
        amountPaid: Number,
        paymentId: String,
        orderId: String,
        purchasedAt: { type: Date, default: Date.now }
      }
    ],
    googleSubjectId: {
      type: String,
      unique: true,
      sparse: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
    },
    twoFactorRecoveryCodes: [
      {
        codeHash: { type: String, required: true },
        used: { type: Boolean, default: false },
        usedAt: Date,
      }
    ],
    passkeyChallenge: String,
    passkeyChallengeExpiresAt: Date,
    tokenVersion: {
      type: Number,
      default: 0,
    },
    passkeys: [
      {
        credentialID: { type: String, required: true },
        credentialPublicKey: { type: String, required: true },
        counter: { type: Number, default: 0 },
        transports: [String],
        deviceName: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  if (
    this.password.startsWith('$2a$') ||
    this.password.startsWith('$2b$') ||
    this.password.startsWith('$2y$') ||
    this.password.startsWith('$2x$')
  ) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
