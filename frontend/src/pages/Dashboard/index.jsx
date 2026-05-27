import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Library,
  Landmark,
  LayoutDashboard,
  BookOpen,
  Target,
  BarChart2,
  User,
  Search,
  ArrowRight,
  Clock,
  Lightbulb,
  Zap,
  BookMarked,
  LifeBuoy,
  LogOut
} from 'lucide-react';

import { BrainCircuit } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

import BtnNewSession from '../../components/BtnNewSession';
import UserAvatar from '../../components/UserAvatar';
import NotificationBell from '../../components/NotificationBell';
import ChatBot from '../../components/ChatBot';

import {
  getSummary,
  getHeatmap,
  getFocusScore
} from '../../services/analytics.service';

import { getGoalProgress } from '../../services/goal.service';

import { getSessions } from '../../services/session.service';

import API from '../../services/api';

import './Dashboard.css';

const Dashboard = () => {

  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);

  const [heatmap, setHeatmap] = useState([]);

  const [focusScore, setFocusScore] = useState(0);

  const [goalData, setGoalData] = useState(null);

  const [suggestions, setSuggestions] = useState([]);

  const [streak, setStreak] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const controller = new AbortController();

    const fetchData = async () => {

      try {

        const [
          sumRes,
          heatRes,
          focusRes,
          goalRes,
          sessRes,
          suggRes,
        ] = await Promise.all([

          getSummary('week', {
            signal: controller.signal,
          }),

          getHeatmap({
            signal: controller.signal,
          }),

          getFocusScore({
            signal: controller.signal,
          }),

          getGoalProgress({
            signal: controller.signal,
          }),

          getSessions({
            signal: controller.signal,
          }),

          API.get('/suggestions', {
            signal: controller.signal,
          }),
        ]);

        setSummary(sumRes.data);

        setHeatmap(heatRes.data);

        setFocusScore(focusRes.data.focusScore);

        setSuggestions(suggRes.data.slice(0, 3));

        const goals = goalRes.data;

        if (goals.length > 0) {
          setGoalData(goals[0]);
        }

        const sessions = sessRes.data;

        if (sessions.length > 0) {

          let currentStreak = 0;

          const today = new Date();

          today.setHours(0, 0, 0, 0);

          for (let i = 0; i < 365; i++) {

            const checkDate = new Date(today);

            checkDate.setDate(today.getDate() - i);

            const dateStr = checkDate
              .toISOString()
              .slice(0, 10);

            const hasSession = sessions.some(
              s =>
                new Date(s.startTime)
                  .toISOString()
                  .slice(0, 10) === dateStr
            );

            if (hasSession) {

              currentStreak++;

            } else if (i > 0) {

              break;
            }
          }

          setStreak(currentStreak);
        }

      } catch (err) {

        if (err.name !== 'CanceledError') {

          console.error(
            'Error fetching dashboard data',
            err
          );
        }

      } finally {

        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();

  }, []);

  const getDayLabel = (dateStr) => {

    const days = [
      'SUN',
      'MON',
      'TUE',
      'WED',
      'THU',
      'FRI',
      'SAT'
    ];

    return days[new Date(dateStr).getDay()];
  };

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const maxHeatmapMins = Math.max(
    1,
    ...heatmap.map(h => h.totalMinutes)
  );

  return (

    <div className="dashboard-layout">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="sidebar-top">

          <div className="brand-logo">

            <div className="logo-icon">
              <Landmark size={20} color="white" />
            </div>

            <span className="brand-text">
              Learning
            </span>
          </div>

          <nav className="nav-menu">

            <Link
              to="/dashboard"
              className="nav-item active"
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/sessions"
              className="nav-item"
            >
              <BookOpen size={18} />
              <span>Sessions</span>
            </Link>

            <Link
              to="/goals"
              className="nav-item"
            >
              <Target size={18} />
              <span>Goals</span>
            </Link>

            <Link
              to="/analytics"
              className="nav-item"
            >
              <BarChart2 size={18} />
              <span>Analytics</span>
            </Link>

            <Link
              to="/profile"
              className="nav-item"
            >
              <User size={18} />
              <span>Profile</span>
            </Link>

            <Link
              to="/ai-coach"
              className="nav-item"
            >
              <BrainCircuit size={18} />
              <span>AI Coach</span>
            </Link>

          </nav>
        </div>

        <div className="sidebar-bottom">

          <BtnNewSession />

          <div className="sidebar-links">

            <Link
              to="/support"
              className="sb-link"
            >
              <LifeBuoy size={16}/>
              Support
            </Link>

            <button
              className="sb-link"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut size={16}/>
              Sign Out
            </button>

          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">

        <header className="top-navbar">

          <div className="search-bar">

            <Search
              size={16}
              color="#94A3B8"
            />

            <input
              type="text"
              placeholder="Search sessions..."
              onKeyDown={(e) => {

                if (
                  e.key === 'Enter' &&
                  e.target.value.trim()
                ) {

                  navigate(
                    `/sessions?q=${encodeURIComponent(
                      e.target.value.trim()
                    )}`
                  );
                }
              }}
            />
          </div>

          <div className="top-right">
            <NotificationBell />
            <UserAvatar />
          </div>
        </header>

        {loading ? (

          <div
            style={{
              padding: '40px',
              color: '#64748B'
            }}
          >
            Loading dashboard...
          </div>

        ) : (

          <div className="dashboard-body">

            {/* BANNER */}
            <div className="welcome-banner">

              <div className="banner-text">

                <h2>
                  Welcome back
                  {user?.name ? `, ${user.name}` : ''}!
                </h2>

                <p>
                  "The limits of my language mean the
                  limits of my world."
                </p>

              </div>

              <div className="streak-circle">

                <span className="streak-label">
                  DAILY STREAK
                </span>

                <span className="streak-number">
                  {streak}
                </span>

                <span className="streak-sub">

                  {streak > 0
                    ? 'Keep it going!'
                    : 'Start today!'
                  }

                </span>
              </div>
            </div>

            {/* GRID PANELS */}
            <div className="dashboard-grid">

              {/* LEFT PANEL */}
              <div className="panel panel-left white-card">

                <div className="panel-header">

                  <div>

                    <span className="sub-title">
                      WEEKLY STUDY ACTIVITY
                    </span>

                    <h3>
                      {summary?.totalHours || 0}h This Week
                    </h3>
                  </div>

                  <div className="badge-optimal">

                    <Zap size={14} />

                    Focus Score: {focusScore}
                  </div>
                </div>

                <div className="chart-area">

                  {heatmap.map((d) => {

                    const heightPercent = Math.max(
                      8,
                      (d.totalMinutes / maxHeatmapMins) * 100
                    );

                    const isToday = d.date === today;

                    return (

                      <div
                        key={d.date}
                        className="dash-bar-col"
                      >

                        <div
                          className={`dash-bar ${
                            isToday
                              ? 'teal-active'
                              : d.totalMinutes > 0
                              ? 'grey-filled'
                              : 'grey'
                          }`}
                          style={{
                            height: `${heightPercent}%`
                          }}
                          title={`${(
                            d.totalMinutes / 60
                          ).toFixed(1)}h`}
                        ></div>

                        <span
                          className={`bar-day-label ${
                            isToday
                              ? 'today-label'
                              : ''
                          }`}
                        >
                          {getDayLabel(d.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <ChatBot />

    </div>
  );
};

export default Dashboard;