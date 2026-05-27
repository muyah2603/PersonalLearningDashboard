const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:   { type: String, required: true, trim: true },

    // Fix VAL-2: thêm 2 field này để khớp với những gì FE gửi lên
    description: { type: String, default: '' },
    targetHours: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Fix DB-IDX-1: compound index cho query find({ userId }).sort({ name: 1 })
subjectSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Subject', notificationSchema);