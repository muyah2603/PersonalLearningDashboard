const mongoose = require('mongoose');

const NOTIFICATION_TYPES = {
  INACTIVITY: 'INACTIVITY',
  GENERAL:    'GENERAL',
};

const notificationSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, enum: Object.values(NOTIFICATION_TYPES), default: NOTIFICATION_TYPES.GENERAL },
    content: { type: String, required: true },
    isRead:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Fix DB-IDX-1: index cho scheduler query (userId + type + createdAt)
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

// Index riêng cho query "thông báo chưa đọc của user"
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;