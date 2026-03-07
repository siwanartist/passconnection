const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email:         { type: String, lowercase: true, trim: true, sparse: true },
  password:      { type: String },
  phone:         { type: String, trim: true, sparse: true },
  phoneVerified: { type: Boolean, default: false },
  googleId: { type: String, sparse: true },
  naverId:  { type: String, sparse: true },
  nickname: { type: String, trim: true, sparse: true, minlength: 2, maxlength: 20 },
  name:     { type: String, trim: true, default: '' },
  avatar:   { type: String, default: '' },
  bio:      { type: String, maxlength: 500, default: '' },
  headline: { type: String, maxlength: 100, default: '' },
  location: { type: String, default: '' },
  experience: [{ company: { type: String }, role: { type: String }, startDate: { type: String }, endDate: { type: String }, current: { type: Boolean, default: false }, desc: { type: String } }],
  education: [{ school: { type: String }, major: { type: String }, degree: { type: String }, startDate: { type: String }, endDate: { type: String } }],
  skills: [String],
  links: { github: { type: String, default: '' }, linkedin: { type: String, default: '' }, blog: { type: String, default: '' }, portfolio: { type: String, default: '' } },
  isMentor: { type: Boolean, default: false },
  mentorInfo: { company: { type: String, default: '' }, passYear: { type: String, default: '' }, role: { type: String, default: '' }, price: { type: Number, default: 13000 }, verifyLevel: { type: String, enum: ['br âr \'silver\',\'gold\'], default: 'bronze' }, totalChats: { type: Number, default: 0 }, rating: { type: Number, default: 0 }, reviewCount: { type: Number, default: 0 }, tags: [String] },
  coins: { type: Number, default: 0, min: 0 },
  role: { type: String, enum: ['user','admin'], default: 'user' },
  lastLogin:{ type: Date, default: Date.now }
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ nickname: 1 }, { unique: true, sparse: true });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ naverId: 1 }, { sparse: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password || '');
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
