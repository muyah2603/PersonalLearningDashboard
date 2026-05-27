const StudySession = require('../models/StudySession');
const Goal         = require('../models/Goal');
const asyncHandler = require('../utils/asyncHandler');

// ── Helper dùng chung (Fix PERF-1: một nguồn tính phút duy nhất) ─────────────
// actualDuration lưu bằng giây (FE ghi seconds vào field này)
const toMinutes = (s) => Math.round((s.actualDuration || 0) / 60);
const totalMinutes = (sessions) => sessions.reduce((sum, s) => sum + toMinutes(s), 0);

// ── Helper tính khoảng thời gian từ period ────────────────────────────────────
function periodToFrom(period) {
  const now = new Date();
  if (period === 'day') {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return from;
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  // default: week
  const from = new Date(now);
  from.setDate(now.getDate() - now.getDay());
  from.setHours(0, 0, 0, 0);
  return from;
}

// ── GET /api/analytics/summary?period=day|week|month ─────────────────────────
// Fix API-1: dùng aggregation thay vì load toàn bộ sessions vào Node
const getSummary = asyncHandler(async (req, res) => {
  const { period = 'week' } = req.query;
  const from = periodToFrom(period);

  const [agg] = await StudySession.aggregate([
    { $match: { userId: req.user._id, startTime: { $gte: from } } },
    {
      $group: {
        _id:          null,
        totalSeconds: { $sum: '$actualDuration' },
        sessionCount: { $sum: 1 },
      },
    },
  ]);

  const totalSecs    = agg?.totalSeconds || 0;
  const sessionCount = agg?.sessionCount || 0;
  const mins         = Math.round(totalSecs / 60);

  res.json({
    data: {
      period,
      totalMinutes: mins,
      totalHours:   parseFloat((mins / 60).toFixed(2)),
      sessionCount,
    },
  });
});

// ── GET /api/analytics/by-subject ─────────────────────────────────────────────
// Fix API-1: aggregation trong DB thay vì group trong JS
const getBySubject = asyncHandler(async (req, res) => {
  const rows = await StudySession.aggregate([
    { $match: { userId: req.user._id } },
    {
      $group: {
        _id:          '$subjectId',
        totalSeconds: { $sum: '$actualDuration' },
        sessionCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from:         'subjects',
        localField:   '_id',
        foreignField: '_id',
        as:           'subject',
      },
    },
    { $unwind: { path: '$subject', preserveNullAndEmpty: true } },
    { $sort: { totalSeconds: -1 } },
  ]);

  const data = rows.map((r) => {
    const mins = Math.round((r.totalSeconds || 0) / 60);
    return {
      subjectId:    r._id,
      subjectName:  r.subject?.name || 'Unknown',
      totalMinutes: mins,
      totalHours:   parseFloat((mins / 60).toFixed(2)),
      sessionCount: r.sessionCount,
    };
  });

  res.json({ data });
});

// ── GET /api/analytics/heatmap ────────────────────────────────────────────────
// Giữ nguyên logic, chỉ fix VAL-1 + API-2
const getHeatmap = asyncHandler(async (req, res) => {
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);

  const rows = await StudySession.aggregate([
    { $match: { userId: req.user._id, startTime: { $gte: from } } },
    {
      $group: {
        _id:          { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
        totalSeconds: { $sum: '$actualDuration' },
      },
    },
  ]);

  const map = Object.fromEntries(rows.map((r) => [r._id, r.totalSeconds]));

  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const mins = Math.round((map[key] || 0) / 60);
    data.push({ date: key, totalMinutes: mins });
  }

  res.json({ data });
});

// ── GET /api/analytics/focus-score ────────────────────────────────────────────
// Fix API-1: aggregation — không materialize toàn bộ sessions
const getFocusScore = asyncHandler(async (req, res) => {
  const [agg] = await StudySession.aggregate([
    { $match: { userId: req.user._id } },
    {
      $group: {
        _id:         null,
        weightedSum: { $sum: { $multiply: ['$focusLevel', '$actualDuration'] } },
        totalSecs:   { $sum: '$actualDuration' },
      },
    },
  ]);

  if (!agg || !agg.totalSecs)
    return res.json({ data: { focusScore: 0 } });

  // focusScore = rata-rata focusLevel có trọng số theo thời gian học thực tế
  const score = parseFloat((agg.weightedSum / agg.totalSecs).toFixed(2));
  res.json({ data: { focusScore: score } });
});

// ── GET /api/analytics/goal-progress ──────────────────────────────────────────
// Fix DB-1: từ N+1 query → 2 query rồi partition trong memory
const getGoalProgress = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id }).sort({ startDate: -1 }).lean();
  if (!goals.length) return res.json({ data: [] });

  // 1 query bao phủ toàn bộ khoảng thời gian của tất cả goals
  const minDate = new Date(Math.min(...goals.map((g) => +g.startDate)));
  const maxDate = new Date(Math.max(...goals.map((g) => +g.endDate)));

  const sessions = await StudySession.find({
    userId:    req.user._id,
    startTime: { $gte: minDate, $lte: maxDate },
  }).lean();

  // Partition trong memory thay vì N query
  const data = goals.map((goal) => {
    const inWindow = sessions.filter(
      (s) => s.startTime >= goal.startDate && s.startTime <= goal.endDate
    );
    // Fix PERF-1: dùng cùng đơn vị (actualDuration = giây)
    const actualHours = parseFloat(
      (inWindow.reduce((sum, s) => sum + (s.actualDuration || 0), 0) / 3600).toFixed(2)
    );
    const percent = Math.min(
      100,
      parseFloat(((actualHours / goal.targetHours) * 100).toFixed(1))
    );
    return {
      goalId:         goal._id,
      title:          goal.title,
      targetHours:    goal.targetHours,
      actualHours,
      completionPercent: percent,   // Fix FE-7: thống nhất field name với goal.controller
      startDate:      goal.startDate,
      endDate:        goal.endDate,
    };
  });

  res.json({ data });
});

module.exports = { getSummary, getBySubject, getHeatmap, getFocusScore, getGoalProgress };