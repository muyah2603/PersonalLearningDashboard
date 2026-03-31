const Goal = require('../models/Goal');
const StudySession = require('../models/StudySession');

const getGoals = async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id }).sort({ startDate: -1 });
  res.json(goals);
};

const getGoalProgress = async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id }).sort({ startDate: -1 });

  const results = [];
  for (const goal of goals) {
    const sessions = await StudySession.find({
      userId: req.user._id,
      startTime: { $gte: goal.startDate, $lte: goal.endDate },
    });

    const totalActualSeconds = sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
    const actualHours = +(totalActualSeconds / 3600).toFixed(2);
    const completionPercent = Math.min(100, Math.round((actualHours / goal.targetHours) * 100));

    const now = new Date();
    const totalDays = Math.max(1, Math.ceil((goal.endDate - goal.startDate) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.max(0, Math.ceil((now - goal.startDate) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, totalDays - elapsedDays);

    results.push({
      _id: goal._id,
      targetHours: goal.targetHours,
      startDate: goal.startDate,
      endDate: goal.endDate,
      actualHours,
      completionPercent,
      totalDays,
      daysRemaining,
      sessionCount: sessions.length,
      createdAt: goal.createdAt,
    });
  }

  res.json(results);
};

const checkInactivityWarning = async (req, res) => {
  const lastSession = await StudySession.findOne({ userId: req.user._id })
    .sort({ startTime: -1 });

  if (!lastSession) {
    return res.json({ warning: true, message: 'No study sessions recorded yet. Start studying now!' });
  }

  const now = new Date();
  const diffMinutes = Math.floor((now - new Date(lastSession.startTime)) / (1000 * 60));

  if (diffMinutes >= 3) {
    const label = diffMinutes >= 1440
      ? `${Math.floor(diffMinutes / 1440)} ngày`
      : `${diffMinutes} phút`;

    return res.json({
      warning: true,
      minutesSinceLastSession: diffMinutes,
      message: `No study sessions for ${label}. Keep up your momentum!`
    });
  }

  res.json({ warning: false, minutesSinceLastSession: diffMinutes });
};

const createGoal = async (req, res) => {
  const { targetHours, startDate, endDate } = req.body;
  if (!targetHours || !startDate || !endDate)
    return res.status(400).json({ message: 'Missing required fields' });

  if (new Date(endDate) <= new Date(startDate))
    return res.status(400).json({ message: 'End date must be after start date' });

  const goal = await Goal.create({ userId: req.user._id, targetHours, startDate, endDate });
  res.status(201).json(goal);
};

const updateGoal = async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!goal) return res.status(404).json({ message: 'Goal not found' });

  const { targetHours, startDate, endDate } = req.body;
  if (targetHours !== undefined) goal.targetHours = targetHours;
  if (startDate !== undefined) goal.startDate = startDate;
  if (endDate !== undefined) goal.endDate = endDate;

  const updated = await goal.save();
  res.json(updated);
};

const deleteGoal = async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!goal) return res.status(404).json({ message: 'Goal not found' });
  res.json({ message: 'Goal deleted successfully' });
};

module.exports = { getGoals, getGoalProgress, checkInactivityWarning, createGoal, updateGoal, deleteGoal };