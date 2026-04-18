const Goal = require('../models/Goal');
const StudySession = require('../models/StudySession');
const Notification = require('../models/Notification');
const { sendMail } = require('../config/email.service');

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
    return res.json({ warning: true, message: 'You have no study sessions recorded yet. Start studying now!' });
  }

  const now = new Date();
  const diffMinutes = Math.floor((now - new Date(lastSession.startTime)) / (1000 * 60));

  // Demo: 3 phút không học → cảnh báo (production thì đổi lại 3 ngày = 4320 phút)
  if (diffMinutes >= 3) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Notification.findOne({
      userId: req.user._id,
      content: { $regex: /consecutive/i },
      createdAt: { $gte: today },
    });

    if (!existing) {
      const label = diffMinutes >= 1440 
        ? `${Math.floor(diffMinutes / 1440)} day(s)` 
        : diffMinutes >= 60 
          ? `${Math.floor(diffMinutes / 60)} hour(s)` 
          : `${diffMinutes} minute(s)`;

      await Notification.create({
        userId: req.user._id,
        content: `Warning: No study sessions recorded for ${label} consecutive. Stay on track with your goals!`,
      });

      // Gửi email cảnh báo
      try {
        const userName = req.user.name || 'Student';
        const userEmail = req.user.email;

        await sendMail({
          to: userEmail,
          subject: `⚠️ Learning Tracker — No activity for ${label}!`,
          html: `
          <div style="background:#f3f4f6;padding:40px 20px;font-family:'Segoe UI',Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <div style="background:linear-gradient(135deg,#0059BB,#31A2FF);padding:28px 32px;text-align:center;">
                <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 12px;line-height:56px;font-size:28px;">📘</div>
                <h1 style="margin:0;color:#ffffff;font-size:22px;">You haven't studied for ${label}!</h1>
              </div>
              <div style="padding:28px 32px;">
                <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
                  Hi <strong>${userName}</strong>,<br>
                  We noticed that you <strong>haven't recorded any study sessions for ${label} in a row</strong>.
                </p>
                <div style="background:#EBF4FF;border:1px solid #BDD6F2;border-radius:10px;padding:16px;margin-bottom:20px;">
                  <p style="margin:0;color:#1E40AF;font-size:14px;line-height:1.5;">
                    💡 <strong>Tip:</strong> Consistency is key! Even 15–30 minutes a day can make a big difference in your learning progress.
                  </p>
                </div>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/sessions/new" style="display:inline-block;background:#0059BB;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                    Start Studying Now
                  </a>
                </div>
              </div>
              <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
                <p style="margin:0;color:#9ca3af;font-size:12px;">Automated email from Learning Tracker — please do not reply</p>
              </div>
            </div>
          </div>`,
        });
      } catch (emailErr) {
        console.error('[Email] Failed to send inactivity warning:', emailErr.message);
      }
    }

    return res.json({ warning: true, minutesSinceLastSession: diffMinutes, message: `No study sessions for ${diffMinutes} minutes. Keep up your momentum!` });
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
