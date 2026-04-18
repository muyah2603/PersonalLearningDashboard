const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, googleLogin, googleCallback, getProfile, changePassword, updateAvatar, forgotPassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/google/login', googleLogin);
router.get('/profile', protect, getProfile);
router.put('/change-password', protect, changePassword);
router.post('/upload-avatar', protect, upload.single('avatar'), updateAvatar);

// Google OAuth (legacy redirect flow)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  googleCallback
);

module.exports = router;
