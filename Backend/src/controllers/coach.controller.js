const StudySession = require('../models/StudySession');
const Goal         = require('../models/Goal');
const asyncHandler = require('../utils/asyncHandler');
const { runCoach } = require('../services/coachService'); // file core logic giữ nguyên

// GET /api/ai/coach
const getCoachReport = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [sessions, goals] = await Promise.all([
    StudySession.find({ userId, startTime: { $gte: weekAgo } }).lean(),
    Goal.find({ userId }).lean(),
  ]);

  // Tổng giờ học (Fix PERF-1: dùng actualDuration)
  const totalStudyTime = sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0) / 3600;
  const avgFocus = sessions.length
    ? sessions.reduce((sum, s) => sum + (s.focusLevel || 0), 0) / sessions.length
    : 0;

  // Sessions per day
  const sessionsPerDay = sessions.length / 7;

  // Streak (server-side, Fix PERF-2)
  const allSessions = await StudySession.find({ userId }).sort({ startTime: -1 }).lean();
  const dateSet = new Set(allSessions.map(s => new Date(s.startTime).toISOString().slice(0, 10)));
  let streakDays = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (dateSet.has(d.toISOString().slice(0, 10))) streakDays++;
    else if (i > 0) break;
  }

  // Study by hour + day
  const studyByHour = {};
  const studyByDay  = {};
  sessions.forEach(s => {
    const h   = new Date(s.startTime).getHours();
    const day = new Date(s.startTime).toISOString().slice(0, 10);
    const mins = Math.round((s.actualDuration || 0) / 60);
    studyByHour[h]  = (studyByHour[h]  || 0) + mins;
    studyByDay[day] = (studyByDay[day] || 0) + mins;
  });

  const activeGoal  = goals.find(g => g.status === 'in_progress');
  const weeklyGoal  = activeGoal?.targetHours ?? null;

  const report = runCoach({ totalStudyTime, avgFocus, sessionsPerDay, streakDays, studyByHour, studyByDay, weeklyGoal });

  res.json({ data: report });
});

module.exports = { getCoachReport };