const router = require('express').Router();
const User   = require('../models/User');
const authMw = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { q, sort = 'rating', category } = req.query;
    const filter = { isMentor: true };
    if (q) { const regex = new RegExp(q, 'i'); filter.$or = [{ name: regex }, { nickname: regex }, { 'mentorInfo.company': regex }, { 'mentorInfo.role': regex }]; }
    if (category && category !== 'all') filter['mentorInfo.category'] = category;
    const sortMap = { rating: { 'mentorInfo.rating': -1 }, price_low: { 'mentorInfo.price': 1 }, price_high: { 'mentorInfo.price': -1 }, recent: { 'mentorInfo.passYear': -1 } };
    const mentors = await User.find(filter).select('nickname name avatar bio headline mentorInfo skills createdAt').sort(sortMap[sort] || sortMap.rating).limit(100);
    res.json({ mentors });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

router.patch('/register', authMw, async (req, res) => {
  try {
    const { company, passYear, role, price, tags, verifyLevel } = req.body;
    if (!company || !role) return res.status(400).json({ error: '은특서비 필수입니다.' });
    const update = { isMentor: true, mentorInfo: { ...req.user.mentorInfo?.toObject?.() || {}, company, passYear, role, price: Number(price) || 13000, tags: tags || [], verifyLevel: verifyLevel || 'bronze' } };
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
    res.json({ user: user.toSafeObject() });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const mentor = await User.findOne({ _id: req.params.id, isMentor: true }).select('nickname name avatar bio headline location experience education skills links mentorInfo createdAt');
    if (!mentor) return res.status(404).json({ error: '멘토를 찾을 수.' });
    res.json({ mentor });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

module.exports = router;
