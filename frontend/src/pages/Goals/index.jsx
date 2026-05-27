import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Library, Landmark, LayoutDashboard, BookOpen, Target, BarChart2, User,
  Search, Clock, TrendingUp, PlusCircle, Calendar, X,
  AlertTriangle, CheckCircle, LifeBuoy, LogOut
} from 'lucide-react';
import BtnNewSession from '../../components/BtnNewSession';
import UserAvatar from '../../components/UserAvatar';
import NotificationBell from '../../components/NotificationBell';
import { getGoalProgress, checkWarning, createGoal, deleteGoal } from '../../services/goal.service';
import './Goals.css';
import { BrainCircuit } from 'lucide-react';
import ChatBot from '../../components/ChatBot';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [warning, setWarning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ targetHours: '', targetMinutes: '', startDate: '', endDate: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [goalsRes, warningRes] = await Promise.all([getGoalProgress(), checkWarning()]);
      setGoals(goalsRes.data);
      setWarning(warningRes.data);
    } catch (err) {
      console.error('Error fetching goals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const h = Number(form.targetHours) || 0;
    const m = Number(form.targetMinutes) || 0;
    if ((h === 0 && m === 0) || !form.startDate || !form.endDate) return;
    try {
      await createGoal({
        targetHours: +(h + m / 60).toFixed(2),
        startDate: form.startDate,
        endDate: form.endDate,
      });
      setShowModal(false);
      setForm({ targetHours: '', targetMinutes: '', startDate: '', endDate: '' });
      setLoading(true);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create goal');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await deleteGoal(id);
      setGoals(goals.filter(g => g._id !== id));
    } catch (err) {
      alert('Failed to delete goal');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatTargetTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const getTheme = (index) => {
    const themes = ['theme-blue', 'theme-green', 'theme-purple'];
    return themes[index % 3];
  };

  // Search filter
  const q = searchQuery.toLowerCase().trim();
  const searchedGoals = q 
    ? goals.filter(g => 
        formatTargetTime(g.targetHours).toLowerCase().includes(q) ||
        formatDate(g.startDate).toLowerCase().includes(q) ||
        formatDate(g.endDate).toLowerCase().includes(q) ||
        String(g.completionPercent).includes(q)
      )
    : goals;

  const primaryGoal = searchedGoals.length > 0 ? searchedGoals[0] : null;
  const otherGoals = searchedGoals.slice(1);

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
            <Link to="/goals" className="nav-item active"><Target size={18} /><span>Goals</span></Link>
            <Link to="/analytics" className="nav-item"><BarChart2 size={18} /><span>Analytics</span></Link>
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
            <input type="text" placeholder="Search goals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="top-right">
            <NotificationBell />
            <UserAvatar />
          </div>
        </header>

        <div className="goals-wrapper">
          {/* WARNING BANNER */}
          {warning?.warning && (
            <div className="warning-banner">
              <AlertTriangle size={20} />
              <span>{warning.message}</span>
            </div>
          )}

          <div className="goals-header">
            <div className="gh-left">
              <h2>Goals & Milestones</h2>
              <p>Set study targets and track your progress. Consistent effort leads to mastery.</p>
            </div>
            <button className="btn-new-goal" onClick={() => setShowModal(true)}>
              <PlusCircle size={18} />
              Define New Goal
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>Loading goals...</div>
          ) : goals.length === 0 ? (
            <div className="empty-state">
              <Target size={48} color="#CBD5E1" />
              <h3>No goals yet</h3>
              <p>Create your first study goal to start tracking your progress.</p>
              <button className="btn-new-goal" onClick={() => setShowModal(true)}>
                <PlusCircle size={18} /> Create First Goal
              </button>
            </div>
          ) : (
            <>
              {/* BIG GOAL CARD */}
              {primaryGoal && (
                <div className="big-goal-card">
                  <div className="bgc-header">
                    <div className="bgc-left">
                      <span className="tag">{primaryGoal.completionPercent >= 100 ? 'COMPLETED' : 'ACTIVE GOAL'}</span>
                      <h3>{formatTargetTime(primaryGoal.targetHours)} Target</h3>
                      <p style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>
                        {formatDate(primaryGoal.startDate)} — {formatDate(primaryGoal.endDate)}
                      </p>
                    </div>
                    <div className="bgc-right">
                      <span className="bgc-percent">{primaryGoal.completionPercent}%</span>
                      <span className="bgc-sub">{primaryGoal.actualHours}h / {formatTargetTime(primaryGoal.targetHours)}</span>
                    </div>
                  </div>

                  <div className="bgc-progress">
                    <div className="bgc-fill" style={{ width: `${primaryGoal.completionPercent}%`, backgroundColor: primaryGoal.completionPercent >= 100 ? '#10B981' : '#0059BB' }}></div>
                  </div>

                  <div className="bgc-chips">
                    <div className="chip">
                      <div className="chip-icon"><Clock size={22} color="#059669" /></div>
                      <div className="chip-text">
                        <span>Days Remaining</span>
                        <b>{primaryGoal.daysRemaining} Days</b>
                      </div>
                    </div>
                    <div className="chip">
                      <div className="chip-icon"><TrendingUp size={22} color="#0059BB" /></div>
                      <div className="chip-text">
                        <span>Sessions Logged</span>
                        <b>{primaryGoal.sessionCount} Sessions</b>
                      </div>
                    </div>
                    <div className="chip">
                      <div className="chip-icon">
                        {primaryGoal.completionPercent >= 100 
                          ? <CheckCircle size={22} color="#10B981" />
                          : <Calendar size={22} color="#9333EA" />
                        }
                      </div>
                      <div className="chip-text">
                        <span>Status</span>
                        <b>{primaryGoal.completionPercent >= 100 ? 'Target Reached!' : 'In Progress'}</b>
                      </div>
                    </div>
                  </div>

                  <button className="btn-delete-goal" onClick={() => handleDelete(primaryGoal._id)}>Delete Goal</button>
                </div>
              )}

              {/* OTHER GOALS GRID */}
              {otherGoals.length > 0 && (
                <div className="small-goals-grid">
                  {otherGoals.map((goal, i) => (
                    <div key={goal._id} className={`sm-card ${getTheme(i)}`}>
                      <div>
                        <div className="sm-header">
                          <div className="sm-icon"><Target size={20} /></div>
                          <span className="sm-tag">{goal.completionPercent >= 100 ? 'DONE' : 'ACTIVE'}</span>
                        </div>
                        <div className="sm-info">
                          <h4>{formatTargetTime(goal.targetHours)} Target</h4>
                          <p>{formatDate(goal.startDate)} — {formatDate(goal.endDate)}</p>
                        </div>
                      </div>
                      <div className="sm-progress-section">
                        <div className="sm-progress-info">
                          <span style={{ color: '#64748B' }}>{goal.actualHours}h / {formatTargetTime(goal.targetHours)}</span>
                          <span className="sm-val">{goal.completionPercent}%</span>
                        </div>
                        <div className="sm-track">
                          <div className="sm-fill" style={{ width: `${goal.completionPercent}%` }}></div>
                        </div>
                      </div>
                      <button className="btn-delete-sm" onClick={() => handleDelete(goal._id)}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* CREATE GOAL MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Define New Goal</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-field">
                <label>Target Time</label>
                <div className="modal-row">
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.targetHours}
                      onChange={(e) => setForm({ ...form, targetHours: e.target.value })}
                    />
                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>hours</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={form.targetMinutes}
                      onChange={(e) => setForm({ ...form, targetMinutes: e.target.value })}
                    />
                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>mins</span>
                  </div>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-field">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-field">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-new-goal" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                <PlusCircle size={18} /> Create Goal
              </button>
            </form>
          </div>
        </div>
      )}
        <ChatBot />
    </div>
  );
};

export default Goals;
