const Notification = require('../models/Notification');
const { getTenantFilter } = require('../utils/tenantScope');

/**
 * @desc    Get all notifications for logged-in user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const notifications = await Notification.find({ recipient: req.user._id, ...tenantFilter })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      ...tenantFilter
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    await Notification.updateMany(
      { recipient: req.user._id, read: false, ...tenantFilter },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
      ...tenantFilter
    });

    res.json({ success: true, count });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
