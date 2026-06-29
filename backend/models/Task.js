const mongoose = require('mongoose');

const TaskCommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    dueDate: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Blocked'],
      default: 'Pending',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    parentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task', // Subtask support
    },
    comments: [TaskCommentSchema],
    attachments: [String], // URLs/filenames
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
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

module.exports = mongoose.model('Task', TaskSchema);
