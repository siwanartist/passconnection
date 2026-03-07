const mongoose = require('mongoose');

const smsCodeSchema = new mongoose.Schema({
  phone:    { type: String, required: true, index: true },
  code:     { type: String, required: true },
  verified: { type: Boolean, default: false },
  createdAt:{ type: Date, default: Date.now, expires: 300 }
});

module.exports = mongoose.model('SmsCode', smsCodeSchema);
