const crypto = require('crypto');

const User = require('../models/User');
const { generateToken } = require('../middleware/generateToken');
const { OAuth2Client } = require('google-auth-library');
const { sendMail } = require('../config/email.service');
const asyncHandler = require('../utils/asyncHandler');

// ── Helper DTO ────────────────────────────────────────────────────────────────
function toUserDTO(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  };
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: {
        code: 'MISSING_FIELDS',
        message: 'Please fill in all required fields',
      },
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: {
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters long',
      },
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_EMAIL',
        message: 'Invalid email address',
      },
    });
  }

  const exists = await User.findOne({
    email: email.toLowerCase(),
  });

  if (exists) {
    return res.status(409).json({
      error: {
        code: 'EMAIL_TAKEN',
        message: 'Email is already in use',
      },
    });
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
  });

  res.status(201).json({
    data: {
      ...toUserDTO(user),
      token: generateToken(user._id),
    },
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: 'MISSING_FIELDS',
        message: 'Please enter your email and password',
      },
    });
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
  });

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
  }

  res.json({
    data: {
      ...toUserDTO(user),
      token: generateToken(user._id),
    },
  });
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({
      error: {
        code: 'MISSING_FIELDS',
        message: 'Missing credential',
      },
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({
      error: {
        code: 'CONFIG_ERROR',
        message: 'Google Client ID is not configured',
      },
    });
  }

  let payload;

  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIAL',
        message: 'Invalid Google credential',
      },
    });
  }

  if (!payload?.email) {
    return res.status(400).json({
      error: {
        code: 'NO_EMAIL',
        message: 'Google account does not contain an email',
      },
    });
  }

  const email = payload.email.toLowerCase();
  const googleId = payload.sub;

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      name: payload.name || email.split('@')[0],
      googleId,
      avatar: payload.picture || null,
    });
  } else {
    if (!user.googleId) user.googleId = googleId;
    if (!user.avatar && payload.picture) user.avatar = payload.picture;

    await user.save();
  }

  res.json({
    data: {
      ...toUserDTO(user),
      token: generateToken(user._id),
    },
  });
});

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
const googleCallback = (req, res) => {
  const token = generateToken(req.user._id);

  res.redirect(
    `${process.env.CLIENT_URL}/oauth-callback?token=${token}`
  );
};

// ── GET /api/auth/profile ─────────────────────────────────────────────────────
const getProfile = (req, res) => {
  res.json({
    data: {
      ...toUserDTO(req.user),
      createdAt: req.user.createdAt,
    },
  });
};

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      error: {
        code: 'MISSING_FIELDS',
        message: 'Please provide both old and new passwords',
      },
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      error: {
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters long',
      },
    });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'User not found',
      },
    });
  }

  if (!user.password && user.googleId) {
    return res.status(400).json({
      error: {
        code: 'GOOGLE_ACCOUNT',
        message: 'Google accounts do not use passwords',
      },
    });
  }

  if (!(await user.matchPassword(oldPassword))) {
    return res.status(401).json({
      error: {
        code: 'WRONG_PASSWORD',
        message: 'Incorrect old password',
      },
    });
  }

  if (await user.matchPassword(newPassword)) {
    return res.status(400).json({
      error: {
        code: 'SAME_PASSWORD',
        message: 'New password must be different from the old password',
      },
    });
  }

  user.password = newPassword;

  await user.save();

  res.json({
    data: {
      message: 'Password changed successfully',
    },
  });
});

// ── POST /api/auth/update-avatar ──────────────────────────────────────────────
const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: {
        code: 'NO_FILE',
        message: 'Please select an image to upload',
      },
    });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'User not found',
      },
    });
  }

  user.avatar = `${process.env.API_URL || 'http://localhost:5000'}/public/uploads/${req.file.filename}`;

  await user.save();

  res.json({
    data: {
      avatar: user.avatar,
    },
  });
});