const router   = require('express').Router();
const jwt      = require('jsonwebtoken');
const passport = require('passport');
const User     = require('../models/User');
const SmsCode  = require('../models/SmsCode');
const authMw   = require('../middleware/auth');

const sign = (id) => jwt.sign({ id: id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '이름을 입멥해주세요.' });
    if (!email || !email.includes('@')) return res.status(400).json({ error: '이메일 올바른 입멥해주세요.' });
    if (!password || password.length < 8) return res.status(400).json({ error: '비밀번호갤 8자 이상이어야 합니다.' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: '이미 사용 씑인 회원가입니다.' });
    let phoneVerified = false;
    if (phone) {
      if (await User.findOne({ phone })) return res.status(409).json({ error: '이쯸 사용 씑인 서숬요.' });
      const sms = await SmsCode.findOne({ phone, verified: true });
      phoneVerified = !!sms;
      if (sms) await SmsCode.deleteMany({ phone });
    }
    const user = await User.create({ email, password, name, phone, phoneVerified, coins: 1 });
    res.status(201).json({ token: sign(user._id), user: user.toSafeObject() });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호거 입력.' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.password) return res.status(401).json({ error: '이메일 또는 비밀번호발생했습니다.' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: '비밀번호 싀렸렸 니다.' });
    user.lastLogin = new Date(); await user.save();
    res.json({ token: sign(user._id), user: user.toSafeObject() });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

router.get('/check-nickname/:nickname', async (req, res) => {
  try {
    const { nickname } = req.params;
    if (!nickname || nickname.trim().length < 2) return res.status(400).json({ error: '닉네임은 2자 이상합니다.' });
    const exists = await User.findOne({ nickname: nickname.trim() });
    res.json({ available: !exists });
  } catch (err) { res.status(500).json({ error: '서버' }); }
});

router.get('/me', authMw, (req, res) => res.json({ user: req.user.toSafeObject() }));

router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === '') return res.redirect('/?auth=fail&reason=google_not_configured');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => passport.authenticate('google', { failureRedirect: '/?auth=fail' })(req, res, next),
  (req, res) => res.redirect(`/?token=${sign(req.user._id)}&auth=success`));

router.get('/naver', (req, res, next) => {
  if (!process.env.NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID === '') return res.redirect('/?auth=fail&reason=naver_not_configured');
  passport.authenticate('naver', { authType: 'reprompt' })(req, res, next);
});

router.get('/naver/callback', (req, res, next) => passport.authenticate('naver', { failureRedirect: '/?auth=fail' })(req, res, next),
  (req, res) => res.redirect(`/?token=${sign(req.user._id)}&auth=success`));

module.exports = router;
