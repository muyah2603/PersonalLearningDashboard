require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./src/config/passport');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth.routes');
const subjectRoutes = require('./src/routes/subject.routes');
const studySessionRoutes = require('./src/routes/studySession.routes');
const goalRoutes = require('./src/routes/goal.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');

connectDB();

const app = express();

app.use(cors({
  origin: true, 
  credentials: true
}));
app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/sessions', studySessionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route không tồn tại' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại port ${PORT}`);
});
