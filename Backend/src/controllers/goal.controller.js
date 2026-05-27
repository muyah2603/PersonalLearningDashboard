const Goal         = require('../models/Goal');
const StudySession = require('../models/StudySession');
const Notification = require('../models/Notification');
const { sendMail } = require('../config/email.service');
const asyncHandler = require('../utils/asyncHandler');
const { findOwned, deleteOwned } = require('../utils/ownership');
const { NOTIFICATION_TYPES }     = require('../models/Notification');

// ── GET /api/goals ────────────────────────────────────────────────────────────
const getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id }).sort({ startDate: -1 }).lean();
  res.json({ data: goals });
});

// ── GET /api/goals/progress ───────────────────────────────────────────────────
// Fix DB-1: 2 query + in-memory partition thay vì N+1
const getGoalProgress = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id }).sort({ startDate: -1 }).lean();
  if (!goals.length) return res.json({ data: [] });

  const minDate = new Date(Math.min(...goals.map(g => +g.startDate)));
  const maxDate = new Date(Math.max(...goals.map(g => +g.endDate)));

  const sessions = await StudySession.find({
    userId:    req.user._id,
    startTime: { $gte: minDate, $lte: maxDate },
  }).lean();

  const now = new Date();

  const data = goals.map(goal => {
    const inWindow = sessions.filter(
      s => s.startTime >= goal.startDate && s.startTime <= goal.endDate
    );

    const totalSecs    = inWindow.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
    const actualHours  = parseFloat((totalSecs / 3600).toFixed(2));
    const completionPercent = Math.min(100, Math.round((actualHours / goal.targetHours) * 100));

    const totalDays    = Math.max(1, Math.ceil((goal.endDate - goal.startDate) / 86400000));
    const elapsedDays  = Math.max(0, Math.ceil((now - goal.startDate) / 86400000));
    const daysRemaining = Math.max(0, totalDays - elapsedDays);

    return {
      id: goal._id,
      targetHours: goal.targetHours,
      startDate:   goal.startDate,
      endDate:     goal.endDate,
      actualHours,
      completionPercent,
      totalDays,
      daysRemaining,
      sessionCount: inWindow.length,
      createdAt:   goal.createdAt,
    };
  });

  res.json({ data });
});

// ── POST /api/goals/check-warning ─────────────────────────────────────────────
// Fix API-3: GET → POST (side effect: tạo Notification + gửi email)
// Fix DB-2: dùng typed `type` field thay vì regex scan
const checkInactivityWarning = asyncHandler(async (req, res) => {
  const lastSession = await StudySession.findOne({ userId: req.user._id })
    .sort({ updatedAt: -1 })
    .lean();

  if (!lastSession)
    return res.json({ data: { warning: true, message: 'No study sessions recorded yet. Start studying now!' } });

  const now         = new Date();
  const diffMinutes = Math.floor((now - new Date(lastSession.updatedAt)) / 60000);
  const threshold   = parseInt(process.env.INACTIVITY_MINUTES || '3', 10);

  if (diffMinutes < threshold)
    return res.json({ data: { warning: false, minutesSinceLastSession: diffMinutes } });

  // Kiểm tra đã gửi notification hôm nay chưa — dùng type thay vì regex
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const existing = await Notification.findOne({
    userId:    req.user._id,
    type:      NOTIFICATION_TYPES.INACTIVITY,
    createdAt: { $gte: today },
  }).lean();

  if (!existing) {
    const label = diffMinutes >= 1440
      ? `${Math.floor(diffMinutes / 1440)} day(s)`
      : diffMinutes >= 60
        ? `${Math.floor(diffMinutes / 60)} hour(s)`
        : `${diffMinutes} minute(s)`;

    await Notification.create({
      userId:  req.user._id,
      type:    NOTIFICATION_TYPES.INACTIVITY,
      content: `No study sessions recorded for ${label}. Stay on track with your goals!`,
    });

    try {
      await sendMail({
        to:      req.user.email,
        subject: `Learning Tracker — No activity for ${label}`,
        html:    buildInactivityEmail(req.user.name, label),
      });
    } catch (emailErr) {
      console.error('[Email] Inactivity warning failed:', emailErr.message);
    }
  }

  res.json({ data: { warning: true, minutesSinceLastSession: diffMinutes } });
});

// ── POST /api/goals ───────────────────────────────────────────────────────────
const createGoal = asyncHandler(async (req, res) => {
  const { targetHours, startDate, endDate } = req.body;

  if (!targetHours || !startDate || !endDate)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Missing required fields' } });

  if (isNaN(Number(targetHours)) || Number(targetHours) <= 0)
    return res.status(400).json({ error: { code: 'INVALID_VALUE', message: 'targetHours must be a positive number' } });

  if (new Date(endDate) <= new Date(startDate))
    return res.status(400).json({ error: { code: 'INVALID_DATE_RANGE', message: 'End date must be after start date' } });

  const goal = await Goal.create({ userId: req.user._id, targetHours, startDate, endDate });
  res.status(201).json({ data: goal });
});

// ── PUT /api/goals/:id ────────────────────────────────────────────────────────
const updateGoal = asyncHandler(async (req, res) => {
  const goal = await findOwned(Goal, req.params.id, req.user._id);
  if (!goal)
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Goal not found' } });

  const { targetHours, startDate, endDate } = req.body;

  const newStart = startDate  !== undefined ? new Date(startDate) : goal.startDate;
  const newEnd   = endDate    !== undefined ? new Date(endDate)   : goal.endDate;

  if (newEnd <= newStart)
    return res.status(400).json({ error: { code: 'INVALID_DATE_RANGE', message: 'End date must be after start date' } });

  if (targetHours !== undefined) goal.targetHours = targetHours;
  if (startDate   !== undefined) goal.startDate   = newStart;
  if (endDate     !== undefined) goal.endDate     = newEnd;

  const updated = await goal.save();
  res.json({ data: updated });
});

// ── DELETE /api/goals/:id ─────────────────────────────────────────────────────
const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await deleteOwned(Goal, req.params.id, req.user._id);
  if (!goal)
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Goal not found' } });

  res.json({ data: { message: 'Goal deleted successfully', id: req.params.id } });
});

// ── Email template ────────────────────────────────────────────────────────────
function buildInactivityEmail(name, label) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;padding:40px 20px;background:#f3f4f6;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
        <div style="background:#0059BB;padding:28px 32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">You haven't studied for ${label}!</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="color:#374151;">Hi <strong>${name || 'Student'}</strong>,<br>
          Consistency is key — even 15 minutes a day makes a difference.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${clientUrl}/sessions/new"
               style="background:#0059BB;color:#fff;padding:12px 32px;border-radius:8px;
                      text-decoration:none;font-size:15px;font-weight:600;">
              Start Studying Now
            </a>
          </div>
        </div>
      </div>
    </div>`;
}

module.exports = { getGoals, getGoalProgress, checkInactivityWarning, createGoal, updateGoal, deleteGoal };