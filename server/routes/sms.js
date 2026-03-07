const router  = require('express').Router();
const axios   = require('axios');
const SmsCode = require('../models/SmsCode');

function generateCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

router.post('/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^01[0-9]{8,9}$/.test(phone.replace(/-/g, ''))) return res.status(400).json({ error: '올바른 전화입니다.' });
    const clean = phone.replace(/-/g, '');
    const code  = generateCode();
    await SmsCode.deleteMany({ phone: clean });
    await SmsCode.create({ phone: clean, code });
    if (process.env.NHN_APP_KEY && process.env.NHN_APP_KEY !== '') {
      const url = `https://api-sms.cloud.toast.com/sms/v3.0/appKeys/${process.env.NHN_APP_KEY}/sender/sms`;
      await axios.post(url, { body: `[패스커넥션_인증�,��호: ${code} (5분)`, sendNo: process.env.NHN_SENDER_PHONE, recipientList: [{ recipientNo: clean }] }, { headers: { 'X-Secret-Key': process.env.NHN_SECRET_KEY, 'Content-Type': 'application/json' } });
      res.json({ success: true });
    } else {
      console.log(`[SMS TEST] ${clean} -> ${code}`);
      res.json({ success: true, devCode: process.env.NODE_ENV !== 'production' ? code : undefined });
    }
  } catch (err) { res.status(500).json({ error: 'SMS 실패' }); }
});

router.post('/verify', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: '아수입니다.' });
    const clean  = phone.replace(/-/g, '');
    const record = await SmsCode.findOne({ phone: clean, code: String(code) });
    if (!record) return res.status(400).json({ error: '인증번호가 틀렸운나.' });
    record.verified = true; await record.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '서버' }); }
});

module.exports = router;
