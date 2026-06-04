const Notification  = require('../models/Notification');
const StudySession  = require('../models/StudySession');
const Goal          = require('../models/Goal');
const asyncHandler  = require('../utils/asyncHandler');
const { NOTIFICATION_TYPES } = require('../models/Notification');

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculateStreak(sessions) {
  if (!sessions.length) return 0;
  const daySet = new Set(
    sessions.map(s => new Date(s.startTime).toDateString())
  );
  const sorted = [...daySet].sort((a, b) => new Date(b) - new Date(a));

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const dayStr of sorted) {
    const day  = new Date(dayStr);
    const diff = Math.round((cursor - day) / 86400000);
    if (diff <= 1) { streak++; cursor = day; }
    else break;
  }
  return streak;
}

function avgFocus(sessions) {
  if (!sessions.length) return 0;
  return sessions.reduce((s, x) => s + x.focusLevel, 0) / sessions.length;
}

function fmtDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── GET /api/notifications ────────────────────────────────────────────────────
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({ data: notifications });
});

// ── PUT /api/notifications/:id/read ──────────────────────────────────────────
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

// ── PUT /api/notifications/read-all ──────────────────────────────────────────
const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );
  res.json({ data: { updated: result.modifiedCount } });
});

// ── POST /api/notifications/generate ─────────────────────────────────────────
// Generates notifications from real session & goal data.
const generateNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now    = new Date();
  const toCreate = [];

  const [sessions, goals] = await Promise.all([
    StudySession.find({ userId })
      .populate('subjectId', 'name')
      .sort({ startTime: -1 })
      .lean(),
    Goal.find({ userId }).sort({ endDate: 1 }).lean(),
  ]);

  // ── Session-based notifications ───────────────────────────────────────────

  if (sessions.length > 0) {
    const latest      = sessions[0];
    const subject     = latest.subjectId?.name || 'a subject';
    const durationMin = Math.round((latest.actualDuration || 0) / 60);
    const dateStr     = fmtDate(latest.startTime);

    // Latest session completion
    toCreate.push({
      content: `✅ Session complete! You studied "${subject}" for ${durationMin} min on ${dateStr}.`,
    });

    // Session count milestone (highest reached)
    const milestones  = [5, 10, 25, 50, 100, 200];
    const reached     = milestones.filter(m => sessions.length >= m).pop();
    if (reached) {
      toCreate.push({
        content: `🏆 Milestone: You've completed ${reached}+ study sessions!`,
      });
    }

    // Study streak
    const streak = calculateStreak(sessions);
    if (streak >= 2) {
      toCreate.push({
        content: `🔥 You're on a ${streak}-day study streak! Keep it up!`,
      });
    }

    // Focus level improvement (last 7 vs previous 7 sessions)
    if (sessions.length >= 8) {
      const recent = avgFocus(sessions.slice(0, 7));
      const older  = avgFocus(sessions.slice(7, 14));
      if (older > 0 && recent > older) {
        const pct = Math.round(((recent - older) / older) * 100);
        toCreate.push({
          content: `📈 Your average focus level improved by ${pct}% compared to your previous 7 sessions!`,
        });
      }
    }

    // Inactivity warning
    const daysSince = Math.floor((now - new Date(sessions[0].startTime)) / 86400000);
    if (daysSince >= 2) {
      toCreate.push({
        type:    NOTIFICATION_TYPES.INACTIVITY,
        content: `📚 You haven't studied in ${daysSince} day${daysSince !== 1 ? 's' : ''}. Time to get back on track!`,
      });
    }

    // Weekly hours progress
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekSessions  = sessions.filter(s => new Date(s.startTime) >= weekStart);
    const weekHours     = (weekSessions.reduce((s, x) => s + (x.actualDuration || 0), 0) / 3600).toFixed(1);
    if (parseFloat(weekHours) > 0) {
      toCreate.push({
        content: `📊 This week you've studied ${weekHours}h across ${weekSessions.length} session${weekSessions.length !== 1 ? 's' : ''}.`,
      });
    }
  }

  // ── Goal-based notifications ──────────────────────────────────────────────

  for (const goal of goals) {
    const goalSessions = sessions.filter(s =>
      new Date(s.startTime) >= new Date(goal.startDate) &&
      new Date(s.startTime) <= new Date(goal.endDate)
    );
    const actualHours = goalSessions.reduce((s, x) => s + (x.actualDuration || 0), 0) / 3600;
    const pct         = Math.min(100, Math.round((actualHours / goal.targetHours) * 100));
    const daysLeft    = Math.max(0, Math.ceil((new Date(goal.endDate) - now) / 86400000));
    const hoursLeft   = Math.max(0, goal.targetHours - actualHours).toFixed(1);
    const endStr      = fmtDate(goal.endDate);

    if (pct >= 100) {
      toCreate.push({
        content: `✅ Goal completed! You reached your ${goal.targetHours}h target by ${endStr}.`,
      });
    } else if (pct >= 80) {
      toCreate.push({
        content: `🎯 You're ${pct}% toward your ${goal.targetHours}h goal — only ${hoursLeft}h left!`,
      });
    } else if (pct >= 50) {
      toCreate.push({
        content: `🎯 Halfway there! You've logged ${actualHours.toFixed(1)}h of your ${goal.targetHours}h goal (${pct}%).`,
      });
    } else if (pct > 0) {
      toCreate.push({
        content: `📊 You're ${pct}% into your ${goal.targetHours}h goal — ${actualHours.toFixed(1)}h logged so far.`,
      });
    }

    if (daysLeft <= 3 && daysLeft > 0 && pct < 100) {
      toCreate.push({
        content: `⚠️ Only ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to reach your ${goal.targetHours}h goal — ${hoursLeft}h still needed.`,
      });
    }
  }

  if (!toCreate.length) {
    return res.json({ data: { created: 0, message: 'No session or goal data found to generate notifications.' } });
  }

  const docs = toCreate.map(n => ({
    userId,
    type:    n.type ?? NOTIFICATION_TYPES.GENERAL,
    content: n.content,
    isRead:  false,
  }));

  await Notification.insertMany(docs);
  res.json({ data: { created: docs.length } });
});

// ── Exported helper: create a single notification from other controllers ──────
const createNotification = async (userId, content, type = NOTIFICATION_TYPES.GENERAL) => {
  await Notification.create({ userId, type, content });
};

module.exports = { getNotifications, markAsRead, markAllRead, generateNotifications, createNotification };
