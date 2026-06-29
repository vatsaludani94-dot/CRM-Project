const Channel = require('../models/Channel');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

const getChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ tenant: req.user.tenant })
      .populate('members', 'name email role')
      .sort({ name: 1 });
    res.json({ success: true, count: channels.length, data: channels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createChannel = async (req, res) => {
  try {
    const { name, description, isPrivate, members } = req.body;

    const defaultMembers = members || [req.user._id];
    if (!defaultMembers.includes(req.user._id.toString())) {
      defaultMembers.push(req.user._id);
    }

    const channel = await Channel.create({
      name: name.toLowerCase().replace(/[^a-z0-9-_]/g, ''),
      description: description || '',
      isPrivate: !!isPrivate,
      members: defaultMembers,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: channel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const { channelId, recipientId } = req.query; // Query by channel or recipient (DMs)
    let query = { tenant: req.user.tenant };

    if (channelId) {
      query.channel = channelId;
    } else if (recipientId) {
      query.$or = [
        { sender: req.user._id, recipient: recipientId },
        { sender: recipientId, recipient: req.user._id }
      ];
    } else {
      return res.status(400).json({ success: false, error: 'Specify channelId or recipientId for messages query' });
    }

    const messages = await ChatMessage.find(query)
      .populate('sender', 'name email role profilePicture')
      .populate('recipient', 'name email')
      .sort({ createdAt: 1 });

    res.json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const sendChatMessage = async (req, res) => {
  try {
    const { channelId, recipientId, messageText, attachments } = req.body;

    if (!messageText) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    const message = await ChatMessage.create({
      channel: channelId || undefined,
      recipient: recipientId || undefined,
      sender: req.user._id,
      messageText,
      attachments: attachments || [],
      tenant: req.user.tenant,
    });

    // Populate sender details for return payload
    const populatedMessage = await ChatMessage.findById(message._id)
      .populate('sender', 'name email role profilePicture');

    // Trigger real-time alert via Socket.IO
    const io = req.app.get('io');
    if (io) {
      if (channelId) {
        io.to(`channel_${channelId}`).emit('new_message', populatedMessage);
      } else if (recipientId) {
        io.to(`user_${recipientId}`).emit('new_dm', populatedMessage);
      }
    }

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getTeamMembers = async (req, res) => {
  try {
    const members = await User.find({ tenant: req.user.tenant, status: 'active' })
      .select('name email role department profilePicture');
    res.json({ success: true, count: members.length, data: members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getChannels,
  createChannel,
  getChatMessages,
  sendChatMessage,
  getTeamMembers,
};
