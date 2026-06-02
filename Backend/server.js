require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const session      = require('express-session');
const passport     = require('./src/config/passport');
const connectDB = require('./src/config/db');

// Routes
const authRoutes         = require('./src/routes/auth.routes');
const subjectRoutes      = require('./src/routes/subject.routes');
const studySessionRoutes = require('./src/routes/studySession.routes');
const goalRoutes         = require('./src/routes/goal.routes');
const analyticsRoutes    = require('./src/routes/analytics.routes');
const suggestionRoutes   = require('./src/routes/suggestion.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const coachRoutes        = require('./src/routes/coach.routes');
const chatbotRoutes      = require('./src/routes/chatbot.routes');

// Scheduler tách ra file riêng (xem bên dưới)
const startScheduler = require('./src/jobs/inactivityScheduler');

connectDB();

const app = express();

// Allow CLIENT_URL + common Vite dev ports
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use('/public', express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/subjects',      subjectRoutes);
app.use('/api/sessions',      studySessionRoutes);
app.use('/api/goals',         goalRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/suggestions',   suggestionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai',            coachRoutes);
app.use('/api/chatbot',       chatbotRoutes);

// FIX VAL-1 (1/2): 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route không tồn tại' } });
});

// FIX VAL-1 (2/2): Global error middleware — PHẢI có đủ 4 tham số
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);

  const statusMap = {
    ValidationError:   400,
    CastError:         400,
    JsonWebTokenError: 401,
    TokenExpiredError: 401,
  };

  const status  = statusMap[err.name] || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  res.status(status).json({ error: { code: err.name || 'ERROR', message } });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại port ${PORT}`);
  startScheduler(); // scheduler tách riêng, gọi sau khi server sẵn sàng
});