require('dotenv').config();
const express      = require('express');
const mongoose     = require('mongoose');
const session      = require('express-session');
const MongoStore   = require('connect-mongo');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const passport     = require('passport');
const path         = require('path');

const app = express();

// ── 보안 헤더 ────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ─────────────────────────────────────────
app.use(cors({
  origin: process.env.BASE_URL || '*',
  credentials: true
}));

// ── 바디 파서 ─────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limiter ──────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use('/api/auth/', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/sms/',  rateLimit({ windowMs: 60 * 1000, max: 5 }));

// ── MongoDB ───────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB 연결 성공'))
  .catch(err => { console.error('❌ MongoDB 연결 실패:', err.message); process.exit(1); });

// ── 세션 ─────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-dev-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// ── Passport ─────────────────────────────────────
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// ── API 라우터 ────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/user',    require('./routes/user'));
app.use('/api/mentor',  require('./routes/mentor'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/sms',     require('./routes/sms'));

// ── 정적 파일 ─────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── SPA fallback ──────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── 글로벌 에러 핸들러 ────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || '서버 오류가 발생했습니다.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버 실행 중 → http://localhost:${PORT}`));
