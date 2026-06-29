const mongoose = require('mongoose');

const WorkflowStepSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Condition', 'Action', 'Delay'],
    required: true,
  },
  config: {
    // Actions
    actionType: { type: String }, // 'Send Email', 'Send SMS', 'Send WhatsApp Message', 'Create Calendar Event', 'Create Task', 'Create Ticket', 'Assign Employee', 'Notify Team', 'Create Google Drive Folder', 'Generate Proposal', 'Generate Invoice', 'Trigger Webhook'
    emailSubject: String,
    emailBody: String,
    smsText: String,
    whatsappText: String,
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    taskTitle: String,
    taskPriority: String,
    webhookUrl: String,
    
    // Conditions
    conditionField: String, // e.g., 'status', 'revenueGenerated', 'industry'
    conditionOperator: { type: String, enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains'] },
    conditionValue: String,
    
    // Delays
    delayDuration: Number, // in minutes/hours/seconds
    delayUnit: { type: String, enum: ['seconds', 'minutes', 'hours', 'days'], default: 'minutes' }
  }
});

const WorkflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a workflow name'],
      trim: true,
    },
    trigger: {
      type: String,
      required: true,
      enum: [
        'Lead Created',
        'Lead Converted',
        'Customer Created',
        'Ticket Created',
        'Form Submitted',
        'Survey Submitted',
        'Appointment Booked',
        'Deal Won',
        'Deal Lost',
        'Email Received',
        'WhatsApp Message Received',
        'Instagram Message Received'
      ]
    },
    steps: [WorkflowStepSchema],
    isActive: {
      type: Boolean,
      default: true,
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

module.exports = mongoose.model('Workflow', WorkflowSchema);
