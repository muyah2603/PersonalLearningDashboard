const express = require('express');
const router  = express.Router();
const { getSummary, getBySubject, getHeatmap, getFocusScore, getGoalProgress, getStreak } = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/summary',       getSummary);
router.get('/by-subject',    getBySubject);
router.get('/heatmap',       getHeatmap);
router.get('/focus-score',   getFocusScore);
router.get('/goal-progress', getGoalProgress);
router.get('/streak',        getStreak);  // protect đã có ở router.use phía trên rồi

module.exports = router;