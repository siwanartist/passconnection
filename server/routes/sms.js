const express = require('express');
const router = express.Router();
const SmsCode = require('../models/SmsCode');
const User = require('../models/User');

// SMS 인증 코드 발송
router.post('/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: '전화번호를 입력해주세요.' });

    // 6자리 인증코드 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분

    await SmsCode.findOneAndUpdate(
      { phone },
      { phone, code, expiresAt, verified: false },
      { upsert: true, new: true }
    );

    // TODO: 실제 SMS 발송 (NHN Cloud SENS)
    // 개발환경에서는 콘솔 출력
    console.log(`SMS code for ${phone}: ${code}`);

    res.json({ message: 'SMS 인증코드가 발송되었습니다.', ...(process.env.NODE_ENV !== 'production' && { code }) });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// SMS 인증 코드 확인
router.post('/verify', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ message: '전화번호와 인증코드를 입력해주세요.' });

    const smsCode = await SmsCode.findOne({ phone, code });
    if (!smsCode) return res.status(400).json({ message: '인증코드가 올바르지 않습니다.' });
    if (smsCode.expiresAt < new Date()) return res.status(400).json({ message: '인증코드가 만료되었습니다.' });

    await SmsCode.findOneAndUpdate({ phone }, { verified: true });

    res.json({ message: '인증이 완료되었습니다.', verified: true });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
