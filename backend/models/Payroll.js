const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please associate an employee'],
    },
    month: {
      type: String, // format YYYY-MM, e.g., '2026-06'
      required: [true, 'Please specify the payroll month'],
    },
    baseSalary: {
      type: Number,
      required: [true, 'Please specify the base salary'],
      min: [0, 'Base salary cannot be negative'],
    },
    bonus: {
      type: Number,
      default: 0,
      min: [0, 'Bonus cannot be negative'],
    },
    deductions: {
      type: Number,
      default: 0,
      min: [0, 'Deductions cannot be negative'],
    },
    netSalary: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Paid'],
      default: 'Draft',
    },
    paidAt: {
      type: Date,
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

// Auto-calculate netSalary before validation
PayrollSchema.pre('validate', function (next) {
  this.netSalary = this.baseSalary + (this.bonus || 0) - (this.deductions || 0);
  if (this.status === 'Paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
  next();
});

// Compound index to ensure one payroll per employee per month
PayrollSchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', PayrollSchema);
