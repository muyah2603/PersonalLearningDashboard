const Subject = require('../models/Subject');

const getSubjects = async (req, res) => {
  const subjects = await Subject.find({ userId: req.user._id }).sort({ name: 1 });
  res.json(subjects);
};

const createSubject = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Tên môn học không được để trống' });
  const subject = await Subject.create({ userId: req.user._id, name });
  res.status(201).json(subject);
};

const deleteSubject = async (req, res) => {
  const subject = await Subject.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!subject) return res.status(404).json({ message: 'Không tìm thấy môn học' });
  res.json({ message: 'Đã xoá môn học' });
};

module.exports = { getSubjects, createSubject, deleteSubject };
