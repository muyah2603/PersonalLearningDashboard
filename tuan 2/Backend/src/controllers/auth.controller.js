const User = require('../models/User');
const { generateToken } = require('../middleware/generateToken');
const { OAuth2Client } = require('google-auth-library');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email đã được sử dụng' });

    const user = await User.create({ name, email, password });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, token: generateToken(user._id) });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });

    res.json({ _id: user._id, name: user.name, email: user.email, avatar: user.avatar, token: generateToken(user._id) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Thiếu credential' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ message: 'Google Client ID chưa được cấu hình' });

    const client = new OAuth2Client(clientId);
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: 'Google credential không hợp lệ' });
    }

    if (!payload || !payload.email)
      return res.status(400).json({ message: 'Tài khoản Google không có email' });

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];
    const avatar = payload.picture || null;
    const googleId = payload.sub;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name, googleId, avatar });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.avatar && avatar) user.avatar = avatar;
      await user.save();
    }

    res.json({ _id: user._id, name: user.name, email: user.email, avatar: user.avatar, token: generateToken(user._id) });
  } catch (err) {
    console.error('Google login error:', err.message);
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

const googleCallback = (req, res) => {
  const token = generateToken(req.user._id);
  res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}`);
};

const getProfile = (req, res) => {
  const { _id, name, email, avatar } = req.user;
  res.json({ _id, name, email, avatar });
};

module.exports = { register, login, googleLogin, googleCallback, getProfile };