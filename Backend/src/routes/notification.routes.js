const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllRead, generateNotifications } = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getNotifications);
router.post('/generate', generateNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markAsRead);

module.exports = router;
