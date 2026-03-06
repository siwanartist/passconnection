const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId:    { type: String, required: true, unique: true },
  paymentKey: { type: String, default: '' },
  amount:     { type: Number, required: true },
  tokens:     { type: Number, required: true },
  method:     { type: String, default: '' },
  status:     { type: String, enum: ['pending','done','failed','canceled'], default: 'pending' },
  tossRaw:    { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
