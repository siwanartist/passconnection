const jwt  = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    const token   = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: '존재하지 않는 사용자입니다.' });
    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? '로그인이 만료됐어요. 다시 로그인해주세요.'
      : '인증에 실패했습니다.';
    return res.status(401).json({ error: msg });
  }
};
