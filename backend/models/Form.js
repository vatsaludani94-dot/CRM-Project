const mongoose = require('mongoose');

const FormFieldSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Text', 'Email', 'Phone', 'Number', 'File Upload', 'Dropdown', 'Radio', 'Checkbox', 'Signature', 'text', 'email', 'phone', 'number'],
    required: true,
    set: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : v,
  },
  label: { type: String, required: true },
  placeholder: String,
  required: { type: Boolean, default: false },
  options: [String], // for dropdown, radio, checkboxes
  conditionalLogic: {
    showIfField: String, // label or field id
    showIfValue: String,
  },
  validationRules: {
    minLength: Number,
    maxLength: Number,
    pattern: String,
  }
});

const FormSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fields: [FormFieldSchema],
    themeSettings: {
      primaryColor: { type: String, default: '#6366f1' },
      backgroundColor: { type: String, default: '#ffffff' },
      textColor: { type: String, default: '#0f172a' },
      customCSS: { type: String, default: '' },
    },
    submissionAction: {
      type: String,
      enum: ['Create Lead', 'Create Customer', 'Create Ticket'],
      default: 'Create Lead',
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

module.exports = mongoose.model('Form', FormSchema);
