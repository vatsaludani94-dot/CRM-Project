const mongoose = require('mongoose');

const DriveFolderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Customer', 'Deal', 'Project', 'General'],
      default: 'General',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      // Ref is dynamic (Customer or Lead or Task)
    },
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DriveFolder',
    },
    permissions: {
      roleAccess: {
        type: [String],
        enum: ['super_admin', 'workspace_owner', 'manager', 'employee', 'customer'],
        default: ['super_admin', 'workspace_owner', 'manager', 'employee'],
      }
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

module.exports = mongoose.model('DriveFolder', DriveFolderSchema);
