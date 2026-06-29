const mongoose = require('mongoose');

const FormSubmissionSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      // References created Lead, Customer, or Ticket
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

module.exports = mongoose.model('FormSubmission', FormSubmissionSchema);
