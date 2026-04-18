import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Library, Landmark, LayoutDashboard, BookOpen, Target, BarChart2, User,
  Play, Pause, Square, ArrowLeft, Clock, Search, Bell, LogOut, LifeBuoy
} from 'lucide-react';
import { getSessionById, updateSession } from '../../services/session.service';
import UserAvatar from '../../components/UserAvatar';
import BtnNewSession from '../../components/BtnNewSession';
import '../NewSession/NewSession.css'; // Reusing NewSession styles
import './SessionDetail.css';

const focusLabels = {
  1: 'LEVEL 1: PASSIVE REVIEW',
  2: 'LEVEL 2: LIGHT ENGAGEMENT',
  3: 'LEVEL 3: ACTIVE RECALL',
  4: 'LEVEL 4: HYPERFOCUS',
  5: 'LEVEL 5: DEEP SYNTHESIS'
};

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [timePassed, setTimePassed] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await getSessionById(id);
        setSession(data);
        if (data.actualDuration) setTimePassed(data.actualDuration);
        if (data.isEnded) setIsEnded(true);
      } catch (err) {
        console.error('Error fetching session', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [id]);

  const totalSeconds = session ? Math.max(1, Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000)) : 100;

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimePassed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  useEffect(() => {
    if (isActive && timePassed >= totalSeconds) {
      clearInterval(timerRef.current);
      setIsActive(false);
      setIsEnded(true);
      syncWithBackend(timePassed, true);
      alert(`Target time reached! Session completed automatically.`);
    }
  }, [timePassed, isActive, totalSeconds]);

  const syncWithBackend = async (currentPassed, ended = false) => {
    try {
      await updateSession(id, { actualDuration: currentPassed, isEnded: ended });
    } catch (e) {
      console.error('Failed to sync session progress', e);
    }
  };

  const handleStart = () => setIsActive(true);
  const handlePause = () => {
    setIsActive(false);
    syncWithBackend(timePassed, false);
  };

  const formatTimeDigits = (totalSecondsAmt) => {
    const hrs = Math.floor(totalSecondsAmt / 3600);
    const mins = Math.floor((totalSecondsAmt % 3600) / 60);
    const secs = totalSecondsAmt % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getLocalDate = (d) => new Date(d).toISOString().substring(0, 10);
  const getLocalDateTime = (d) => {
    const dt = new Date(d);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0,16);
  };

  if (loading) return <div style={{padding: '40px'}}>Loading data...</div>;
  if (!session) return <div style={{padding: '40px'}}>Session not found</div>;

  const progressPercent = Math.min(100, (timePassed / totalSeconds) * 100);

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
            <Link to="/dashboard" className="nav-item">
              <LayoutDashboard size={18} /><span>Dashboard</span>
            </Link>
            <Link to="/sessions" className="nav-item active">
              <BookOpen size={18} /><span>Sessions</span>
            </Link>
            <Link to="/goals" className="nav-item">
              <Target size={18} /><span>Goals</span>
            </Link>
            <Link to="/analytics" className="nav-item">
              <BarChart2 size={18} /><span>Analytics</span>
            </Link>
            <Link to="/profile" className="nav-item">
              <User size={18} /><span>Profile</span>
            </Link>
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

      {/* MAIN */}
      <main className="main-content">
        <header className="top-navbar">
          <div className="search-bar">
            <Search size={16} color="#94A3B8" />
            <input type="text" placeholder="Search sessions..." />
          </div>
          <div className="top-right"><UserAvatar /></div>
        </header>

        <div className="ns-header" style={{ padding: '0 40px 24px 40px' }}>
          <div>
            <button className="btn-back" onClick={() => navigate('/sessions')} style={{marginBottom: 16}}>
              <ArrowLeft size={16}/> Back
            </button>
            <h2>Study Sessions <span className="ns-breadcrumb">&gt; SESSION DETAIL</span></h2>
            <p>Review your session details and track your focus time.</p>
          </div>
        </div>

        <div className="ns-wrapper">
          {/* LEFT */}
          <div className="ns-left">
            {/* FORM CARD */}
            <div className="ns-form-card">

              {/* Row 1 */}
              <div className="ns-row">
                <div className="ns-field">
                  <label>Subject</label>
                  <div className="ns-select-wrapper">
                    <select disabled value={session.subjectId?._id || ''}>
                      <option value={session.subjectId?._id}>{session.subjectId?.name || 'Unknown'}</option>
                    </select>
                    <div className="color-dot dot-navy"></div>
                  </div>
                </div>
                <div className="ns-field">
                  <label>Session Date</label>
                  <input type="date" readOnly value={getLocalDate(session.startTime)} />
                </div>
              </div>

              {/* Row 2 */}
              <div className="ns-row">
                <div className="ns-field">
                  <label>Start Time</label>
                  <input type="datetime-local" readOnly value={getLocalDateTime(session.startTime)} />
                </div>
                <div className="ns-field">
                  <label>End Time (Projected)</label>
                  <input type="datetime-local" readOnly value={getLocalDateTime(session.endTime)} />
                </div>
              </div>

              {/* Focus Level */}
              <div className="ns-focus-section">
                <div className="ns-focus-header">
                  <label>Cognitive Load / Focus Intensity</label>
                  <span className="ns-focus-label">{focusLabels[session.focusLevel]}</span>
                </div>
                <div className="ns-focus-btns">
                  {[1,2,3,4,5].map(n => (
                    <button 
                      key={n} 
                      type="button"
                      className={`focus-btn ${session.focusLevel === n ? 'active' : ''}`}
                      disabled
                    >{n}</button>
                  ))}
                </div>
                <div className="ns-focus-range">
                  <span>PASSIVE REVIEW</span>
                  <span>DEEP SYNTHESIS</span>
                </div>
              </div>

              {/* Notes */}
              <div className="ns-notes-section">
                <label>Session Goals & Research Hypothesis</label>
                <textarea 
                  name="notes" 
                  readOnly
                  value={session.notes || 'No goals/notes set for this session.'}
                  rows={5}
                ></textarea>
              </div>

            </div>
          </div>

          {/* RIGHT COL - TIMER */}
          <div className="ns-right">
            <div className="timer-container" style={{ position: 'sticky', top: '24px', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '24px', borderRadius: '24px', backgroundColor: 'white', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: 0, color: '#0F172A', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#0D9488" /> Session Timer
              </h3>
              
              <div className="timer-display" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                 <h1 style={{ fontSize: '56px', margin: 0, fontFamily: 'monospace', color: '#1E293B', letterSpacing: '-1px' }}>{formatTimeDigits(timePassed)}</h1>
                
                {/* Progress Bar */}
                <div style={{ width: '100%', marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>
                    <span>{formatTimeDigits(timePassed)} (Elapsed)</span>
                    <span>{formatTimeDigits(totalSeconds)} (Target)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: progressPercent >= 100 ? '#10B981' : '#0D9488', transition: 'width 1s linear' }}></div>
                  </div>
                  {timePassed > 0 && timePassed < totalSeconds && (
                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#0D9488', fontWeight: '600', margin: '8px 0' }}>
                       {formatTimeDigits(totalSeconds - timePassed)} remaining
                    </div>
                  )}
                  {timePassed >= totalSeconds && (
                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#10B981', fontWeight: '600', margin: '8px 0' }}>
                       🎉 Target time reached!
                    </div>
                  )}
                </div>
              </div>

              <div className="timer-controls" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                {isEnded ? (
                  <button className="btn-start" style={{ width: '100%', padding: '16px', justifyContent: 'center', backgroundColor: '#64748B', cursor: 'default', boxShadow: 'none' }} disabled>
                    Session Completed
                  </button>
                ) : (
                  <>
                    {!isActive ? (
                      <button className="btn-start" onClick={handleStart} style={{ width: '100%', padding: '16px', justifyContent: 'center' }}>
                        <Play size={20} />
                        {timePassed === 0 ? 'Start Session' : 'Resume'}
                      </button>
                    ) : (
                      <button className="btn-pause" onClick={handlePause} style={{ width: '100%', padding: '16px', justifyContent: 'center' }}>
                        <Pause size={20} /> Pause
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SessionDetail;
