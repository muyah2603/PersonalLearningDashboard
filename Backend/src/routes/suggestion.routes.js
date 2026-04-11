const express = require('express');
const router = express.Router();
const { generateSuggestions, getSuggestions } = require('../controllers/suggestion.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getSuggestions);
router.post('/generate', generateSuggestions);

module.exports = router;
