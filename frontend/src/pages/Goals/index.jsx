import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Landmark, LayoutDashboard, BookOpen, Target, BarChart2, User,
  Search, Clock, TrendingUp, PlusCircle, Calendar, X,
  AlertTriangle, CheckCircle, LifeBuoy, LogOut, BrainCircuit
} from 'lucide-react';
import BtnNewSession    from '../../components/BtnNewSession';
import UserAvatar       from '../../components/UserAvatar';
import NotificationBell from '../../components/NotificationBell';
import ChatBot          from '../../components/ChatBot';
import { useAuth }      from '../../context/AuthContext';
import { getGoalProgress, checkWarning, createGoal, deleteGoal } from '../../services/goal.service';
import './Goals.css';

const Goals = () => {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const [goals,       setGoals]       = useState([]);
  const [warning,     setWarning]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState({ targetHours: '', targetMinutes: '', startDate: '', endDate: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async (signal) => {
    setError(null);
    try {
      const [goalsRes, warningRes] = await Promise.all([
        getGoalProgress({ signal }),
        checkWarning(   { signal }),
      ]);
      setGoals(goalsRes.data.data ?? goalsRes.data);
      setWarning(warningRes.data.data ?? warningRes.data);
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setError('Failed to load goals. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const h = Number(form.targetHours)   || 0;
    const m = Number(form.targetMinutes) || 0;

    if (h === 0 && m === 0)
      return alert('Please set a target time.');
    if (!form.startDate || !form.endDate)
      return alert('Please select start and end dates.');
    if (new Date(form.endDate) <= new Date(form.startDate))
      return alert('End date must be after start date.');

    try {
      await createGoal({
        targetHours: +(h + m / 60).toFixed(2),
        startDate:   form.startDate,
        endDate:     form.endDate,
      });
      setShowModal(false);
      setForm({ targetHours: '', targetMinutes: '', startDate: '', endDate: '' });
      setLoading(true);
      const controller = new AbortController();
      await fetchData(controller.signal);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create goal');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await deleteGoal(id);
      setGoals(prev => prev.filter(g => g._id !== id));
    } catch (err) {
      alert('Failed to delete goal');
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatTargetTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const getTheme = (i) => ['theme-blue', 'theme-green', 'theme-purple'][i % 3];

  const q = searchQuery.toLowerCase().trim();
  const searchedGoals = q
    ? goals.filter(g =>
        formatTargetTime(g.targetHours).toLowerCase().includes(q) ||
        formatDate(g.startDate).toLowerCase().includes(q) ||
        formatDate(g.endDate).toLowerCase().includes(q) ||
        String(g.completionPercent).includes(q)
      )
    : goals;

  const primaryGoal = searchedGoals[0] ?? null;
  const otherGoals  = searchedGoals.slice(1);

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
            <Link to="/sessions"  className="nav-item"><BookOpen size={18} /><span>Sessions</span></Link>
            <Link to="/goals"     className="nav-item active"><Target size={18} /><span>Goals</span></Link>
            <Link to="/analytics" className="nav-item"><BarChart2 size={18} /><span>Analytics</span></Link>
            <Link to="/profile"   className="nav-item"><User size={18} /><span>Profile</span></Link>
            <Link to="/ai-coach"  className="nav-item"><BrainCircuit size={18} /><span>AI Coach</span></Link>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <BtnNewSession />
          <div className="sidebar-links">
            <Link to="/support" className="sb-link"><LifeBuoy size={16} /> Support</Link>
            <button className="sb-link" onClick={handleSignOut}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="top-navbar">
          <div className="search-bar">
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search goals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="top-right">
            <NotificationBell />
            <UserAvatar />
          </div>
        </header>

        <div className="goals-wrapper">
          {warning?.warning && (
            <div className="warning-banner">
              <AlertTriangle size={20} />
              <div><strong>Warning:</strong> {warning.message}</div>
            </div>
          )}

          {error && (
            <div className="warning-banner">
              <AlertTriangle size={20} />
              <div>
                {error}
                <button
                  onClick={() => { setLoading(true); const c = new AbortController(); fetchData(c.signal); }}
                  style={{ marginLeft: '12px', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <div className="goals-header">
            <div>
              <h1>Learning Goals</h1>
              <p>Track your study targets and progress</p>
            </div>
            <button className="new-goal-btn" onClick={() => setShowModal(true)}>
              <PlusCircle size={18} /> New Goal
            </button>
          </div>

          {loading ? (
            <div className="loading-state">Loading goals...</div>
          ) : searchedGoals.length === 0 ? (
            <div className="empty-state">
              <Target size={48} />
              <h3>No goals found</h3>
              <p>Create your first learning goal.</p>
            </div>
          ) : (
            <>
              {primaryGoal && (
                <div className={`goal-highlight-card ${getTheme(0)}`}>
                  <div className="goal-card-top">
                    <div className="goal-main-info">
                      <div className="goal-icon-circle"><Target size={24} /></div>
                      <div>
                        <span className="goal-badge">MAIN GOAL</span>
                        <h2>{formatTargetTime(primaryGoal.targetHours)}</h2>
                        <p>{formatDate(primaryGoal.startDate)} — {formatDate(primaryGoal.endDate)}</p>
                      </div>
                    </div>
                    <button className="delete-goal-btn" onClick={() => handleDelete(primaryGoal._id)}>
                      <X size={16} />
                    </button>
                  </div>

                  <div className="goal-progress-block">
                    <div className="progress-info">
                      <span>Completion</span>
                      <span>{primaryGoal.completionPercent}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${primaryGoal.completionPercent}%` }} />
                    </div>
                    <div className="goal-stats-row">
                      <div className="goal-stat"><Clock size={16} /><span>{primaryGoal.actualHours || 0}h studied</span></div>
                      <div className="goal-stat"><TrendingUp size={16} /><span>{primaryGoal.remainingHours || 0}h left</span></div>
                      <div className="goal-stat"><Calendar size={16} /><span>{primaryGoal.daysRemaining || 0} days left</span></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="goals-grid">
                {otherGoals.map((goal, i) => (
                  <div key={goal._id} className={`goal-card ${getTheme(i + 1)}`}>
                    <div className="goal-card-header">
                      <div className="goal-card-title">
                        <BookOpen size={18} />
                        <h3>{formatTargetTime(goal.targetHours)}</h3>
                      </div>
                      <button className="delete-goal-btn" onClick={() => handleDelete(goal._id)}>
                        <X size={16} />
                      </button>
                    </div>
                    <div className="goal-card-body">
                      <div className="goal-date">{formatDate(goal.startDate)} — {formatDate(goal.endDate)}</div>
                      <div className="goal-progress-block">
                        <div className="progress-info">
                          <span>Progress</span>
                          <span>{goal.completionPercent}%</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${goal.completionPercent}%` }} />
                        </div>
                      </div>
                      <div className="goal-meta">
                        <div className="goal-meta-item"><Clock size={14} /><span>{goal.actualHours || 0}h</span></div>
                        <div className="goal-meta-item"><CheckCircle size={14} /><span>{goal.remainingHours || 0}h left</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {showModal && (
            <div className="modal-overlay">
              <div className="goal-modal">
                <div className="modal-header">
                  <h2>Create Goal</h2>
                  <button className="close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
                </div>
                <form onSubmit={handleCreate}>
                  <div className="form-group">
                    <label>Target Hours</label>
                    <input type="number" min="0" value={form.targetHours}
                      onChange={(e) => setForm({ ...form, targetHours: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Target Minutes</label>
                    <input type="number" min="0" max="59" value={form.targetMinutes}
                      onChange={(e) => setForm({ ...form, targetMinutes: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                  <button type="submit" className="submit-btn">Create Goal</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <ChatBot />
    </div>
  );
};

export default Goals;