const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetHours: { type: Number, required: true, min: 0 },
    startDate:   { type: Date, required: true },
    endDate:     { type: Date, required: true },
    status:      { type: String, default: 'in_progress' },
  },
  { timestamps: true }
);

// Fix DB-IDX-1:
// find({ userId }).sort({ startDate: -1 }) — getGoals, getGoalProgress
goalSchema.index({ userId: 1, startDate: -1 });

// find({ userId, startDate: $lte, endDate: $gte }) — suggestion.controller, checkInactivityWarning
goalSchema.index({ userId: 1, endDate: 1 });

module.exports = mongoose.model('Goal', goalSchema);