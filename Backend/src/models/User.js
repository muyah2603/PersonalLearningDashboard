const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:     { type: String, trim: true },
    password: { type: String, default: null },
    googleId: { type: String, default: null },
    avatar:   { type: String, default: null },

    // Fix auth.controller forgotPassword: lưu hashed reset token + expiry
    resetPasswordToken:  { type: String, default: null },
    resetPasswordExpiry: { type: Date,   default: null },
  },
  { timestamps: true }
);

// Fix DB-IDX-1: email đã có unique index ngầm từ unique: true
// Khai báo explicit để có tên rõ ràng, dễ quản lý trên production
userSchema.index({ email: 1 }, { unique: true, name: 'email_unique' });

// Fix DB-IDX-1: googleId — passport lookup mỗi Google login
// Không unique vì default: null (nhiều user chưa link Google cùng null)
userSchema.index({ googleId: 1 }, { sparse: true, name: 'googleId_sparse' });

// Pre-save: hash password khi thay đổi
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);