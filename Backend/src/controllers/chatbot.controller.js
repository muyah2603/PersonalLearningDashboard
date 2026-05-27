const Groq = require('groq-sdk');
const StudySession = require('../models/StudySession');
const Goal = require('../models/Goal');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const chat = async (req, res) => {
  const { message, history = [] } = req.body;
  const userId = req.user._id;

  try {
    const [sessions, goals] = await Promise.all([
      StudySession.find({ userId }).sort({ startTime: -1 }).limit(20).populate('subjectId', 'name'),
      Goal.find({ userId }),
    ]);

    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const weeklySessions = sessions.filter(s => new Date(s.startTime) >= weekAgo);

    const totalMinutes = weeklySessions.reduce((sum, s) => {
      return sum + Math.round((new Date(s.endTime) - new Date(s.startTime)) / 60000);
    }, 0);

    const avgFocus = weeklySessions.length > 0
      ? (weeklySessions.reduce((sum, s) => sum + (s.focusLevel || 0), 0) / weeklySessions.length).toFixed(1)
      : 0;

    const subjects = [...new Set(sessions.map(s => s.subjectId?.name).filter(Boolean))];
    const activeGoal = goals.find(g => g.status === 'in_progress');

    // ── Chi tiết từng session ──
    const sessionDetails = weeklySessions.map(s =>
      `- ${s.subjectId?.name || 'Unknown'}: ${new Date(s.startTime).toLocaleDateString('vi-VN')} lúc ${new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} (${Math.round((new Date(s.endTime) - new Date(s.startTime)) / 60000)} phút, focus level ${s.focusLevel})`
    ).join('\n');

    const userContext = `
THÔNG TIN NGƯỜI DÙNG:
- Tuần này học: ${(totalMinutes / 60).toFixed(1)} giờ (${weeklySessions.length} sessions)
- Focus trung bình: ${avgFocus}/5
- Môn đang học: ${subjects.join(', ') || 'chưa có'}
- Mục tiêu hiện tại: ${activeGoal ? `${activeGoal.title} - ${activeGoal.targetHours}h (deadline: ${new Date(activeGoal.deadline).toLocaleDateString('vi-VN')})` : 'chưa đặt goal'}
- Tổng sessions: ${sessions.length}
- Chi tiết sessions tuần này:
${sessionDetails || 'chưa có'}
`;

    const messages = [
      {
        role: 'system',
        content: `Bạn là AI Study Coach cá nhân của người dùng app Learning.

${userContext}

NGUYÊN TẮC:
- Dựa vào dữ liệu thực tế của người dùng để trả lời cụ thể, không chung chung
- Chỉ trả lời bằng tiếng Việt
- Không dùng ký tự *, #, markdown
- Dùng số (1. 2. 3.) nếu cần liệt kê
- Ngắn gọn, thân thiện, tối đa 150 từ
- Nếu người dùng hỏi về tiến độ, hãy nhắc đến số liệu cụ thể của họ`
      },
      ...history,
      { role: 'user', content: message }
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 300,
    });

    res.json({ reply: completion.choices[0].message.content });

  } catch (err) {
    console.error('=== CHATBOT ERROR ===', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { chat };