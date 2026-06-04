const Groq         = require('groq-sdk');
const StudySession  = require('../models/StudySession');
const Goal          = require('../models/Goal');
const asyncHandler  = require('../utils/asyncHandler');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── POST /api/chatbot/chat ────────────────────────────────────────────────────
const chat = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string' || !message.trim())
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Message is required.' } });

  if (!Array.isArray(history))
    return res.status(400).json({ error: { code: 'INVALID_HISTORY', message: 'History must be an array.' } });

  const userId = req.user._id;

  const [sessions, goals] = await Promise.all([
    StudySession.find({ userId }).sort({ startTime: -1 }).limit(20).populate('subjectId', 'name').lean(),
    Goal.find({ userId }).lean(),
  ]);

  const weekAgo        = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklySessions = sessions.filter(s => new Date(s.startTime) >= weekAgo);

  const totalMinutes = weeklySessions.reduce((sum, s) => sum + Math.round((s.actualDuration || 0) / 60), 0);
  const avgFocus     = weeklySessions.length > 0
    ? (weeklySessions.reduce((sum, s) => sum + (s.focusLevel || 0), 0) / weeklySessions.length).toFixed(1)
    : 0;

  const subjects   = [...new Set(sessions.map(s => s.subjectId?.name).filter(Boolean))];
  const activeGoal = goals.find(g => g.status === 'in_progress');

  const sessionDetails = weeklySessions.map(s => {
    const mins = Math.round((s.actualDuration || 0) / 60);
    const date = new Date(s.startTime).toLocaleDateString('en-GB');
    const time = new Date(s.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `- ${s.subjectId?.name || 'Unknown'}: ${date} at ${time} (${mins} min, focus ${s.focusLevel}/5)`;
  }).join('\n');

  const goalSummary = activeGoal
    ? `Target ${activeGoal.targetHours}h (${new Date(activeGoal.startDate).toLocaleDateString('en-GB')} – ${new Date(activeGoal.endDate).toLocaleDateString('en-GB')})`
    : 'No active goal set';

  const userContext = `
USER DATA:
- This week: ${(totalMinutes / 60).toFixed(1)} hours across ${weeklySessions.length} session(s)
- Average focus: ${avgFocus}/5
- Subjects studied: ${subjects.join(', ') || 'none yet'}
- Active goal: ${goalSummary}
- Total sessions (all time): ${sessions.length}
- This week's sessions:
${sessionDetails || '  (none this week)'}
`.trim();

  const systemPrompt = `You are a personal AI study coach inside the Learning Tracker app.

${userContext}

RULES:
- Always refer to the user's actual data above when relevant — never give generic advice when specific numbers are available.
- Reply only in English.
- No markdown: no *, no #, no bold, no bullet dashes — use numbered lists (1. 2. 3.) when listing is needed.
- Keep replies concise and friendly — 100 words maximum.
- If the user asks about progress or stats, cite their specific numbers.`;

  const safeHistory = history
    .filter(m => ['user', 'assistant'].includes(m?.role) && typeof m?.content === 'string')
    .slice(-20);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...safeHistory,
    { role: 'user', content: message.trim() },
  ];

  const completion = await groq.chat.completions.create({
    model:      'llama-3.3-70b-versatile',
    messages,
    max_tokens: 250,
  });

  const reply = completion.choices[0]?.message?.content;
  if (!reply)
    return res.status(502).json({ error: { code: 'AI_EMPTY_RESPONSE', message: 'No response from AI model.' } });

  res.json({ data: { reply } });
});

module.exports = { chat };
