const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    focusLevel: { type: Number, required: true, min: 1, max: 5 },
    notes: { type: String, default: '' },
    actualDuration: { type: Number, default: 0 },
    isEnded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Virtual: duration in minutes
studySessionSchema.virtual('durationMinutes').get(function () {
  return Math.round((this.endTime - this.startTime) / 60000);
});

studySessionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('StudySession', studySessionSchema);
