// Backend/src/controllers/coach.controller.js
const StudySession = require('../models/StudySession');
const Goal         = require('../models/Goal');
const asyncHandler = require('../utils/asyncHandler');

// ── Thresholds ────────────────────────────────────────────────────────────────
const THRESHOLDS = {
  focusLow:          2.5,
  focusHigh:         4.0,
  studyTimeHeavy:    10,
  studyTimeLight:    5,
  goalProgressWarn:  0.7,
  weeklyGoalDefault: 15,
};

const HOUR_RANGES = {
  morning:   { start: 5,  end: 11, label: 'morning' },
  afternoon: { start: 11, end: 17, label: 'afternoon' },
  evening:   { start: 17, end: 21, label: 'evening' },
  night:     { start: 21, end: 24, label: 'late night' },
};

function getPeakHourRange(studyByHour) {
  let peak = null, max = 0;
  for (const [h, t] of Object.entries(studyByHour)) {
    if (t > max) { max = t; peak = parseInt(h); }
  }
  if (peak === null) return null;
  for (const [, range] of Object.entries(HOUR_RANGES)) {
    if (peak >= range.start && peak < range.end) return range;
  }
  return null;
}

function getTotalByRange(studyByHour, start, end) {
  return Object.entries(studyByHour)
    .filter(([h]) => parseInt(h) >= start && parseInt(h) < end)
    .reduce((sum, [, t]) => sum + t, 0);
}

function calcConsistency(studyByDay) {
  return Object.values(studyByDay).filter(t => t > 0).length;
}

function calcScore({ totalStudyTime, avgFocus, studyByDay, weeklyGoal }) {
  const goal       = weeklyGoal || THRESHOLDS.weeklyGoalDefault;
  const activeDays = calcConsistency(studyByDay);
  const value      = Math.round(
    Math.min((totalStudyTime / goal) * 40, 40) +
    Math.min((avgFocus / 5) * 35, 35) +
    Math.min((activeDays / 7) * 25, 25)
  );
  const level = value >= 80 ? 'Excellent' : value >= 60 ? 'Good' : value >= 40 ? 'Average' : 'Poor';
  return { value, level };
}

function generateInsights({ totalStudyTime, avgFocus, streakDays, studyByHour, studyByDay, weeklyGoal }) {
  const insights   = [];
  const goal       = weeklyGoal || THRESHOLDS.weeklyGoalDefault;
  const activeDays = calcConsistency(studyByDay);
  const peakRange  = getPeakHourRange(studyByHour);
  const progress   = totalStudyTime / goal;

  if (avgFocus < THRESHOLDS.focusLow)
    insights.push(`Your focus level is low (${avgFocus.toFixed(1)}/5): try to improve study quality.`);
  else if (avgFocus >= THRESHOLDS.focusHigh)
    insights.push(`Excellent focus (${avgFocus.toFixed(1)}/5): you are studying very effectively.`);
  else
    insights.push(`Your focus level is average (${avgFocus.toFixed(1)}/5): there is room for improvement.`);

  if (totalStudyTime > THRESHOLDS.studyTimeHeavy)
    insights.push(`You studied ${totalStudyTime.toFixed(1)} hours this week: high intensity, remember to rest.`);
  else if (totalStudyTime < THRESHOLDS.studyTimeLight)
    insights.push(`Study time is low (${totalStudyTime.toFixed(1)} hours): try to increase it.`);
  else
    insights.push(`You studied ${totalStudyTime.toFixed(1)} hours this week: a moderate amount.`);

  if (peakRange)
    insights.push(`You study most during the ${peakRange.label}: prioritize difficult subjects then.`);

  if (streakDays >= 7)
    insights.push(`You are on a ${streakDays}-day streak - keep it up!`);
  else if (streakDays >= 3)
    insights.push(`You have a ${streakDays}-day streak: try not to break the chain.`);
  else
    insights.push(`Your streak is only ${streakDays} days - try to be more consistent.`);

  if (activeDays <= 3)
    insights.push(`You only studied ${activeDays}/7 days this week - aim for more days.`);

  if (progress < THRESHOLDS.goalProgressWarn)
    insights.push(`Goal progress: ${Math.round(progress * 100)}% - ${(goal - totalStudyTime).toFixed(1)} hours remaining.`);
  else if (progress >= 1)
    insights.push(`You completed ${Math.round(progress * 100)}% of your weekly goal. Well done!`);

  return insights;
}

function generateSuggestions({ totalStudyTime, avgFocus, sessionsPerDay, streakDays, studyByHour, studyByDay, weeklyGoal }) {
  const suggestions      = [];
  const goal             = weeklyGoal || THRESHOLDS.weeklyGoalDefault;
  const activeDays       = calcConsistency(studyByDay);
  const progress         = totalStudyTime / goal;
  const morningTime      = getTotalByRange(studyByHour, 5, 11);
  const eveningTime      = getTotalByRange(studyByHour, 17, 24);
  const isEveningDom     = eveningTime > morningTime * 2;
  const isMorningDom     = morningTime > eveningTime * 2;

  if (avgFocus < THRESHOLDS.focusLow && totalStudyTime > THRESHOLDS.studyTimeHeavy)
    suggestions.push('Break sessions into 25-30 minute Pomodoro blocks to improve focus.');

  if (avgFocus < THRESHOLDS.focusLow && isEveningDom)
    suggestions.push('Try moving 1-2 sessions to the morning - the brain focuses better after sleep.');

  if (avgFocus < THRESHOLDS.focusLow && sessionsPerDay > 3)
    suggestions.push(`You average ${sessionsPerDay.toFixed(1)} sessions/day with low focus - try fewer, higher quality sessions.`);

  if (progress < THRESHOLDS.goalProgressWarn && activeDays <= 4)
    suggestions.push(`Add ${Math.ceil(7 - activeDays)} more study days - 1 extra hour/day can close the gap.`);

  if (progress < THRESHOLDS.goalProgressWarn && totalStudyTime < THRESHOLDS.studyTimeLight)
    suggestions.push(`You need ${(goal - totalStudyTime).toFixed(1)} more hours to reach your goal - plan a schedule today.`);

  if (totalStudyTime > THRESHOLDS.studyTimeHeavy && streakDays <= 3)
    suggestions.push('You study intensely but inconsistently - try shorter daily sessions to build a streak.');

  if (avgFocus >= THRESHOLDS.focusHigh && totalStudyTime < THRESHOLDS.studyTimeLight)
    suggestions.push('Your focus is excellent - extend each session by 30-45 minutes to maximize it.');

  if (isMorningDom && avgFocus >= 3.5)
    suggestions.push('Morning is your peak time - tackle the hardest topics then.');

  if (streakDays >= 7 && progress >= 0.9)
    suggestions.push('Great work! Consider raising your weekly goal by 10-15% next week.');

  if (suggestions.length === 0)
    suggestions.push('Maintain a fixed daily study schedule: consistency beats intensity.');
  if (suggestions.length === 1)
    suggestions.push('After each session, spend 5 minutes reviewing to strengthen long-term memory.');

  return suggestions;
}

// ── GET /api/ai/coach ─────────────────────────────────────────────────────────
const getCoachReport = asyncHandler(async (req, res) => {
  const userId  = req.user._id;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [sessions, goals, allSessions] = await Promise.all([
    StudySession.find({ userId, startTime: { $gte: weekAgo } }).lean(),
    Goal.find({ userId }).lean(),
    StudySession.find({ userId }).sort({ startTime: -1 }).lean(),
  ]);

  const totalStudyTime = sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0) / 3600;
  const avgFocus       = sessions.length
    ? sessions.reduce((sum, s) => sum + (s.focusLevel || 0), 0) / sessions.length
    : 0;
  const sessionsPerDay = sessions.length / 7;

  const dateSet = new Set(allSessions.map(s => new Date(s.startTime).toISOString().slice(0, 10)));
  let streakDays = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (dateSet.has(d.toISOString().slice(0, 10))) streakDays++;
    else if (i > 0) break;
  }

  const studyByHour = {};
  const studyByDay  = {};
  sessions.forEach(s => {
    const h    = new Date(s.startTime).getHours();
    const day  = new Date(s.startTime).toISOString().slice(0, 10);
    const mins = Math.round((s.actualDuration || 0) / 60);
    studyByHour[h]  = (studyByHour[h]  || 0) + mins;
    studyByDay[day] = (studyByDay[day] || 0) + mins;
  });

  const activeGoal = goals.find(g => g.status === 'in_progress');
  const weeklyGoal = activeGoal?.targetHours ?? null;
  const data       = { totalStudyTime, avgFocus, sessionsPerDay, streakDays, studyByHour, studyByDay, weeklyGoal };

  res.json({
    data: {
      insights:    generateInsights(data),
      suggestions: generateSuggestions(data),
      score:       calcScore(data),
    },
  });
});

module.exports = { getCoachReport };