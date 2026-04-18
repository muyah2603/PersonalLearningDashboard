const express = require('express');
const router = express.Router();
const { getSessions, getSessionById, createSession, updateSession, deleteSession } = require('../controllers/studySession.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.route('/').get(getSessions).post(createSession);
router.route('/:id').get(getSessionById).put(updateSession).delete(deleteSession);

module.exports = router;
