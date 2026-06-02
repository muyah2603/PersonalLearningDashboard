const User          = require('../models/User');
const StudySession  = require('../models/StudySession');
const Notification  = require('../models/Notification');
const { sendMail }  = require('../config/email.service');
const pLimit        = require('p-limit'); // npm i p-limit@3

const INACTIVITY_MS      = parseInt(process.env.INACTIVITY_MINUTES  || '3',  10) * 60_000;
const SCHEDULER_INTERVAL = parseInt(process.env.SCHEDULER_INTERVAL_SECONDS || '60', 10) * 1_000;
const REMINDER_MS        = parseInt(process.env.REMINDER_INTERVAL_MINUTES || '5', 10) * 60_000;

async function runScheduler() {
  try {
    const candidates = await StudySession.aggregate([
      { $sort:  { updatedAt: -1 } },
      { $group: { _id: '$userId', lastActivity: { $first: '$updatedAt' } } },
      { $match: { lastActivity: { $lt: new Date(Date.now() - INACTIVITY_MS) } } },
    ]);

    if (!candidates.length) return;

    const userIds = candidates.map(c => c._id);
    const recentNotifs = await Notification.find({
      userId:    { $in: userIds },
      type:      'INACTIVITY',
      createdAt: { $gte: new Date(Date.now() - REMINDER_MS) },
    }).lean();

    const notifiedSet = new Set(recentNotifs.map(n => n.userId.toString()));
    const toNotify    = candidates.filter(c => !notifiedSet.has(c._id.toString()));

    if (!toNotify.length) return;

    const users   = await User.find({ _id: { $in: toNotify.map(c => c._id) } }).lean();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const limit = pLimit(5);
    await Promise.all(
      toNotify.map(c => limit(async () => {
        const user = userMap[c._id.toString()];
        if (!user) return;

        const diffMin = Math.floor((Date.now() - c.lastActivity) / 60_000);
        const label   = diffMin >= 1440
          ? `${Math.floor(diffMin / 1440)} day(s)`
          : diffMin >= 60
            ? `${Math.floor(diffMin / 60)} hour(s)`
            : `${diffMin} minute(s)`;

        await Notification.create({
          userId:  user._id,
          type:    'INACTIVITY',
          content: `You have not studied for ${label}. Keep up your learning habit!`,
        });

        try {
          await sendMail({
            to:      user.email,
            subject: `Learning Tracker — No activity for ${label}`,
            html:    buildEmailHtml(user, label),
          });
        } catch (emailErr) {
          console.error(`[Scheduler] Email failed (${user.email}):`, emailErr.message);
        }
      }))
    );
  } catch (err) {
    console.error('[Scheduler] Error:', err.message);
  }
}

function buildEmailHtml(user, label) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;padding:40px 20px;background:#f3f4f6;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
        <div style="background:#0059BB;padding:28px 32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">You haven't studied for ${label}!</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="color:#374151;">Hi <strong>${user.name || 'there'}</strong>,<br>
          Keep your learning habit alive — even just 15 minutes a day makes a difference!</p>
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

module.exports = function startScheduler() {
  runScheduler(); // chạy ngay lần đầu
  setInterval(runScheduler, SCHEDULER_INTERVAL);
};