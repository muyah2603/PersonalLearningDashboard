import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Library, 
  Landmark,
  LayoutDashboard, 
  BookOpen, 
  Target, 
  BarChart2, 
  User, 
  Search, 
  Filter,
  Brain,
  TerminalSquare,
  Calendar,
  Clock,
  Zap,
  ArrowRight,
  Database,
  BrainCircuit
} from 'lucide-react';
import BtnNewSession from '../../components/BtnNewSession';
import UserAvatar from '../../components/UserAvatar';
import NotificationBell from '../../components/NotificationBell';
import { getSessions } from '../../services/session.service';
import './Sessions.css';
import ChatBot from '../../components/ChatBot';

const Sessions = () => {
  const [sessionData, setSessionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data } = await getSessions();
        setSessionData(data);
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const formatDuration = (start, end) => {
    const diffMins = Math.round((new Date(end) - new Date(start)) / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const formatTime = (start, end) => {
    const f = (val) => new Date(val).toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit', hour12: false });
    return `${f(start)} - ${f(end)}`;
  };

  const getThemeForSubject = (name = "") => {
    const mapping = {
      0: { theme: 'theme-blue', tagColor: 'tag-blue', icon: <TerminalSquare size={24} /> },
      1: { theme: 'theme-green', tagColor: 'tag-green', icon: <Brain size={24} /> },
      2: { theme: 'theme-blue', tagColor: 'tag-purple', icon: <Database size={24} /> }
    };
    return mapping[name.length % 3];
  };

  // Computations
  const now = new Date();

  // Lấy danh sách subject thật từ sessions (sắp xếp mới nhất trước)
  const sortedSessions = [...sessionData].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  const subjectNames = [...new Set(sortedSessions.map(s => s.subjectId?.name).filter(Boolean))];
  
  const displayedSubjects = subjectNames.slice(0, 2);
  const hiddenSubjects = subjectNames.slice(2);

  // Filter sessions theo subject + search
  const filteredSessions = sessionData.filter(s => {
    const matchSubject = activeFilter === 'all' || s.subjectId?.name === activeFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchSubject;
    const matchSearch = 
      (s.subjectId?.name || '').toLowerCase().includes(q) ||
      (s.notes || '').toLowerCase().includes(q);
    return matchSubject && matchSearch;
  });
  
  const weeklySessions = sessionData.filter(s => {
    const d = new Date(s.startTime);
    return now - d < 7 * 24 * 60 * 60 * 1000;
  });

  let totalActiveSeconds = 0;
  let totalProjectedSeconds = 0;
  let goalsCompleted = 0;

  weeklySessions.forEach(s => {
    const act = s.actualDuration || 0;
    const proj = Math.max(1, Math.round((new Date(s.endTime) - new Date(s.startTime)) / 1000));
    totalActiveSeconds += act;
    totalProjectedSeconds += proj;
    if (act >= proj * 0.9) goalsCompleted++;
  });

  const focusEfficiency = totalProjectedSeconds > 0 ? Math.min(100, Math.round((totalActiveSeconds / totalProjectedSeconds) * 100)) : 0;
  const activeLearningHrs = (totalActiveSeconds / 3600).toFixed(1);
  const goalCompletion = weeklySessions.length > 0 ? Math.round((goalsCompleted / weeklySessions.length) * 100) : 0;

  const upcomingSessions = sessionData.filter(s => new Date(s.startTime) > now && !s.isEnded)
     .sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
  const nextScheduled = upcomingSessions.length > 0 ? upcomingSessions[0] : null;

  const formatUpcomingDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit', hour12: false });
    
    if (d.toDateString() === today.toDateString()) return `Today, ${timeStr}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${timeStr}`;
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}, ${timeStr}`;
  };

  const hourCounts = new Array(24).fill(0);
  sessionData.forEach(s => {
    if (s.actualDuration > 0) {
      hourCounts[new Date(s.startTime).getHours()]++;
    }
  });
  let peakHour = 0;
  let maxCount = 0;
  hourCounts.forEach((cnt, idx) => {
    if (cnt > maxCount) { maxCount = cnt; peakHour = idx; }
  });
  const peakTimeOfDay = peakHour < 12 ? 'morning' : peakHour < 18 ? 'afternoon' : 'evening';

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-logo">
            <div className="logo-icon">
              <Landmark size={20} color="white" />
            </div>
            <span className="brand-text">Learning</span>
          </div>

          <nav className="nav-menu">
            <Link to="/dashboard" className="nav-item">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link to="/sessions" className="nav-item active">
              <BookOpen size={18} />
              <span>Sessions</span>
            </Link>
            <Link to="/goals" className="nav-item">
              <Target size={18} />
              <span>Goals</span>
            </Link>
            <Link to="/analytics" className="nav-item">
              <BarChart2 size={18} />
              <span>Analytics</span>
            </Link>
            <Link to="/profile" className="nav-item">
              <User size={18} />
              <span>Profile</span>
            </Link>
            <Link to="/ai-coach" className="nav-item"><BrainCircuit size={18} /><span>AI Coach</span></Link>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <BtnNewSession />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* TOP NAVBAR */}
        <header className="top-navbar">
          <div className="search-bar">
            <Search size={16} color="#94A3B8" />
            <input type="text" placeholder="Search sessions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="top-right">
            <NotificationBell />
            <UserAvatar />
          </div>
        </header>

        {/* SESSIONS CONTENT */}
        <div className="sessions-wrapper">
          <div className="sessions-header">
            <div className="sh-left">
              <h2>Study Sessions</h2>
              <p>Your chronological map of cognitive growth and mastery.</p>
            </div>
            <div className="filter-pills">
              <button className={`pill ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}><Filter size={14}/> All Subjects</button>
              {displayedSubjects.map(name => (
                <button key={name} className={`pill ${activeFilter === name ? 'active' : ''}`} onClick={() => setActiveFilter(name)}>{name}</button>
              ))}
              {hiddenSubjects.length > 0 && (
                <select 
                  className={`pill dropdown-filter ${hiddenSubjects.includes(activeFilter) ? 'active' : ''}`}
                  value={hiddenSubjects.includes(activeFilter) ? activeFilter : ""}
                  onChange={(e) => setActiveFilter(e.target.value)}
                >
                  <option value="" disabled>More subjects...</option>
                  {hiddenSubjects.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="sessions-main-grid">
            {/* LEFT COLUMN: HISTORY LIST */}
            <div className="session-list">
              {loading ? (
                <p>Loading sessions...</p>
              ) : filteredSessions.length === 0 ? (
                <p>No study sessions found. Start a new session!</p>
              ) : filteredSessions.map(session => {
                const subjectName = session.subjectId?.name || 'Unknown Subject';
                const styleOpts = getThemeForSubject(subjectName);
                return (
                  <Link to={`/sessions/${session._id}`} key={session._id} style={{ textDecoration: 'none' }}>
                    <div className={`session-card ${styleOpts.theme}`}>
                      <div className="sc-icon">
                        {styleOpts.icon}
                      </div>
                      <div className="sc-content">
                        <span className={`tag-pill ${styleOpts.tagColor}`}>{subjectName.toUpperCase().substring(0, 15)}</span>
                        <h4>{subjectName}</h4>
                        <div className="sc-meta">
                          <span><Calendar size={12}/> {formatDate(session.startTime)}</span>
                          <span><Clock size={12}/> {formatTime(session.startTime, session.endTime)}</span>
                        </div>
                      </div>
                      <div className="sc-right">
                        <span className="duration">{formatDuration(session.startTime, session.endTime)}</span>
                        <span className="focus-lvl"><Zap size={12} fill="currentColor"/> LEVEL {session.focusLevel} FOCUS</span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              <div className="view-archive-row">
                <button className="btn-view-archive">
                  View Session Archive <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: STATS */}
            <div className="stats-column">
              {/* Mastery Card */}
              <div className="grey-card">
                <h4>Weekly Mastery</h4>
                <div className="mastery-bars">
                  <div className="m-bar-group">
                    <div className="m-labels">
                      <span className="m-title">Focus Efficiency</span>
                      <span className="m-val val-green">{focusEfficiency}%</span>
                    </div>
                    <div className="m-track"><div className="m-fill fill-green" style={{ width: `${focusEfficiency}%` }}></div></div>
                  </div>

                  <div className="m-bar-group">
                    <div className="m-labels">
                      <span className="m-title">Active Learning</span>
                      <span className="m-val val-blue">{activeLearningHrs} hrs</span>
                    </div>
                    <div className="m-track"><div className="m-fill fill-blue" style={{ width: `${Math.min(100, (activeLearningHrs / 20) * 100)}%` }}></div></div>
                  </div>

                  <div className="m-bar-group">
                    <div className="m-labels">
                      <span className="m-title">Goal Completion</span>
                      <span className="m-val val-purple">{goalCompletion}%</span>
                    </div>
                    <div className="m-track"><div className="m-fill fill-purple" style={{ width: `${goalCompletion}%` }}></div></div>
                  </div>
                </div>
              </div>

              {/* Next Scheduled */}
              <div className="grey-card next-sch">
                <h4>NEXT SCHEDULED</h4>
                {nextScheduled ? (
                  <div className="sch-item">
                    <div className="sch-icon">{getThemeForSubject(nextScheduled.subjectId?.name).icon}</div>
                    <div className="sch-info">
                      <b>{nextScheduled.subjectId?.name || 'Unknown'}</b>
                      <span>{formatUpcomingDate(nextScheduled.startTime)}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#64748B', fontSize: '13px', paddingTop: '12px', margin: 0 }}>No upcoming sessions planned.</p>
                )}
              </div>

              {/* Peak Focus Hour */}
              <div className="blue-card">
                <h4>Peak Focus Hour</h4>
                <p>Based on your session history, you are most effective in the {peakTimeOfDay}.</p>
                
                <div style={{flex: 1}}></div>
                <div className="peak-chart">
                  <div className="p-bar" style={{height: peakHour >= 6 && peakHour <= 9 ? '80px' : '30px', opacity: peakHour >= 6 && peakHour <= 9 ? 1 : 0.4}}></div>
                  <div className="p-bar" style={{height: peakHour > 9 && peakHour <= 12 ? '80px' : '50px', opacity: peakHour > 9 && peakHour <= 12 ? 1 : 0.4}}></div>
                  <div className="p-bar" style={{height: peakHour > 12 && peakHour <= 15 ? '80px' : '40px', opacity: peakHour > 12 && peakHour <= 15 ? 1 : 0.4}}></div>
                  <div className="p-bar" style={{height: peakHour > 15 && peakHour <= 18 ? '80px' : '60px', opacity: peakHour > 15 && peakHour <= 18 ? 1 : 0.4}}></div>
                  <div className="p-bar" style={{height: peakHour > 18 && peakHour <= 21 ? '80px' : '40px', opacity: peakHour > 18 && peakHour <= 21 ? 1 : 0.4}}></div>
                  <div className="p-bar" style={{height: peakHour > 21 || peakHour < 6 ? '80px' : '20px', opacity: peakHour > 21 || peakHour < 6 ? 1 : 0.4}}></div>
                </div>
                <div className="p-axis">
                  <span>08:00</span>
                  <span>14:00</span>
                  <span>20:00</span>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </main>
      <ChatBot />
    </div>
  );
};

export default Sessions;
