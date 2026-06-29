const mongoose = require('mongoose');

const DriveFileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },
    sizeBytes: {
      type: Number,
      required: true,
      default: 0,
    },
    url: {
      type: String,
      required: true,
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DriveFolder',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

module.exports = mongoose.model('DriveFile', DriveFileSchema);
