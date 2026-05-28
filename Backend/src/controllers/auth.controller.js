// Backend/src/controllers/auth.controller.js
const crypto = require('crypto');

const User           = require('../models/User');
const { generateToken } = require('../middleware/generateToken');
const { OAuth2Client }  = require('google-auth-library');
const { sendMail }      = require('../config/email.service');
const asyncHandler      = require('../utils/asyncHandler');

// ── Helper DTO ────────────────────────────────────────────────────────────────
function toUserDTO(user) {
  return { id: user._id, name: user.name, email: user.email, avatar: user.avatar };
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Please fill in all required fields' } });

  if (password.length < 8)
    return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long' } });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Invalid email address' } });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists)
    return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Email is already in use' } });

  const user = await User.create({ name, email: email.toLowerCase(), password });

  res.status(201).json({ data: { ...toUserDTO(user), token: generateToken(user._id) } });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Please enter your email and password' } });

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });

  res.json({ data: { ...toUserDTO(user), token: generateToken(user._id) } });
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Missing credential' } });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId)
    return res.status(500).json({ error: { code: 'CONFIG_ERROR', message: 'Google Client ID is not configured' } });

  let payload;
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIAL', message: 'Invalid Google credential' } });
  }

  if (!payload?.email)
    return res.status(400).json({ error: { code: 'NO_EMAIL', message: 'Google account does not contain an email' } });

  const email    = payload.email.toLowerCase();
  const googleId = payload.sub;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, name: payload.name || email.split('@')[0], googleId, avatar: payload.picture || null });
  } else {
    if (!user.googleId) user.googleId = googleId;
    if (!user.avatar && payload.picture) user.avatar = payload.picture;
    await user.save();
  }

  res.json({ data: { ...toUserDTO(user), token: generateToken(user._id) } });
});

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
const googleCallback = (req, res) => {
  const token = generateToken(req.user._id);
  res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}`);
};

// ── GET /api/auth/profile ─────────────────────────────────────────────────────
const getProfile = (req, res) => {
  res.json({ data: { ...toUserDTO(req.user), createdAt: req.user.createdAt } });
};

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Please provide both old and new passwords' } });

  if (newPassword.length < 8)
    return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long' } });

  const user = await User.findById(req.user._id);
  if (!user)
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });

  if (!user.password && user.googleId)
    return res.status(400).json({ error: { code: 'GOOGLE_ACCOUNT', message: 'Google accounts do not use passwords' } });

  if (!(await user.matchPassword(oldPassword)))
    return res.status(401).json({ error: { code: 'WRONG_PASSWORD', message: 'Incorrect old password' } });

  if (await user.matchPassword(newPassword))
    return res.status(400).json({ error: { code: 'SAME_PASSWORD', message: 'New password must be different from the old password' } });

  user.password = newPassword;
  await user.save();

  res.json({ data: { message: 'Password changed successfully' } });
});

// ── POST /api/auth/update-avatar ──────────────────────────────────────────────
const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: { code: 'NO_FILE', message: 'Please select an image to upload' } });

  const user = await User.findById(req.user._id);
  if (!user)
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });

  user.avatar = `${process.env.API_URL || 'http://localhost:5000'}/public/uploads/${req.file.filename}`;
  await user.save();

  res.json({ data: { avatar: user.avatar } });
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Please enter your email' } });

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user || !user.password)
    return res.json({ data: { message: 'If this email exists, a reset link has been sent.' } });

  const resetToken  = crypto.randomBytes(32).toString('hex');
  const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

  user.resetPasswordToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpiry = resetExpiry;
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  try {
    await sendMail({
      to:      email,
      subject: 'Learning Tracker — Reset your password',
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;padding:40px 20px;background:#f3f4f6;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
            <div style="background:#0059BB;padding:28px 32px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:20px;">Reset your password</h1>
            </div>
            <div style="padding:28px 32px;">
              <p style="color:#374151;">Hi <strong>${user.name || 'there'}</strong>,</p>
              <p style="color:#374151;">Click the button below to reset your password. The link expires in <strong>1 hour</strong>.</p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${resetUrl}"
                   style="background:#0059BB;color:#fff;padding:12px 32px;border-radius:8px;
                          text-decoration:none;font-size:15px;font-weight:600;">
                  Reset Password
                </a>
              </div>
              <p style="color:#9ca3af;font-size:13px;">If you did not request this, please ignore this email.</p>
            </div>
          </div>
        </div>`,
    });
  } catch (emailErr) {
    console.error('[Email] Forgot password failed:', emailErr.message);
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();
    return res.status(500).json({ error: { code: 'EMAIL_FAILED', message: 'Failed to send email. Please try again.' } });
  }

  res.json({ data: { message: 'If this email exists, a reset link has been sent.' } });
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Missing token or new password' } });

  if (newPassword.length < 8)
    return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } });

  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user   = await User.findOne({
    resetPasswordToken:  hashed,
    resetPasswordExpiry: { $gt: new Date() },
  });

  if (!user)
    return res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Reset link is invalid or has expired' } });

  user.password            = newPassword;
  user.resetPasswordToken  = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  res.json({ data: { message: 'Password reset successfully. Please log in.' } });
});

// ── module.exports ────────────────────────────────────────────────────────────
module.exports = {
  register,
  login,
  googleLogin,
  googleCallback,
  getProfile,
  changePassword,
  updateAvatar,
  forgotPassword,
  resetPassword,
};