import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Landmark, LayoutDashboard, BookOpen, Target, BarChart2, User, Search,
  ArrowRight, Lightbulb, Zap, LifeBuoy, LogOut, BrainCircuit
} from 'lucide-react';
import { useAuth }        from '../../context/AuthContext';
import BtnNewSession      from '../../components/BtnNewSession';
import UserAvatar         from '../../components/UserAvatar';
import NotificationBell   from '../../components/NotificationBell';
import ChatBot            from '../../components/ChatBot';
import { getSummary, getHeatmap, getFocusScore, getStreak } from '../../services/analytics.service';
import { getGoalProgress } from '../../services/goal.service';
import API                 from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [summary,     setSummary]     = useState(null);
  const [heatmap,     setHeatmap]     = useState([]);
  const [focusScore,  setFocusScore]  = useState(0);
  const [goalData,    setGoalData]    = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [streak,      setStreak]      = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const fetchData = async (signal) => {
    setError(null);
    try {
      const [sumRes, heatRes, focusRes, goalRes, suggRes, streakRes] = await Promise.all([
        getSummary('week',      { signal }),
        getHeatmap(             { signal }),
        getFocusScore(          { signal }),
        getGoalProgress(        { signal }),
        API.get('/suggestions', { signal }),
        getStreak(              { signal }),
      ]);

      setSummary(sumRes.data);
      setHeatmap(heatRes.data         ?? []);
      setFocusScore(focusRes.data?.focusScore ?? 0);
      setSuggestions((suggRes.data    ?? []).slice(0, 3));
      setStreak(streakRes.data?.streak ?? 0);

      const goals = goalRes.data ?? [];
      if (goals.length > 0) setGoalData(goals[0]);

    } catch (err) {
      if (err.name !== 'CanceledError')
        setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, []);

  const getDayLabel = (dateStr) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[new Date(dateStr).getDay()];
  };

  const today          = new Date().toISOString().slice(0, 10);
  const maxHeatmapMins = Math.max(1, ...heatmap.map(h => h.totalMinutes));

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-logo">
            <div className="logo-icon"><Landmark size={20} color="white" /></div>
            <span className="brand-text">Learning</span>
          </div>
          <nav className="nav-menu">
            <Link to="/dashboard" className="nav-item active"><LayoutDashboard size={18} /><span>Dashboard</span></Link>
            <Link to="/sessions"  className="nav-item"><BookOpen size={18} /><span>Sessions</span></Link>
            <Link to="/goals"     className="nav-item"><Target size={18} /><span>Goals</span></Link>
            <Link to="/analytics" className="nav-item"><BarChart2 size={18} /><span>Analytics</span></Link>
            <Link to="/ai-coach"  className="nav-item"><BrainCircuit size={18} /><span>Coach</span></Link>
            <Link to="/profile"   className="nav-item"><User size={18} /><span>Profile</span></Link>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <BtnNewSession />
          <div className="sidebar-links">
            <Link to="/support" className="sb-link"><LifeBuoy size={16}/> Support</Link>
            <button className="sb-link" onClick={() => { logout(); navigate('/login'); }}>
              <LogOut size={16}/> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-navbar">
          <div className="search-bar">
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim())
                  navigate(`/sessions?q=${encodeURIComponent(e.target.value.trim())}`);
              }}
            />
          </div>
          <div className="top-right">
            <NotificationBell />
            <UserAvatar />
          </div>
        </header>

        {/* FE-4: Error state */}
        {error && (
          <div style={{ margin: '24px 40px', padding: '16px 24px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button
              onClick={() => { setLoading(true); const c = new AbortController(); fetchData(c.signal); }}
              style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', color: '#64748B' }}>Loading dashboard...</div>
        ) : !error && (
          <div className="dashboard-body">
            <div className="welcome-banner">
              <div className="banner-text">
                <h2>Welcome back{user?.name ? `, ${user.name}` : ''}!</h2>
                <p>"The limits of my language mean the limits of my world."</p>
              </div>
              <div className="streak-circle">
                <span className="streak-label">DAILY STREAK</span>
                <span className="streak-number">{streak}</span>
                <span className="streak-sub">{streak > 0 ? 'Keep it going!' : 'Start today!'}</span>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="panel panel-left white-card">
                <div className="panel-header">
                  <div>
                    <span className="sub-title">WEEKLY STUDY ACTIVITY</span>
                    <h3>{summary?.totalHours || 0}h This Week</h3>
                  </div>
                  <div className="badge-optimal">
                    <Zap size={14} />
                    Focus Score: {focusScore}
                  </div>
                </div>
                <div className="chart-area">
                  {heatmap.map((d, i) => {
                    const heightPercent = Math.max(8, (d.totalMinutes / maxHeatmapMins) * 100);
                    const isToday = d.date === today;
                    return (
                      <div key={d.date} className="dash-bar-col">
                        <div
                          className={`dash-bar ${isToday ? 'teal-active' : d.totalMinutes > 0 ? 'grey-filled' : 'grey'}`}
                          style={{ height: `${heightPercent}%` }}
                          title={`${(d.totalMinutes / 60).toFixed(1)}h`}
                        />
                        <span className={`bar-day-label ${isToday ? 'today-label' : ''}`}>{getDayLabel(d.date)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="panel-footer">
                  <div className="stats-row">
                    <div className="stat-item"><span className="stat-label">SESSIONS</span><span className="stat-value">{summary?.sessionCount || 0}</span></div>
                    <div className="stat-item"><span className="stat-label">TOTAL HOURS</span><span className="stat-value">{summary?.totalHours || 0}h</span></div>
                  </div>
                  <Link to="/analytics" className="view-logs">View analytics <ArrowRight size={16} /></Link>
                </div>
              </div>

              <div className="panel-right">
                <div className="target-card white-card">
                  {goalData ? (
                    <>
                      <div className="target-header">
                        <div className="icon-circle"><Target size={16} color="#0059BB" /></div>
                        <span className="target-text">TARGET: {goalData.targetHours}H</span>
                      </div>
                      <div className="progress-info">
                        <div className="val">
                          <span className="big">{goalData.actualHours}</span>
                          <span className="small">/{goalData.targetHours}</span>
                        </div>
                        <span className="desc">Hours toward active goal</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-fill" style={{ width: `${goalData.completionPercent}%` }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="target-header">
                        <div className="icon-circle"><Target size={16} color="#0059BB" /></div>
                        <span className="target-text">NO ACTIVE GOAL</span>
                      </div>
                      <div className="progress-info"><span className="desc">Create a goal to track your progress</span></div>
                      <Link to="/goals" className="view-logs" style={{ marginTop: '8px' }}>Set a goal <ArrowRight size={16} /></Link>
                    </>
                  )}
                </div>

                <div className="suggestions-card dark-card">
                  <div className="suggestions-header">
                    <Lightbulb size={18} color="#2DD4BF" />
                    <h4>Smart Suggestions</h4>
                  </div>
                  {suggestions.length > 0 ? (
                    suggestions.map((s, i) => (
                      <div key={s._id || i} className="suggestion-item">
                        <span className="sugg-label">{i === 0 ? 'QUICK ACTION' : 'RECOMMENDED'}</span>
                        <p>{s.content}</p>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="suggestion-item"><span className="sugg-label">TIP</span><p>Break your study sessions into small chunks to stay focused and avoid burnout.</p></div>
                      <div className="suggestion-item"><span className="sugg-label">RECOMMENDED</span><p>Set a weekly goal to keep your learning on track.</p></div>
                    </>
                  )}
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