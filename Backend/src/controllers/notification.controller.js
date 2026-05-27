const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { NOTIFICATION_TYPES } = require('../models/Notification');

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({ data: notifications });
});

// PUT /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification)
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });

  res.json({ data: notification });
});

// PUT /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );
  res.json({ data: { updated: result.modifiedCount } });
});

module.exports = { getNotifications, markAsRead, markAllRead };