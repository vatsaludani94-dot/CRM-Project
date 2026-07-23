const Channel = require('../models/Channel');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

const getChannels = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const channels = await Channel.find(tenantFilter)
      .populate('members', 'name email role')
      .sort({ name: 1 });
    res.json({ success: true, count: channels.length, data: channels });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const createChannel = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const { name, description, isPrivate, members } = req.body;

    const defaultMembers = members || [req.user._id];
    if (!defaultMembers.includes(req.user._id.toString())) {
      defaultMembers.push(req.user._id);
    }

    // Validate members belong to tenant
    if (members && members.length > 0) {
      const validMembers = await User.find({ _id: { $in: members }, ...tenantFilter }).select('_id');
      const validIds = validMembers.map(m => m._id.toString());
      if (validIds.length !== members.length) {
        return res.status(400).json({ success: false, error: 'One or more members do not belong to your workspace' });
      }
    }

    const channel = await Channel.create({
      name: name.toLowerCase().replace(/[^a-z0-9-_]/g, ''),
      description: description || '',
      isPrivate: !!isPrivate,
      members: defaultMembers,
      tenant: tenantId,
    });

    res.status(201).json({ success: true, data: channel });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { channelId, recipientId } = req.query;
    let query = { ...tenantFilter };

    if (channelId) {
      const channelObj = await Channel.findOne({ _id: channelId, ...tenantFilter });
      if (!channelObj) {
        return res.status(404).json({ success: false, error: 'Channel not found in workspace' });
      }
      query.channel = channelId;
    } else if (recipientId) {
      const recipientObj = await User.findOne({ _id: recipientId, ...tenantFilter });
      if (!recipientObj) {
        return res.status(404).json({ success: false, error: 'Recipient user not found in workspace' });
      }
      query.$and = [
        tenantFilter,
        {
          $or: [
            { sender: req.user._id, recipient: recipientId },
            { sender: recipientId, recipient: req.user._id }
          ]
        }
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
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const sendChatMessage = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const { channelId, recipientId, messageText, attachments } = req.body;

    if (!messageText) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    if (channelId) {
      const channelObj = await Channel.findOne({ _id: channelId, ...tenantFilter });
      if (!channelObj) {
        return res.status(404).json({ success: false, error: 'Channel not found in workspace' });
      }
    }

    if (recipientId) {
      const recipientObj = await User.findOne({ _id: recipientId, ...tenantFilter });
      if (!recipientObj) {
        return res.status(404).json({ success: false, error: 'Recipient user not found in workspace' });
      }
    }

    const message = await ChatMessage.create({
      channel: channelId || undefined,
      recipient: recipientId || undefined,
      sender: req.user._id,
      messageText,
      attachments: attachments || [],
      tenant: tenantId,
    });

    const populatedMessage = await ChatMessage.findOne({ _id: message._id, ...tenantFilter })
      .populate('sender', 'name email role profilePicture');

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
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const getTeamMembers = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const members = await User.find({ ...tenantFilter, status: 'active' })
      .select('name email role department profilePicture');
    res.json({ success: true, count: members.length, data: members });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getChannels,
  createChannel,
  getChatMessages,
  sendChatMessage,
  getTeamMembers,
};
