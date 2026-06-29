const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Used for Direct Messages (DMs)
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messageText: {
      type: String,
      required: true,
    },
    attachments: [
      {
        name: String,
        url: String,
      }
    ],
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
