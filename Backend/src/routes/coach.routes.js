const express  = require('express');
const router   = express.Router();
const { getCoachReport } = require('../controllers/coach.controller');
const { protect }        = require('../middleware/auth.middleware');

router.get('/coach', protect, getCoachReport);

module.exports = router;