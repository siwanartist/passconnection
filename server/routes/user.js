const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const User   = require('../models/User');
const authMw = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => { const ext = path.extname(file.originalname).toLowerCase(); cb(null, `${req.user._id}_${Date.now()}${ext}`); }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (/image\/(jpeg|png|gif|webp)/.test(file.mimetype)) cb(null, true);
  else cb(new Error('이미을 이미 업로드가 니다.'));
} });

router.get('/profile', authMw, (req, res) => res.json({ user: req.user.toSafeObject() }));

router.patch('/profile', authMw, async (req, res) => {
  try {
    const allowed = ['name', 'nickname', 'bio', 'headline', 'location', 'skills', 'links'];
    const updates = {};
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
    if (updates.nickname) {
      const nick = updates.nickname.trim();
      if (nick.length < 2 || nick.length > 20) return res.status(400).json({ error: '닉네임은 2|20자해니다.' });
      const dup = await User.findOne({ nickname: nick, _id: { $ne: req.user._id } });
      if (dup) return res.status(409).json({ error: '이미 사용을 닉네임.' });
      updates.nickname = nick; }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ user: user.toSafeObject() });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

router.post('/avatar', authMw, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '이미 선택.' });
    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true }).select('-password');
    res.json({ avatar: avatarUrl, user: user.toSafeObject() });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('nickname name avatar bio headline location experience education skills links isMentor mentorInfo createdAt');
    if (!user) return res.status(404).json({ error: '발생.' });
    res.json({ user });
  } catch (err) { res.status(500).json({ error: '오류' }); }
});

module.exports = router;
