const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  link: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['Ticket', 'Lead', 'Payroll', 'System', 'General'],
    default: 'General',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
