const StudySession = require('../models/StudySession');
const Goal         = require('../models/Goal');
const Suggestion   = require('../models/Suggestion');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { NOTIFICATION_TYPES } = require('../models/Notification');

// POST /api/suggestions/generate
const generateSuggestions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now    = new Date();

  const from7d = new Date(now);
  from7d.setDate(now.getDate() - 6);
  from7d.setHours(0, 0, 0, 0);

  const sessions7d = await StudySession.find({ userId, startTime: { $gte: from7d } }).lean();

  const suggestions = [];

  if (sessions7d.length > 0) {
    // Fix PERF-1: dùng actualDuration (giây) thay vì endTime - startTime (wall-clock)
    const totalMins  = sessions7d.reduce((sum, s) => sum + Math.round((s.actualDuration || 0) / 60), 0);
    const avgFocus   = sessions7d.reduce((sum, s) => sum + (s.focusLevel || 0), 0) / sessions7d.length;
    const avgDuration = totalMins / sessions7d.length;

    // Rule 1: session dài nhưng focus thấp → Pomodoro
    if (avgDuration > 90 && avgFocus < 2.5) {
      suggestions.push(
        'Your sessions are long but focus is low. Try the Pomodoro technique: 25–45 minute blocks with short breaks.'
      );
    }

    // Rule 2: goal progress dưới 50%
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const activeGoal = await Goal.findOne({
      userId,
      startDate: { $lte: weekEnd },
      endDate:   { $gte: weekStart },
    }).lean();

    if (activeGoal) {
      const weekSessions = sessions7d.filter(s => new Date(s.startTime) >= weekStart);
      // Fix PERF-1: actualDuration
      const weekHours = weekSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0) / 3600;
      const progress  = weekHours / activeGoal.targetHours;

      if (progress < 0.5) {
        const remaining = parseFloat((activeGoal.targetHours - weekHours).toFixed(1));
        suggestions.push(
          `You have reached ${Math.round(progress * 100)}% of your weekly goal. You need ${remaining} more hours to reach the target.`
        );
      }
    }
  }

  // Rule 3: không học trong 3 ngày — tạo notification
  // Fix DB-2: dùng typed `type` field thay vì content string
  const from3d = new Date(now);
  from3d.setDate(now.getDate() - 2);
  from3d.setHours(0, 0, 0, 0);

  const recentCount = await StudySession.countDocuments({ userId, startTime: { $gte: from3d } });

  if (recentCount === 0) {
    // Tránh duplicate notification cùng ngày
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const alreadyNotified = await Notification.findOne({
      userId,
      type:      NOTIFICATION_TYPES.INACTIVITY,
      createdAt: { $gte: today },
    }).lean();

    if (!alreadyNotified) {
      await Notification.create({
        userId,
        type:    NOTIFICATION_TYPES.INACTIVITY,
        content: 'You have not recorded any study sessions in the past 3 days. Keep up your learning habit!',
      });
    }
  }

  // Lưu suggestions — dùng insertMany thay vì Promise.all + create (1 round-trip)
  if (suggestions.length === 0) {
    return res.json({ data: { generated: 0, suggestions: [] } });
  }

  const docs    = suggestions.map(content => ({ userId, content }));
  const created = await Suggestion.insertMany(docs);

  res.json({ data: { generated: created.length, suggestions: created } });
});

// GET /api/suggestions
const getSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await Suggestion.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({ data: suggestions });
});

module.exports = { generateSuggestions, getSuggestions };