const StudySession = require('../models/StudySession');
const asyncHandler = require('../utils/asyncHandler');
const { findOwned } = require('../utils/ownership');

// ── DTO ──────────────────────────────────────────────────────────────────────
function toSessionDTO(doc) {
  return {
    _id:            doc._id,        // Fix: frontend dùng session._id
    id:             doc._id,
    subjectId:      doc.subjectId,  // Fix: frontend dùng session.subjectId (populated: { _id, name })
    startTime:      doc.startTime,
    endTime:        doc.endTime,
    focusLevel:     doc.focusLevel,
    actualDuration: doc.actualDuration,
    notes:          doc.notes,
    isEnded:        doc.isEnded,
    createdAt:      doc.createdAt,
  };
}

// ── GET /api/sessions ─────────────────────────────────────────────────────────
// Fix API-1: thêm pagination, không trả toàn bộ history
const getSessions = asyncHandler(async (req, res) => {
  const { subjectId, from, to, page = 1, limit = 20 } = req.query;

  const filter = { userId: req.user._id };
  if (subjectId) filter.subjectId = subjectId;
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from);
    if (to)   filter.startTime.$lte = new Date(to);
  }

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const [sessions, total] = await Promise.all([
    StudySession.find(filter)
      .populate('subjectId', 'name')
      .sort({ startTime: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    StudySession.countDocuments(filter),
  ]);

  // Fix API-2: trả DTO, không trả raw doc
  res.json({
    data: sessions.map(toSessionDTO),
  });
});

// ── GET /api/sessions/:id ─────────────────────────────────────────────────────
const getSessionById = asyncHandler(async (req, res) => {
  // Fix VAL-3: dùng findOwned thay vì lặp ownership filter
  const session = await findOwned(StudySession, req.params.id, req.user._id);
  if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy phiên học' } });

  await session.populate('subjectId', 'name');
  res.json({ data: toSessionDTO(session) });
});

// ── POST /api/sessions ────────────────────────────────────────────────────────
const createSession = asyncHandler(async (req, res) => {
  const { subjectId, startTime, endTime, focusLevel, notes } = req.body;

  if (!subjectId || !startTime || !endTime || !focusLevel)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Thiếu thông tin bắt buộc' } });

  if (new Date(endTime) <= new Date(startTime))
    return res.status(400).json({ error: { code: 'INVALID_DATE_RANGE', message: 'Thời gian kết thúc phải sau thời gian bắt đầu' } });

  if (!Number.isInteger(focusLevel) || focusLevel < 1 || focusLevel > 5)
    return res.status(400).json({ error: { code: 'INVALID_FOCUS_LEVEL', message: 'focusLevel phải là số nguyên từ 1 đến 5' } });

  const session = await StudySession.create({
    userId: req.user._id,
    subjectId,
    startTime,
    endTime,
    focusLevel,
    notes,
  });

  await session.populate('subjectId', 'name');
  res.status(201).json({ data: toSessionDTO(session) });
});

// ── PUT /api/sessions/:id ─────────────────────────────────────────────────────
const updateSession = asyncHandler(async (req, res) => {
  const session = await findOwned(StudySession, req.params.id, req.user._id);
  if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy phiên học' } });

  // Fix VAL-1: validate focusLevel nếu được gửi lên
  const { subjectId, startTime, endTime, focusLevel, notes, actualDuration, isEnded } = req.body;
  if (focusLevel !== undefined && (!Number.isInteger(focusLevel) || focusLevel < 1 || focusLevel > 5))
    return res.status(400).json({ error: { code: 'INVALID_FOCUS_LEVEL', message: 'focusLevel phải là số nguyên từ 1 đến 5' } });

  if (subjectId !== undefined)      session.subjectId      = subjectId;
  if (startTime !== undefined)      session.startTime      = startTime;
  if (endTime !== undefined)        session.endTime        = endTime;
  if (focusLevel !== undefined)     session.focusLevel     = focusLevel;
  if (notes !== undefined)          session.notes          = notes;
  if (actualDuration !== undefined) session.actualDuration = actualDuration;
  if (isEnded !== undefined)        session.isEnded        = isEnded;

  const updated = await session.save();
  await updated.populate('subjectId', 'name');
  res.json({ data: toSessionDTO(updated) });
});

// ── DELETE /api/sessions/:id ──────────────────────────────────────────────────
const deleteSession = asyncHandler(async (req, res) => {
  const session = await StudySession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy phiên học' } });

  res.json({ data: { message: 'Đã xoá phiên học', id: req.params.id } });
});

module.exports = { getSessions, getSessionById, createSession, updateSession, deleteSession };