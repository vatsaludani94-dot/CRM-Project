const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
  },
  details: {
    type: String,
    required: true,
  },
  module: {
    type: String,
    enum: ['Authentication', 'Customer', 'Lead', 'Ticket', 'Employee', 'Payroll', 'AI', 'System'],
    required: true,
  },
  ipAddress: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ActivitySchema.index({ module: 1, createdAt: -1 });
ActivitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
