const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    startTime:      { type: Date, required: true },
    endTime:        { type: Date, required: true },
    focusLevel:     { type: Number, required: true, min: 1, max: 5 },
    notes:          { type: String, default: '' },
    actualDuration: { type: Number, default: 0 },  // đơn vị: giây
    isEnded:        { type: Boolean, default: false },
  },
  {
    timestamps: true,
    // Fix API-2: bỏ toJSON virtuals — durationMinutes expose endTime-startTime
    // ra client và làm lộ schema nội bộ. Tính toán này đã được xử lý trong DTO.
  }
);

// Fix DB-IDX-1: compound index theo thứ tự equality → sort
// find({ userId }).sort({ startTime: -1 }) — getSessions, getHeatmap
studySessionSchema.index({ userId: 1, startTime: -1 });

// find({ userId }).sort({ updatedAt: -1 }) — scheduler, checkInactivityWarning
studySessionSchema.index({ userId: 1, updatedAt: -1 });

// find({ userId, subjectId }) — getBySubject aggregation
studySessionSchema.index({ userId: 1, subjectId: 1 });

module.exports = mongoose.model('StudySession', studySessionSchema);