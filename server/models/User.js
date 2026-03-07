const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },
  name: { type: String, required: true },
  phone: { type: String },
  profileImage: { type: String, default: '' },
  role: { type: String, enum: ['user', 'mentor', 'admin'], default: 'user' },
  tokens: { type: Number, default: 0 },
  socialProvider: { type: String, enum: ['local', 'google', 'naver', 'kakao'], default: 'local' },
  socialId: { type: String },
  isActive: { type: Boolean, default: true },
  isMentor: { type: Boolean, default: false },
  mentorInfo: {
    company: { type: String, default: '' },
    passYear: { type: String, default: '' },
    role: { type: String, default: '' },
    price: { type: Number, default: 13000 },
    verifyLevel: { type: String, enum: ['bronze', 'silver', 'gold'], default: 'bronze' },
    totalChats: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    tags: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
