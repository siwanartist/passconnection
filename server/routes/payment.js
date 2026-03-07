const router  = require('express').Router();
const axios   = require('axios');
const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const User    = require('../models/User');
const authMw  = require('../middleware/auth');

const PACKAGES = { 1: { coins: 1, amount: 13000 }, 3: { coins: 3, amount: 36000 }, 6: { coins: 6, amount: 65000 } };

router.post('/prepare', authMw, async (req, res) => {
  try {
    const pkgKey = Number(req.body.packageKey);
    const pkg    = PACKAGES[pkgKey];
    if (!pkg) return res.status(400).json({ error: '잘못된 패키.' });
    const orderId = `PC-${uuidv4().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
    await Payment.create({ userId: req.user._id, orderId, amount: pkg.amount, tokens: pkg.coins, status: 'pending' });
    res.json({ orderId, amount: pkg.amount, tokens: pkg.coins, clientKey: process.env.TOSS_CLIENT_KEY || 'test_ck_placeholder', orderName: `커피챗 토큰 ${pkg.coins}개` });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

router.post('/confirm', authMw, async (req, res) => {
  try {
    const { paymentKey, orderId, amount } = req.body;
    if (!paymentKey || !orderId || !amount) return res.status(400).json({ error: '아무 않뮠.' });
    const payment = await Payment.findOne({ orderId, userId: req.user._id });
    if (!payment) return res.status(404).json({ error: '은특서 솙절.' });
    if (payment.status === 'done') return res.status(409).json({ error: '이미 처리된.' });
    if (payment.amount !== Number(amount)) return res.status(400).json({ error: '결제 amount 빸.' });
    const secretKey = process.env.TOSS_SECRET_KEY || '';
    const isTestMode = secretKey.startsWith('test_') || secretKey === '';
    let tossData = {};
    if (isTestMode) {
      console.log(`[TEST PAY] ${orderId} = ${amount}`);
      tossData = { status: 'DONE', method: '테스트', paymentKey };
    } else {
      const encoded = Buffer.from(`${secretKey}:`).toString('base64');
      const response = await axios.post('https://api.tosspayments.com/v1/payments/confirm', { paymentKey, orderId, amount: Number(amount) }, { headers: { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/json' } });
      tossData = response.data;
      if (tossData.status !== 'DONE') return res.status(400).json({ error: '결제 승인되.' });
    }
    payment.paymentKey = paymentKey; payment.method = tossData.method || ''; payment.status = 'done'; payment.tossRaw = tossData; await payment.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { coins: payment.tokens } });
    const updated = await User.findById(req.user._id).select('-password');
    res.json({ success: true, tokens: payment.tokens, coins: updated.coins });
  } catch (err) { await Payment.findOneAndUpdate({ orderId: req.body.orderId }, { status: 'failed' }); res.status(500).json({ error: '오류' }); }
});

router.get('/history', authMw, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id, status: 'done' }).sort({ createdAt: -1 }).limit(20);
    res.json({ payments });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

router.post('/use-coin', authMw, async (req, res) => {
  try {
    const { mentorId } = req.body;
    if (!mentorId) return res.status(400).json({ error: '멘토 아요.' });
    const user = await User.findById(req.user._id);
    if (user.coins < 1) return res.status(402).json({ error: '토큰 뚨듄. 캩전해주세요.' });
    user.coins -= 1; await user.save();
    await User.findByIdAndUpdate(mentorId, { $inc: { 'mentorInfo.totalChats': 1 } });
    res.json({ success: true, coins: user.coins });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

module.exports = router;
