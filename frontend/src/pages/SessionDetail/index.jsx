import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, ArrowLeft, Clock } from 'lucide-react';
import AppLayout        from '../../components/AppLayout';
import { getSessionById, updateSession } from '../../services/session.service';
import '../NewSession/NewSession.css';
import './SessionDetail.css';

const focusLabels = {
  1: 'LEVEL 1: PASSIVE REVIEW',
  2: 'LEVEL 2: LIGHT ENGAGEMENT',
  3: 'LEVEL 3: ACTIVE RECALL',
  4: 'LEVEL 4: HYPERFOCUS',
  5: 'LEVEL 5: DEEP SYNTHESIS'
};

const SessionDetail = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [session,   setSession]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [timePassed, setTimePassed] = useState(0);
  const [isActive,  setIsActive]  = useState(false);
  const [isEnded,   setIsEnded]   = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res  = await getSessionById(id);
        const data = res.data;
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

  const totalSeconds = session
    ? Math.max(1, Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000))
    : 100;

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => setTimePassed(prev => prev + 1), 1000);
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
      alert('Target time reached! Session completed automatically.');
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
  const handlePause = () => { setIsActive(false); syncWithBackend(timePassed, false); };

  const formatTimeDigits = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const getLocalDate      = (d) => new Date(d).toISOString().substring(0, 10);
  const getLocalDateTime  = (d) => {
    const dt = new Date(d);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16);
  };

  if (loading) return <div style={{ padding: '40px' }}>Loading data...</div>;
  if (!session) return <div style={{ padding: '40px' }}>Session not found</div>;

  const progressPercent = Math.min(100, (timePassed / totalSeconds) * 100);

  return (
    <AppLayout>
      <div className="ns-header" style={{ padding: '0 40px 24px 40px' }}>
        <div>
          <button className="btn-back" onClick={() => navigate('/sessions')} style={{ marginBottom: 16 }}>
            <ArrowLeft size={16}/> Back
          </button>
          <h2>Study Sessions <span className="ns-breadcrumb">&gt; SESSION DETAIL</span></h2>
          <p>Review your session details and track your focus time.</p>
        </div>
      </div>

      <div className="ns-wrapper">
        {/* LEFT */}
        <div className="ns-left">
          <div className="ns-form-card">

            <div className="ns-row">
              <div className="ns-field">
                <label>Subject</label>
                <div className="ns-select-wrapper">
                  <select disabled value={session.subjectId?._id || ''}>
                    <option value={session.subjectId?._id}>{session.subjectId?.name || 'Unknown'}</option>
                  </select>
                  <div className="color-dot dot-navy" />
                </div>
              </div>
              <div className="ns-field">
                <label>Session Date</label>
                <input type="date" readOnly value={getLocalDate(session.startTime)} />
              </div>
            </div>

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

            <div className="ns-focus-section">
              <div className="ns-focus-header">
                <label>Cognitive Load / Focus Intensity</label>
                <span className="ns-focus-label">{focusLabels[session.focusLevel]}</span>
              </div>
              <div className="ns-focus-btns">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" className={`focus-btn ${session.focusLevel === n ? 'active' : ''}`} disabled>
                    {n}
                  </button>
                ))}
              </div>
              <div className="ns-focus-range">
                <span>PASSIVE REVIEW</span>
                <span>DEEP SYNTHESIS</span>
              </div>
            </div>

            <div className="ns-notes-section">
              <label>Session Goals & Research Hypothesis</label>
              <textarea readOnly rows={5} value={session.notes || 'No goals/notes set for this session.'} />
            </div>
          </div>
        </div>

        {/* RIGHT — Timer */}
        <div className="ns-right">
          <div className="timer-container">
            <h3 style={{ margin: 0, color: '#0F172A', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="#0D9488" /> Session Timer
            </h3>

            <div className="timer-display">
              <h1>{formatTimeDigits(timePassed)}</h1>

              <div style={{ width: '100%', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>
                  <span>{formatTimeDigits(timePassed)} (Elapsed)</span>
                  <span>{formatTimeDigits(totalSeconds)} (Target)</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: progressPercent >= 100 ? '#10B981' : '#0D9488', transition: 'width 1s linear' }} />
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

            <div className="timer-controls">
              {isEnded ? (
                <button className="btn-start" style={{ width: '100%', padding: '16px', justifyContent: 'center', backgroundColor: '#64748B', cursor: 'default', boxShadow: 'none' }} disabled>
                  Session Completed
                </button>
              ) : !isActive ? (
                <button className="btn-start" onClick={handleStart} style={{ width: '100%', padding: '16px', justifyContent: 'center' }}>
                  <Play size={20} /> {timePassed === 0 ? 'Start Session' : 'Resume'}
                </button>
              ) : (
                <button className="btn-pause" onClick={handlePause} style={{ width: '100%', padding: '16px', justifyContent: 'center' }}>
                  <Pause size={20} /> Pause
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SessionDetail;
