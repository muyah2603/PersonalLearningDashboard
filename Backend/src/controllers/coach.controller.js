// ============================================================
// AI Study Coach - Core Logic
// ============================================================

// ---- Rule Config (easy to extend, no hardcoding) ----
const THRESHOLDS = {
  focusLow: 2.5,
  focusHigh: 4.0,
  studyTimeHeavy: 10,      // hours/week
  studyTimeLight: 5,
  consistencyMin: 4,        // days/week
  goalProgressWarn: 0.7,    // 70%
  weeklyGoalDefault: 15,    // hours
};

const HOUR_RANGES = {
  morning:   { start: 5,  end: 11, label: "morning" },
  afternoon: { start: 11, end: 17, label: "afternoon" },
  evening:   { start: 17, end: 21, label: "evening" },
  night:     { start: 21, end: 24, label: "late night" },
};

// ---- Helpers ----
function getPeakHourRange(studyByHour) {
  let peak = null;
  let max = 0;
  for (const [h, t] of Object.entries(studyByHour)) {
    if (t > max) { max = t; peak = parseInt(h); }
  }
  if (peak === null) return null;
  for (const [key, range] of Object.entries(HOUR_RANGES)) {
    if (peak >= range.start && peak < range.end) return { key, ...range };
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

// ---- Score Calculation ----
function calcScore({ totalStudyTime, avgFocus, studyByDay, weeklyGoal }) {
  const goal = weeklyGoal || THRESHOLDS.weeklyGoalDefault;
  const activeDays = calcConsistency(studyByDay);

  const timeScore     = Math.min((totalStudyTime / goal) * 40, 40);
  const focusScore    = Math.min((avgFocus / 5) * 35, 35);
  const consistScore  = Math.min((activeDays / 7) * 25, 25);

  const value = Math.round(timeScore + focusScore + consistScore);

  let level;
  if (value >= 80)      level = "Excellent";
  else if (value >= 60) level = "Good";
  else if (value >= 40) level = "Average";
  else                  level = "Poor";

  return { value, level };
}

// ---- Insight Generator ----
function generateInsights({ totalStudyTime, avgFocus, sessionsPerDay, streakDays, studyByHour, studyByDay, weeklyGoal }) {
  const insights = [];
  const goal = weeklyGoal || THRESHOLDS.weeklyGoalDefault;
  const activeDays = calcConsistency(studyByDay);
  const peakRange = getPeakHourRange(studyByHour);
  const progress = totalStudyTime / goal;

  // Focus
  if (avgFocus < THRESHOLDS.focusLow) {
    insights.push(`Your focus level is currently low (${avgFocus.toFixed(1)}/5): you should improve study quality.`);
  } else if (avgFocus >= THRESHOLDS.focusHigh) {
    insights.push(`Excellent focus (${avgFocus.toFixed(1)}/5): you are studying very effectively.`);
  } else {
    insights.push(`Your focus level is average (${avgFocus.toFixed(1)}/5): there is still room for improvement.`);
  }

  // Study intensity
  if (totalStudyTime > THRESHOLDS.studyTimeHeavy) {
    insights.push(`You studied ${totalStudyTime.toFixed(1)} hours this week: high intensity, remember to balance with rest.`);
  } else if (totalStudyTime < THRESHOLDS.studyTimeLight) {
    insights.push(`Your study time this week is quite low (${totalStudyTime.toFixed(1)} hours): you should increase it.`);
  } else {
    insights.push(`You studied ${totalStudyTime.toFixed(1)} hours this week: a moderate amount.`);
  }

  // Main study time range
  if (peakRange) {
    insights.push(`You study most effectively during the ${peakRange.label}: prioritize difficult subjects during this time.`);
  }

  // Streak
  if (streakDays >= 7) {
    insights.push(`Excellent! You are on a ${streakDays}-day streak - keep it up!`);
  } else if (streakDays >= 3) {
    insights.push(`You currently have a ${streakDays}-day streak: try not to break the chain.`);
  } else {
    insights.push(`Your streak is only ${streakDays} days - consistency may be affected.`);
  }

  // Consistency
  if (activeDays <= 3) {
    insights.push(`You only studied ${activeDays}/7 days this week - try to study more consistently.`);
  }

  // Goal progress
  if (progress < THRESHOLDS.goalProgressWarn) {
    insights.push(`Your weekly goal progress is ${Math.round(progress * 100)}% - you are still ${(goal - totalStudyTime).toFixed(1)} hours away from the target.`);
  } else if (progress >= 1) {
    insights.push(`Congratulations! You completed ${Math.round(progress * 100)}% of your weekly goal.`);
  }

  return insights;
}

// ---- Suggestion Generator (multi-condition) ----
function generateSuggestions({ totalStudyTime, avgFocus, sessionsPerDay, streakDays, studyByHour, studyByDay, weeklyGoal }) {
  const suggestions = [];
  const goal = weeklyGoal || THRESHOLDS.weeklyGoalDefault;
  const activeDays = calcConsistency(studyByDay);
  const peakRange = getPeakHourRange(studyByHour);
  const progress = totalStudyTime / goal;

  const morningTime = getTotalByRange(studyByHour, 5, 11);
  const eveningTime = getTotalByRange(studyByHour, 17, 24);
  const isEveningDominated = eveningTime > morningTime * 2;
  const isMorningDominated = morningTime > eveningTime * 2;

  // Low focus + heavy study → split sessions
  if (avgFocus < THRESHOLDS.focusLow && totalStudyTime > THRESHOLDS.studyTimeHeavy) {
    suggestions.push("Break study sessions into 25-30 minute Pomodoro blocks to improve focus - avoid studying continuously for more than 1 hour.");
  }

  // Low focus + evening dominant → try mornings
  if (avgFocus < THRESHOLDS.focusLow && isEveningDominated) {
    suggestions.push("Try moving 1–2 study sessions to the early morning - the brain usually focuses better after enough sleep.");
  }

  // Low focus + too many sessions → reduce sessions
  if (avgFocus < THRESHOLDS.focusLow && sessionsPerDay > 3) {
    suggestions.push(`You are studying ${sessionsPerDay.toFixed(1)} sessions/day but your focus is low, try reducing it to 2–3 higher quality sessions.`);
  }

  // Goal not reached + few study days
  if (progress < THRESHOLDS.goalProgressWarn && activeDays <= 4) {
    suggestions.push(`Add ${Math.ceil(7 - activeDays)} more study days this week - just 1 extra hour per day can help you reach your goal.`);
  }

  // Goal not reached + low study time
  if (progress < THRESHOLDS.goalProgressWarn && totalStudyTime < THRESHOLDS.studyTimeLight) {
    const needed = (goal - totalStudyTime).toFixed(1);
    suggestions.push(`You need ${needed} more hours to complete your weekly goal - create a specific study schedule today.`);
  }

  // Heavy study + low streak → burnout sign
  if (totalStudyTime > THRESHOLDS.studyTimeHeavy && streakDays <= 3) {
    suggestions.push("You study a lot but your streak keeps breaking: try studying less each day but more consistently to avoid burnout.");
  }

  // High focus but low study time → leverage flow
  if (avgFocus >= THRESHOLDS.focusHigh && totalStudyTime < THRESHOLDS.studyTimeLight) {
    suggestions.push("Your focus level is excellent: take advantage of it by extending each study session by 30–45 minutes.");
  }

  // Morning dominated + good focus → reinforce
  if (isMorningDominated && avgFocus >= 3.5) {
    suggestions.push("Morning is your best study time: prioritize difficult and high-thinking tasks during this period.");
  }

  // Good streak → expand
  if (streakDays >= 7 && progress >= 0.9) {
    suggestions.push("You are doing great! Try increasing next week's goal by 10-15% to continue improving.");
  }

  // Ensure at least 2 suggestions
  if (suggestions.length < 2) {
    suggestions.push("Maintain a fixed daily study schedule: consistency is more important than intensity.");
    if (suggestions.length < 2) {
      suggestions.push("After each session, spend 5 minutes reviewing what you learned to strengthen long-term memory.");
    }
  }

  return suggestions;
}

// ---- Main Coach Function ----
function runCoach(data) {
  const insights    = generateInsights(data);
  const suggestions = generateSuggestions(data);
  const score       = calcScore(data);
  return { insights, suggestions, score };
}

module.exports = { runCoach, calcScore, generateInsights, generateSuggestions };