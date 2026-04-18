const StudySession = require('../models/StudySession');

const getSessions = async (req, res) => {
  const { subjectId, from, to } = req.query;
  const filter = { userId: req.user._id };
  if (subjectId) filter.subjectId = subjectId;
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from);
    if (to) filter.startTime.$lte = new Date(to);
  }
  const sessions = await StudySession.find(filter)
    .populate('subjectId', 'name')
    .sort({ startTime: -1 });
  res.json(sessions);
};

const getSessionById = async (req, res) => {
  const session = await StudySession.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('subjectId', 'name');
  if (!session) return res.status(404).json({ message: 'Không tìm thấy phiên học' });
  res.json(session);
};

const createSession = async (req, res) => {
  const { subjectId, startTime, endTime, focusLevel, notes } = req.body;
  if (!subjectId || !startTime || !endTime || !focusLevel)
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  if (new Date(endTime) <= new Date(startTime))
    return res.status(400).json({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });

  const session = await StudySession.create({
    userId: req.user._id,
    subjectId,
    startTime,
    endTime,
    focusLevel,
    notes,
  });
  res.status(201).json(session);
};

const updateSession = async (req, res) => {
  const session = await StudySession.findOne({ _id: req.params.id, userId: req.user._id });
  if (!session) return res.status(404).json({ message: 'Không tìm thấy phiên học' });

  const { subjectId, startTime, endTime, focusLevel, notes, actualDuration, isEnded } = req.body;
  if (subjectId !== undefined) session.subjectId = subjectId;
  if (startTime !== undefined) session.startTime = startTime;
  if (endTime !== undefined) session.endTime = endTime;
  if (focusLevel !== undefined) session.focusLevel = focusLevel;
  if (notes !== undefined) session.notes = notes;
  if (actualDuration !== undefined) session.actualDuration = actualDuration;
  if (isEnded !== undefined) session.isEnded = isEnded;

  const updated = await session.save();
  res.json(updated);
};

const deleteSession = async (req, res) => {
  const session = await StudySession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!session) return res.status(404).json({ message: 'Không tìm thấy phiên học' });
  res.json({ message: 'Đã xoá phiên học' });
};

module.exports = { getSessions, getSessionById, createSession, updateSession, deleteSession };
