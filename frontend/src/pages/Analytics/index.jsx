import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Library, Landmark, LayoutDashboard, BookOpen, Target, BarChart2, User,
  Search, BookMarked, ArrowRight, Quote, LifeBuoy, LogOut, Zap
} from 'lucide-react';
import BtnNewSession from '../../components/BtnNewSession';
import UserAvatar from '../../components/UserAvatar';
import NotificationBell from '../../components/NotificationBell';
import { getSummary, getBySubject, getHeatmap, getFocusScore, getGoalProgress } from '../../services/analytics.service';
import './Analytics.css';
import { BrainCircuit } from 'lucide-react';
import ChatBot from '../../components/ChatBot';

const Analytics = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [focusScore, setFocusScore] = useState(0);
  const [goalProgress, setGoalProgress] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sumRes, subRes, heatRes, focusRes, goalRes] = await Promise.all([
          getSummary(period),
          getBySubject(),
          getHeatmap(),
          getFocusScore(),
          getGoalProgress(),
        ]);
        setSummary(sumRes.data);
        setSubjects(subRes.data.sort((a, b) => b.totalHours - a.totalHours));
        setHeatmap(heatRes.data);
        setFocusScore(focusRes.data.focusScore);
        setGoalProgress(goalRes.data);
      } catch (err) {
        console.error('Error fetching analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [period]);

  const getDayLabel = (dateStr) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[new Date(dateStr).getDay()];
  };

  const today = new Date().toISOString().slice(0, 10);
  const maxHeatmapMins = Math.max(1, ...heatmap.map(h => h.totalMinutes));

  const subjectThemes = ['theme-green', 'theme-purple', 'theme-blue', 'theme-gray'];

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-logo">
            <div className="logo-icon"><Landmark size={20} color="white" /></div>
            <span className="brand-text">Learning</span>
          </div>
          <nav className="nav-menu">
            <Link to="/dashboard" className="nav-item"><LayoutDashboard size={18} /><span>Dashboard</span></Link>
            <Link to="/sessions" className="nav-item"><BookOpen size={18} /><span>Sessions</span></Link>
            <Link to="/goals" className="nav-item"><Target size={18} /><span>Goals</span></Link>
            <Link to="/analytics" className="nav-item active"><BarChart2 size={18} /><span>Analytics</span></Link>
            <Link to="/profile" className="nav-item"><User size={18} /><span>Profile</span></Link>
            <Link to="/ai-coach" className="nav-item"><BrainCircuit size={18} /><span>AI Coach</span></Link>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <BtnNewSession />
          <div className="sidebar-links">
            <Link to="/support" className="sb-link"><LifeBuoy size={16}/> Support</Link>
            <Link to="/login" className="sb-link"><LogOut size={16}/> Sign Out</Link>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="top-navbar">
          <div className="search-bar">
            <Search size={16} color="#94A3B8" />
            <input type="text" placeholder="Search sessions..." onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) navigate(`/sessions?q=${encodeURIComponent(e.target.value.trim())}`); }} />
          </div>
          <div className="top-right">
            <NotificationBell />
            <UserAvatar />
          </div>
        </header>

        <div className="analytics-wrapper">
          <div className="analytics-header">
            <h2>Analytics</h2>
            <p>Your learning performance overview with data from your actual study sessions.</p>
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>Loading analytics...</div>
          ) : (
            <div className="analytics-grid">
              
              {/* 1. WEEKLY CHART CARD - Planned vs Actual (Heatmap) */}
              <div className="chart-card">
                <div className="chart-header">
                  <div className="ch-left">
                    <h4>Study Activity (7 Days)</h4>
                    <div className="ch-stats">
                      <span className="ch-big">{summary?.totalHours || 0}</span>
                      <span className="ch-small">total hours this {period}</span>
                    </div>
                  </div>
                  <div className="ch-right">
                    <div className="segmented-control">
                      <button className={`seg-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>WEEK</button>
                      <button className={`seg-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>MONTH</button>
                    </div>
                  </div>
                </div>

                <div className="chart-body">
                  <div className="chart-bars">
                    {heatmap.map((d, i) => {
                      const heightPercent = (d.totalMinutes / maxHeatmapMins) * 100;
                      const isToday = d.date === today;
                      return (
                        <div key={i} className="chart-col">
                          <div className="bar-wrapper" style={{ height: 'calc(100% - 24px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <div 
                              className={`front-bar ${isToday ? 'active' : ''}`}
                              style={{ 
                                height: `${Math.max(heightPercent, 4)}%`, 
                                width: '60%', 
                                borderRadius: '8px 8px 0 0',
                                backgroundColor: isToday ? '#0059BB' : d.totalMinutes > 0 ? '#BDD6F2' : '#F1F5F9',
                                transition: 'height 0.3s'
                              }}
                              title={`${(d.totalMinutes / 60).toFixed(1)}h`}
                            ></div>
                          </div>
                          <span className={`bar-label ${isToday ? 'active-label' : ''}`} style={{ fontSize: '10px', fontWeight: 800, color: isToday ? '#0059BB' : '#64748B', marginTop: '8px' }}>
                            {getDayLabel(d.date)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. TOP SUBJECTS CARD */}
              <div className="subjects-card">
                <div className="sub-header">
                  <h4>Study Time by Subject</h4>
                </div>
                <div className="sub-list">
                  {subjects.length === 0 ? (
                    <p style={{ color: '#94A3B8', fontSize: '13px' }}>No subjects recorded yet.</p>
                  ) : (
                    subjects.slice(0, 5).map((sub, i) => (
                      <div key={sub.subjectId} className="sub-item">
                        <div className="sub-left">
                          <div className={`sub-icon ${subjectThemes[i % 4]}`}>
                            <BookMarked size={18} />
                          </div>
                          <div className="sub-text">
                            <h5>{sub.subjectName}</h5>
                            <span>{sub.totalHours}h studied</span>
                          </div>
                        </div>
                        <ArrowRight size={16} color="#CBD5E1" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. FOCUS SCORE + GOAL PROGRESS CARD */}
              <div className="quote-card" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Zap size={20} />
                    <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1px', opacity: 0.8 }}>FOCUS SCORE</span>
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1 }}>{focusScore}</div>
                  <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px', lineHeight: 1.5 }}>
                    Average focus × duration across all sessions. Higher = better concentration.
                  </p>
                </div>

                {goalProgress.length > 0 && (
                  <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '20px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', opacity: 0.7 }}>ACTIVE GOAL</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>{goalProgress[0].actualHours}h / {goalProgress[0].targetHours}h</span>
                      <span style={{ fontSize: '20px', fontWeight: 800 }}>{goalProgress[0].percent}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${goalProgress[0].percent}%`, height: '100%', backgroundColor: '#fff', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                  <Quote size={16} style={{ opacity: 0.6, marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.6, opacity: 0.9, margin: 0 }}>
                    Efficiency is doing things right; effectiveness is doing the right things.
                  </p>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', opacity: 0.6, marginTop: '8px', display: 'block' }}>PETER DRUCKER</span>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
      <ChatBot />
    </div>
  );
};

export default Analytics;
