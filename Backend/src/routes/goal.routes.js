const express = require('express');
const router = express.Router();
const { getGoals, getGoalProgress, checkInactivityWarning, createGoal, updateGoal, deleteGoal } = require('../controllers/goal.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/progress', getGoalProgress);
router.get('/check-warning', checkInactivityWarning);
router.route('/').get(getGoals).post(createGoal);
router.route('/:id').put(updateGoal).delete(deleteGoal);

module.exports = router;
