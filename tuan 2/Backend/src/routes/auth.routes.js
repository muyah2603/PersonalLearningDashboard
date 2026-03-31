const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, googleLogin, googleCallback, getProfile } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google/login', googleLogin);
router.get('/profile', protect, getProfile);

// Google OAuth (legacy redirect flow)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  googleCallback
);

module.exports = router;
