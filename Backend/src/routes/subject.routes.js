const express = require('express');
const router = express.Router();
const { getSubjects, createSubject, deleteSubject } = require('../controllers/subject.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.route('/').get(getSubjects).post(createSubject);
router.delete('/:id', deleteSubject);

module.exports = router;
