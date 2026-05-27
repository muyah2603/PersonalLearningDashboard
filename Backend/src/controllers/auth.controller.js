const User = require('../models/User');
const { generateToken } = require('../middleware/generateToken');
const { OAuth2Client } = require('google-auth-library');
const { sendMail } = require('../config/email.service');
const crypto = require('crypto');

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu cũ và mới' });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'Người dùng không tồn tại' });
  }

  if (!user.password && user.googleId) {
    return res.status(400).json({ message: 'Tài khoản liên kết Google không sử dụng mật khẩu' });
  }

  const isMatch = await user.matchPassword(oldPassword);
  if (!isMatch) {
    return res.status(401).json({ message: 'Mật khẩu cũ không chính xác' });
  }

  const isSame = await user.matchPassword(newPassword);
  if (isSame) {
    return res.status(400).json({ message: 'Mật khẩu mới không được trùng với mật khẩu cũ' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Đổi mật khẩu thành công' });
};

const updateAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Vui lòng chọn ảnh để tải lên' });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'Người dùng không tồn tại' });
  }

  const avatarUrl = `${process.env.API_URL || 'http://localhost:5000'}/public/uploads/${req.file.filename}`;
  user.avatar = avatarUrl;
  await user.save();

  res.json({ message: 'Cập nhật ảnh đại diện thành công', avatar: avatarUrl });
};

const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email đã được sử dụng' });

  const user = await User.create({ name, email, password });
  res.status(201).json({ _id: user._id, name: user.name, email: user.email, token: generateToken(user._id) });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });

  res.json({ _id: user._id, name: user.name, email: user.email, avatar: user.avatar, token: generateToken(user._id) });
};

const googleLogin = async (req, res) => {
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

  if (!payload || !payload.email) return res.status(400).json({ message: 'Tài khoản Google không có email' });

  const email = payload.email.toLowerCase();
  const name = payload.name || email.split('@')[0];
  const avatar = payload.picture || null;
  const googleId = payload.sub;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, name, googleId, avatar });
  } else {
    if (!user.googleId) { user.googleId = googleId; }
    if (!user.avatar && avatar) { user.avatar = avatar; }
    await user.save();
  }

  res.json({ _id: user._id, name: user.name, email: user.email, avatar: user.avatar, token: generateToken(user._id) });
};

const googleCallback = (req, res) => {
  const token = generateToken(req.user._id);
  res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}`);
};

const getProfile = (req, res) => {
  const { _id, name, email, avatar, createdAt } = req.user;
  res.json({ _id, name, email, avatar, createdAt });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Vui lòng nhập email' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });

  if (!user.password) {
    return res.status(400).json({ message: 'Tài khoản này sử dụng Google Login, không có mật khẩu để đặt lại' });
  }

  // Tạo mật khẩu ngẫu nhiên 8 ký tự
  const newPassword = crypto.randomBytes(4).toString('hex');
  user.password = newPassword;
  await user.save();

  try {
    await sendMail({
      to: email,
      subject: '🔑 Learning Tracker — Mật khẩu mới của bạn',
      html: `
      <div style="background:#f3f4f6;padding:40px 20px;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#0059BB,#31A2FF);padding:28px 32px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 12px;line-height:56px;font-size:28px;">🔑</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;">Password Reset</h1>
          </div>
          <div style="padding:28px 32px;">
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
              Hi <strong>${user.name || 'Student'}</strong>,<br>
              Your password has been reset. Here is your new password:
            </p>
            <div style="background:#EBF4FF;border:1px solid #BDD6F2;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
              <span style="font-size:28px;font-weight:800;color:#0059BB;letter-spacing:4px;">${newPassword}</span>
            </div>
            <p style="color:#64748B;font-size:13px;line-height:1.6;margin:0 0 20px;">
              Please login with the new password and change it immediately in your Profile settings.
            </p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="display:inline-block;background:#0059BB;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                Login Now
              </a>
            </div>
          </div>
          <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">Automated email from Learning Tracker — please do not reply</p>
          </div>
        </div>
      </div>`,
    });
  } catch (emailErr) {
    console.error('[Email] Forgot password email failed:', emailErr.message);
    return res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại sau.' });
  }

  res.json({ message: 'Mật khẩu mới đã được gửi đến email của bạn' });
};

module.exports = { register, login, googleLogin, googleCallback, getProfile, changePassword, updateAvatar, forgotPassword };
