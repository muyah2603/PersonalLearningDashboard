// ============================================================
// AI Study Coach - Core Logic
// ============================================================

// ---- Rule Config (dễ mở rộng, không hardcode) ----
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
  morning:   { start: 5,  end: 11, label: "buổi sáng" },
  afternoon: { start: 11, end: 17, label: "buổi chiều" },
  evening:   { start: 17, end: 21, label: "buổi tối" },
  night:     { start: 21, end: 24, label: "đêm khuya" },
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
    insights.push(`Mức độ tập trung của bạn đang thấp (${avgFocus.toFixed(1)}/5) — cần cải thiện chất lượng học.`);
  } else if (avgFocus >= THRESHOLDS.focusHigh) {
    insights.push(`Tập trung rất tốt (${avgFocus.toFixed(1)}/5) — bạn đang học hiệu quả cao.`);
  } else {
    insights.push(`Mức tập trung ở mức trung bình (${avgFocus.toFixed(1)}/5) — vẫn còn dư địa cải thiện.`);
  }

  // Cường độ
  if (totalStudyTime > THRESHOLDS.studyTimeHeavy) {
    insights.push(`Bạn học ${totalStudyTime.toFixed(1)} giờ tuần này — cường độ cao, hãy chú ý cân bằng nghỉ ngơi.`);
  } else if (totalStudyTime < THRESHOLDS.studyTimeLight) {
    insights.push(`Thời gian học tuần này khá ít (${totalStudyTime.toFixed(1)} giờ) — bạn nên tăng thêm.`);
  } else {
    insights.push(`Bạn học ${totalStudyTime.toFixed(1)} giờ tuần này — ở mức vừa phải.`);
  }

  // Khung giờ học chính
  if (peakRange) {
    insights.push(`Bạn học hiệu quả nhất vào ${peakRange.label} — hãy ưu tiên giờ này cho nội dung khó.`);
  }

  // Streak
  if (streakDays >= 7) {
    insights.push(`Tuyệt vời! Bạn đang có streak ${streakDays} ngày liên tiếp — duy trì nhé!`);
  } else if (streakDays >= 3) {
    insights.push(`Bạn đang có streak ${streakDays} ngày — hãy cố gắng không để đứt chuỗi.`);
  } else {
    insights.push(`Streak chỉ còn ${streakDays} ngày — tính nhất quán đang bị ảnh hưởng.`);
  }

  // Consistency
  if (activeDays <= 3) {
    insights.push(`Bạn chỉ học ${activeDays}/7 ngày trong tuần — cần học đều đặn hơn.`);
  }

  // Goal progress
  if (progress < THRESHOLDS.goalProgressWarn) {
    insights.push(`Tiến độ goal tuần đạt ${Math.round(progress * 100)}% — còn cách mục tiêu ${(goal - totalStudyTime).toFixed(1)} giờ.`);
  } else if (progress >= 1) {
    insights.push(`Chúc mừng! Bạn đã hoàn thành ${Math.round(progress * 100)}% goal tuần này.`);
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

  // Low focus + heavy study → chia nhỏ session
  if (avgFocus < THRESHOLDS.focusLow && totalStudyTime > THRESHOLDS.studyTimeHeavy) {
    suggestions.push("Chia nhỏ session học thành 25–30 phút (Pomodoro) để cải thiện tập trung — đừng học liên tục quá 1 tiếng.");
  }

  // Low focus + evening dominant → thử sáng
  if (avgFocus < THRESHOLDS.focusLow && isEveningDominated) {
    suggestions.push("Thử chuyển 1–2 session sang buổi sáng sớm — não bộ thường tập trung tốt hơn sau khi ngủ đủ giấc.");
  }

  // Low focus + session nhiều → giảm số session
  if (avgFocus < THRESHOLDS.focusLow && sessionsPerDay > 3) {
    suggestions.push(`Bạn đang học ${sessionsPerDay.toFixed(1)} session/ngày nhưng focus thấp — hãy giảm xuống 2–3 session chất lượng hơn.`);
  }

  // Goal không đạt + ít ngày học
  if (progress < THRESHOLDS.goalProgressWarn && activeDays <= 4) {
    suggestions.push(`Tăng lên ${Math.ceil(7 - activeDays)} ngày học nữa trong tuần — chỉ cần thêm 1 tiếng/ngày là đủ đạt goal.`);
  }

  // Goal không đạt + thời gian ít
  if (progress < THRESHOLDS.goalProgressWarn && totalStudyTime < THRESHOLDS.studyTimeLight) {
    const needed = (goal - totalStudyTime).toFixed(1);
    suggestions.push(`Bạn cần thêm ${needed} giờ để hoàn thành goal tuần — hãy lên lịch học cụ thể ngay hôm nay.`);
  }

  // Heavy study + low streak → dấu hiệu burnout
  if (totalStudyTime > THRESHOLDS.studyTimeHeavy && streakDays <= 3) {
    suggestions.push("Bạn học nhiều nhưng streak đứt — hãy học ít hơn mỗi ngày nhưng đều đặn hơn để tránh burnout.");
  }

  // Focus cao nhưng thời gian ít → leverage the flow
  if (avgFocus >= THRESHOLDS.focusHigh && totalStudyTime < THRESHOLDS.studyTimeLight) {
    suggestions.push("Focus của bạn rất tốt — hãy tận dụng bằng cách kéo dài thời gian học thêm 30–45 phút mỗi session.");
  }

  // Morning dominated + good focus → reinforce
  if (isMorningDominated && avgFocus >= 3.5) {
    suggestions.push("Buổi sáng là thời điểm học tốt nhất của bạn — hãy ưu tiên các nội dung khó và cần tư duy cao vào khung giờ này.");
  }

  // Streak tốt → mở rộng
  if (streakDays >= 7 && progress >= 0.9) {
    suggestions.push("Bạn đang trên đà rất tốt! Hãy thử tăng goal tuần tới thêm 10–15% để tiếp tục phát triển.");
  }

  // Đảm bảo ít nhất 2 suggestion
  if (suggestions.length < 2) {
    suggestions.push("Duy trì lịch học cố định mỗi ngày — sự nhất quán quan trọng hơn cường độ.");
    if (suggestions.length < 2) {
      suggestions.push("Sau mỗi session, dành 5 phút review lại những gì vừa học để củng cố trí nhớ dài hạn.");
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