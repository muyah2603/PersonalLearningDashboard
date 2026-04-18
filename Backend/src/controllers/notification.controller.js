const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json(notifications);
};

const markAsRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: 'Không tìm thấy thông báo' });
  res.json(notification);
};

const markAllRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'Đã đánh dấu tất cả đã đọc' });
};

module.exports = { getNotifications, markAsRead, markAllRead };
