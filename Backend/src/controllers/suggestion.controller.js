const StudySession = require('../models/StudySession');
const Goal = require('../models/Goal');
const Suggestion = require('../models/Suggestion');
const Notification = require('../models/Notification');

// Rule-based logic
const generateSuggestions = async (req, res) => {
  const userId = req.user._id;
  const now = new Date();

  // Lấy sessions trong 7 ngày gần nhất
  const from7d = new Date(now); from7d.setDate(now.getDate() - 6); from7d.setHours(0, 0, 0, 0);
  const sessions7d = await StudySession.find({ userId, startTime: { $gte: from7d } });

  const suggestions = [];

  if (sessions7d.length > 0) {
    const totalMins = sessions7d.reduce((sum, s) =>
      sum + Math.round((new Date(s.endTime) - new Date(s.startTime)) / 60000), 0);
    const avgFocus = sessions7d.reduce((sum, s) => sum + s.focusLevel, 0) / sessions7d.length;
    const avgDuration = totalMins / sessions7d.length;

    // Rule 1: Study time cao nhưng focus thấp
    if (avgDuration > 90 && avgFocus < 2.5) {
      suggestions.push('Thời gian học của bạn khá dài nhưng điểm tập trung thấp. Hãy thử chia thành các phiên ngắn 25–45 phút (kỹ thuật Pomodoro) để cải thiện hiệu quả.');
    }

    // Rule 2: Weekly progress dưới 50% mục tiêu
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);
    const activeGoal = await Goal.findOne({ userId, startDate: { $lte: weekEnd }, endDate: { $gte: weekStart } });

    if (activeGoal) {
      const weekSessions = sessions7d.filter(s => new Date(s.startTime) >= weekStart);
      const weekHours = weekSessions.reduce((sum, s) =>
        sum + Math.round((new Date(s.endTime) - new Date(s.startTime)) / 60000), 0) / 60;
      const progress = weekHours / activeGoal.targetHours;
      if (progress < 0.5) {
        const remaining = parseFloat((activeGoal.targetHours - weekHours).toFixed(1));
        suggestions.push(`Bạn mới đạt ${Math.round(progress * 100)}% mục tiêu tuần này. Cần học thêm khoảng ${remaining} giờ để đạt mục tiêu.`);
      }
    }
  }

  // Rule 3: Không có session trong 3 ngày liên tiếp → tạo notification
  const from3d = new Date(now); from3d.setDate(now.getDate() - 2); from3d.setHours(0, 0, 0, 0);
  const recentSessions = await StudySession.countDocuments({ userId, startTime: { $gte: from3d } });
  if (recentSessions === 0) {
    await Notification.create({
      userId,
      content: 'Bạn chưa ghi nhận phiên học nào trong 3 ngày qua. Hãy duy trì thói quen học tập đều đặn!',
    });
  }

  // Lưu suggestions
  const created = await Promise.all(
    suggestions.map((content) => Suggestion.create({ userId, content }))
  );

  res.json({ generated: created.length, suggestions: created });
};

const getSuggestions = async (req, res) => {
  const suggestions = await Suggestion.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20);
  res.json(suggestions);
};

module.exports = { generateSuggestions, getSuggestions };
