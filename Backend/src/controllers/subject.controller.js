const Subject      = require('../models/Subject');
const asyncHandler = require('../utils/asyncHandler');
const { deleteOwned } = require('../utils/ownership');

// GET /api/subjects
const getSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({ userId: req.user._id })
    .sort({ name: 1 })
    .lean();

  res.json({ data: subjects });
});

// POST /api/subjects
// Fix VAL-2: lưu description + targetHours thay vì drop silently
const createSubject = asyncHandler(async (req, res) => {
  const { name, description = '', targetHours = 0 } = req.body;

  if (!name || !name.trim())
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Subject name is required' } });

  if (targetHours !== 0 && (isNaN(Number(targetHours)) || Number(targetHours) < 0))
    return res.status(400).json({ error: { code: 'INVALID_VALUE', message: 'targetHours must be a non-negative number' } });

  const subject = await Subject.create({
    userId: req.user._id,
    name:   name.trim(),
    description: description.trim(),
    targetHours: Number(targetHours),
  });

  res.status(201).json({ data: subject });
});

// DELETE /api/subjects/:id
const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await deleteOwned(Subject, req.params.id, req.user._id);
  if (!subject)
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Subject not found' } });

  res.json({ data: { message: 'Subject deleted successfully', id: req.params.id } });
});

module.exports = { getSubjects, createSubject, deleteSubject };