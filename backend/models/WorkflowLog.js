const mongoose = require('mongoose');

const WorkflowLogSchema = new mongoose.Schema(
  {
    workflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ['Lead', 'Customer', 'Ticket', 'FormSubmission', 'SurveySubmission', 'Appointment'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'in_progress'],
      default: 'in_progress',
    },
    executedSteps: [
      {
        stepIndex: Number,
        stepType: String,
        actionType: String,
        executionTime: { type: Date, default: Date.now },
        success: Boolean,
        error: String,
      }
    ],
    errorDetails: {
      type: String,
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

module.exports = mongoose.model('WorkflowLog', WorkflowLogSchema);
