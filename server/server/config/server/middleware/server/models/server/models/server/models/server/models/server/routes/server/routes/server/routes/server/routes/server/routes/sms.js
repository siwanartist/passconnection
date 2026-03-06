const router  = require('express').Router();
const axios   = require('axios');
const SmsCode = require('../models/SmsCode');

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post('/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^01[0-9]{8,9}$/.test(phone.replace(/-/g, '')))
      return res.status(400).json({ error: '올바른 전화번호를 입력해주세요.' });

    const clean = phone.replace(/-/g, '');
    const code  = generateCode();

    await SmsCode.deleteMany({ phone: clean });
    await SmsCode.create({ phone: clean, code });

    if (process.env.NHN_APP_KEY && process.env.NHN_APP_KEY !== '') {
      const url = `https://api-sms.cloud.toast.com/sms/v3.0/appKeys/${process.env.NHN_APP_KEY}/sender/sms`;
      await axios.post(url, {
        body: `[패스커넥션] 인증번호: ${code} (5분 내 입력해주세요)`,
        sendNo: process.env.NHN_SENDER_PHONE,
        recipientList: [{ recipientNo: clean }]
      }, {
        headers: {
          'X-Secret-Key': process.env.NHN_SECRET_KEY,
          'Content-Type': 'application/json'
        }
      });
      res.json({ success: true, message: '인증문자를 발송했습니다.' });
    } else {
      console.log(`[SMS 테스트] ${clean} → 인증번호: ${code}`);
      res.json({ success: true, message: '테스트 모드: 서버 콘솔에서 코드를 확인하세요.', devCode: process.env.NODE_ENV !== 'production' ? code : undefined });
    }
  } catch (err) {
    console.error('[sms/send]', err.message);
    res.status(500).json({ error: 'SMS 발송에 실패했습니다.' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code)
      return res.status(400).json({ error: '전화번호와 인증번호를 입력해주세요.' });

    const clean  = phone.replace(/-/g, '');
    const record = await SmsCode.findOne({ phone: clean, code: String(code) });

    if (!record)
      return res.status(400).json({ error: '인증번호가 틀렸거나 만료됐습니다.' });

    record.verified = true;
    await record.save();
    res.json({ success: true, message: '인증이 완료됐습니다.' });
  } catch (err) {
    console.error('[sms/verify]', err.message);
    res.status(500).json({ error: '인증 확인 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
