const express = require('express');
const router = express.Router();
const { runCoach } = require('../controllers/coach.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/coach', protect, (req, res) => {
  try {
    const data = {
      totalStudyTime: 12.5,
      avgFocus: 2.2,
      sessionsPerDay: 4.1,
      streakDays: 3,
      weeklyGoal: 15,
      studyByHour: { 7:1, 8:0.5, 20:2, 21:3.5, 22:2.5 },
      studyByDay: { Mon:2.5, Tue:0, Wed:3, Thu:0, Fri:4, Sat:2, Sun:1 }
    };
    const result = runCoach(data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;