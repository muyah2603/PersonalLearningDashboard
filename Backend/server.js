require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./src/config/passport');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth.routes');
const subjectRoutes = require('./src/routes/subject.routes');
const studySessionRoutes = require('./src/routes/studySession.routes');
const goalRoutes = require('./src/routes/goal.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const suggestionRoutes = require('./src/routes/suggestion.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const coachRoutes = require('./src/routes/coach.routes');
const chatbotRoutes = require('./src/routes/chatbot.routes');

connectDB();

const app = express();

app.use(cors({
  origin: true, 
  credentials: true
}));
app.use(express.json());
app.use('/public', express.static('public'));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/sessions', studySessionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', coachRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route không tồn tại' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại port ${PORT}`);

  // Background scheduler: kiểm tra inactivity mỗi 1 phút
  const User = require('./src/models/User');
  const StudySession = require('./src/models/StudySession');
  const Notification = require('./src/models/Notification');
  const { sendMail } = require('./src/config/email.service');

  const INACTIVITY_MINUTES = parseInt(process.env.INACTIVITY_MINUTES || '3', 10);
  const SCHEDULER_INTERVAL = parseInt(process.env.SCHEDULER_INTERVAL_SECONDS || '60', 10) * 1000;
  const REMINDER_INTERVAL = parseInt(process.env.REMINDER_INTERVAL_MINUTES || '5', 10);

  console.log(`[Scheduler] Config: check mỗi ${SCHEDULER_INTERVAL / 1000}s, cảnh báo sau ${INACTIVITY_MINUTES} phút, nhắc lại mỗi ${REMINDER_INTERVAL} phút`);

  setInterval(async () => {
    try {
      const users = await User.find({});
      const now = new Date();

      console.log(`\n[Scheduler] ⏰ ${now.toLocaleTimeString('vi-VN')} — Checking ${users.length} user(s)...`);

      for (const user of users) {
        // Dùng updatedAt để biết lần cuối user thực sự start/resume/sync session
        const lastSession = await StudySession.findOne({ userId: user._id }).sort({ updatedAt: -1 });
        
        if (!lastSession) {
          console.log(`  → ${user.email}: Chưa có session nào, bỏ qua.`);
          continue;
        }

        const lastActivity = new Date(lastSession.updatedAt);
        const diffMinutes = Math.floor((now - lastActivity) / (1000 * 60));
        
        console.log(`  → ${user.email}: Hoạt động gần nhất lúc ${lastActivity.toLocaleString('vi-VN')} (cách đây ${diffMinutes} phút)`);

        if (diffMinutes < INACTIVITY_MINUTES) {
          console.log(`    ✓ Chưa đủ ${INACTIVITY_MINUTES} phút, bỏ qua.`);
          continue;
        }

        // Kiểm tra notification gần nhất đã gửi bao lâu
        const lastNotif = await Notification.findOne({
          userId: user._id,
          content: { $regex: /consecutive/i },
          createdAt: { $gte: lastActivity },
        }).sort({ createdAt: -1 });

        if (lastNotif) {
          const minutesSinceNotif = Math.floor((now - new Date(lastNotif.createdAt)) / (1000 * 60));
          if (minutesSinceNotif < REMINDER_INTERVAL) {
            console.log(`    ⚡ Đã nhắc cách đây ${minutesSinceNotif} phút, nhắc lại sau ${REMINDER_INTERVAL - minutesSinceNotif} phút nữa.`);
            continue;
          }
          console.log(`    🔁 Đã ${minutesSinceNotif} phút từ lần nhắc trước → nhắc lại!`);
        }

        const labelEn = diffMinutes >= 1440 ? `${Math.floor(diffMinutes / 1440)} day(s)` : `${diffMinutes} minutes`;
        console.log(`    🔔 ${diffMinutes} phút không học! Tạo notification + gửi email...`);

        await Notification.create({
          userId: user._id,
          content: `Warning: No study sessions recorded for ${labelEn} consecutive. Stay on track with your goals!`,
        });

        // Gửi email
        try {
          await sendMail({
            to: user.email,
            subject: `⚠️ Learning Tracker — No activity for ${labelEn}!`,
            html: `
            <div style="background:#f3f4f6;padding:40px 20px;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#0059BB,#31A2FF);padding:28px 32px;text-align:center;">
                <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 12px;line-height:56px;font-size:28px;">📘</div>
                <h1 style="margin:0;color:#ffffff;font-size:22px;">You haven't studied for ${labelEn}!</h1>
                </div>
                <div style="padding:28px 32px;">
                  <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
                    Hi <strong>${user.name || 'Student'}</strong>,<br>
                    We noticed that you <strong>haven't recorded any study sessions for ${labelEn} in a row</strong>.
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
          console.log(`    ✅ EMAIL GỬI THÀNH CÔNG tới ${user.email}`);
        } catch (emailErr) {
          console.error(`    ❌ EMAIL THẤT BẠI (${user.email}):`, emailErr.message);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error:', err.message);
    }
  }, SCHEDULER_INTERVAL);
});
