const mongoose = require('mongoose');

const CallLogSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'outbound',
    },
    contactType: {
      type: String,
      enum: ['lead', 'customer'],
      default: 'customer',
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    },
    duration: {
      type: Number,
      default: 0, // seconds
    },
    outcome: {
      type: String,
      enum: ['Connected', 'Left Voicemail', 'No Answer', 'Busy', 'Scheduled Followup'],
      default: 'Connected',
    },
    notes: {
      type: String,
      required: true,
    },
    followupTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

CallLogSchema.index({ tenant: 1, createdAt: -1 });

module.exports = mongoose.model('CallLog', CallLogSchema);
