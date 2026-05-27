const User          = require('../models/User');
const StudySession  = require('../models/StudySession');
const Notification  = require('../models/Notification');
const { sendMail }  = require('../config/email.service');
const pLimit        = require('p-limit'); // npm i p-limit@3

const INACTIVITY_MS      = parseInt(process.env.INACTIVITY_MINUTES  || '3',  10) * 60_000;
const SCHEDULER_INTERVAL = parseInt(process.env.SCHEDULER_INTERVAL_SECONDS || '60', 10) * 1_000;
const REMINDER_MS        = parseInt(process.env.REMINDER_INTERVAL_MINUTES || '5', 10) * 60_000;

async function runScheduler() {
  const now = new Date();
  console.log(`\n[Scheduler] ${now.toLocaleTimeString('vi-VN')} — running...`);

  try {
    // FIX DB-2: 1 aggregation thay vì N+1 query
    const candidates = await StudySession.aggregate([
      { $sort:  { updatedAt: -1 } },
      { $group: { _id: '$userId', lastActivity: { $first: '$updatedAt' } } },
      { $match: { lastActivity: { $lt: new Date(Date.now() - INACTIVITY_MS) } } },
    ]);

    if (!candidates.length) {
      console.log('[Scheduler] Không có user nào cần nhắc.');
      return;
    }

    // FIX DB-2: dùng typed `type` field thay vì regex scan trên content
    const userIds = candidates.map(c => c._id);
    const recentNotifs = await Notification.find({
      userId:    { $in: userIds },
      type:      'INACTIVITY',                          // field mới, thêm vào schema
      createdAt: { $gte: new Date(Date.now() - REMINDER_MS) },
    }).lean();

    const notifiedSet = new Set(recentNotifs.map(n => n.userId.toString()));

    const toNotify = candidates.filter(c => !notifiedSet.has(c._id.toString()));

    if (!toNotify.length) {
      console.log('[Scheduler] Tất cả đã được nhắc gần đây.');
      return;
    }

    const users = await User.find({ _id: { $in: toNotify.map(c => c._id) } }).lean();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    // FIX DB-2: giới hạn concurrency, không gửi SMTP tuần tự
    const limit = pLimit(5);
    await Promise.all(
      toNotify.map(c => limit(async () => {
        const user    = userMap[c._id.toString()];
        if (!user) return;

        const diffMin = Math.floor((Date.now() - c.lastActivity) / 60_000);
        const label   = diffMin >= 1440 ? `${Math.floor(diffMin / 1440)} ngày` : `${diffMin} phút`;

        await Notification.create({
          userId:  user._id,
          type:    'INACTIVITY',        // typed field — không cần regex nữa
          content: `Bạn chưa học trong ${label}. Hãy duy trì thói quen!`,
        });

        try {
          await sendMail({
            to:      user.email,
            subject: `Learning Tracker — Không hoạt động ${label}`,
            html:    buildEmailHtml(user, label),
          });
          console.log(`  [Scheduler] Email → ${user.email}`);
        } catch (emailErr) {
          console.error(`  [Scheduler] Email thất bại (${user.email}):`, emailErr.message);
        }
      }))
    );
  } catch (err) {
    console.error('[Scheduler] Lỗi:', err.message);
  }
}

function buildEmailHtml(user, label) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;padding:40px 20px;background:#f3f4f6;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
        <div style="background:#0059BB;padding:28px 32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Bạn chưa học trong ${label}!</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="color:#374151;">Xin chào <strong>${user.name || 'bạn'}</strong>,<br>
          Hãy duy trì thói quen học tập — dù chỉ 15 phút mỗi ngày!</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${clientUrl}/sessions/new"
               style="background:#0059BB;color:#fff;padding:12px 32px;border-radius:8px;
                      text-decoration:none;font-size:15px;font-weight:600;">
              Bắt đầu học ngay
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