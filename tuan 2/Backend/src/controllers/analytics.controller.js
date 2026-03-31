const StudySession = require('../models/StudySession');
const Goal = require('../models/Goal');

// Helper: tổng phút học thực tế từ danh sách sessions
const totalMinutes = (sessions) =>
  sessions.reduce((sum, s) => sum + Math.round((s.actualDuration || 0) / 60), 0);

// GET /api/analytics/summary?period=day|week|month
const getSummary = async (req, res) => {
  const { period = 'week' } = req.query;
  const now = new Date();
  let from;
  if (period === 'day') { from = new Date(now); from.setHours(0, 0, 0, 0); }
  else if (period === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1); }
  else { from = new Date(now); from.setDate(now.getDate() - now.getDay()); from.setHours(0, 0, 0, 0); }

  const sessions = await StudySession.find({ userId: req.user._id, startTime: { $gte: from } });
  const minutes = totalMinutes(sessions);
  res.json({ period, totalMinutes: minutes, totalHours: parseFloat((minutes / 60).toFixed(2)), sessionCount: sessions.length });
};

// GET /api/analytics/by-subject
const getBySubject = async (req, res) => {
  const sessions = await StudySession.find({ userId: req.user._id }).populate('subjectId', 'name');
  const map = {};
  sessions.forEach((s) => {
    const key = s.subjectId?._id?.toString() || 'unknown';
    const name = s.subjectId?.name || 'Unknown';
    const mins = Math.round((s.actualDuration || 0) / 60);
    if (!map[key]) map[key] = { subjectId: key, subjectName: name, totalMinutes: 0 };
    map[key].totalMinutes += mins;
  });
  const result = Object.values(map).map((r) => ({ ...r, totalHours: parseFloat((r.totalMinutes / 60).toFixed(2)) }));
  res.json(result);
};

// GET /api/analytics/heatmap – 7 ngày gần nhất
const getHeatmap = async (req, res) => {
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);

  const sessions = await StudySession.find({ userId: req.user._id, startTime: { $gte: from } });
  const map = {};
  sessions.forEach((s) => {
    const day = new Date(s.startTime).toISOString().slice(0, 10);
    const mins = Math.round((s.actualDuration || 0) / 60);
    map[day] = (map[day] || 0) + mins;
  });

  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, totalMinutes: map[key] || 0 });
  }
  res.json(result);
};

// GET /api/analytics/focus-score
const getFocusScore = async (req, res) => {
  const sessions = await StudySession.find({ userId: req.user._id });
  if (!sessions.length) return res.json({ focusScore: 0 });
  const totalScore = sessions.reduce((sum, s) => {
    const mins = Math.round((s.actualDuration || 0) / 60);
    return sum + s.focusLevel * mins;
  }, 0);
  const mins = totalMinutes(sessions);
  res.json({ focusScore: parseFloat((totalScore / (mins || 1)).toFixed(2)) });
};

// GET /api/analytics/goal-progress
const getGoalProgress = async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id });
  const result = [];
  for (const goal of goals) {
    const sessions = await StudySession.find({
      userId: req.user._id,
      startTime: { $gte: goal.startDate, $lte: goal.endDate },
    });
    const actualHours = parseFloat((totalMinutes(sessions) / 60).toFixed(2));
    const percent = parseFloat(((actualHours / goal.targetHours) * 100).toFixed(1));
    result.push({ goalId: goal._id, targetHours: goal.targetHours, actualHours, percent: Math.min(percent, 100), startDate: goal.startDate, endDate: goal.endDate });
  }
  res.json(result);
};

module.exports = { getSummary, getBySubject, getHeatmap, getFocusScore, getGoalProgress };
