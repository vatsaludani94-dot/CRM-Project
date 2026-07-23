const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, 'Please specify a meeting subject'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Please specify the appointment date'],
    },
    startTime: {
      type: String, // e.g. "10:00"
      required: [true, 'Please specify start time'],
    },
    endTime: {
      type: String, // e.g. "11:00"
      required: [true, 'Please specify end time'],
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false, // Can link to a customer
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: false, // Or link to a lead
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please assign an employee host'],
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for Calendar sorting
AppointmentSchema.index({ tenant: 1, appointmentDate: 1 });
AppointmentSchema.index({ appointmentDate: 1, host: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
