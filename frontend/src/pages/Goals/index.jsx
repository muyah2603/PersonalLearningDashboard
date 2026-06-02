import { useState, useEffect } from 'react';
import { Search, Clock, TrendingUp, PlusCircle, Calendar, X, AlertTriangle, CheckCircle } from 'lucide-react';
import AppLayout    from '../../components/AppLayout';
import './Goals.css';
import { getGoalProgress, createGoal, deleteGoal } from '../../services/goal.service';

const Goals = () => {
  const [goals,       setGoals]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState({ targetHours: '', targetMinutes: '', startDate: '', endDate: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmId,   setConfirmId]   = useState(null);

  const fetchData = async (signal) => {
    setError(null);
    try {
      const goalsRes = await getGoalProgress({ signal });
      setGoals(goalsRes.data ?? []);
    } catch (err) {
      if (err.name !== 'CanceledError')
        setError('Failed to load goals. Please try again.');
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
    if (h === 0 && m === 0) return alert('Please set a target time.');
    if (!form.startDate || !form.endDate) return alert('Please select start and end dates.');
    if (new Date(form.endDate) <= new Date(form.startDate)) return alert('End date must be after start date.');
    try {
      await createGoal({ targetHours: +(h + m / 60).toFixed(2), startDate: form.startDate, endDate: form.endDate });
      setShowModal(false);
      setForm({ targetHours: '', targetMinutes: '', startDate: '', endDate: '' });
      setLoading(true);
      const c = new AbortController();
      await fetchData(c.signal);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create goal');
    }
  };

  const handleDelete = (id) => setConfirmId(id);

  const handleDeleteConfirm = async () => {
    const id = confirmId;
    setConfirmId(null);
    try {
      await deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      setError('Failed to delete goal. Please try again.');
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
  const getTheme = (i) => ['theme-blue', 'theme-green', 'theme-purple'][i % 3];

  const q = searchQuery.toLowerCase().trim();
  const searchedGoals = q
    ? goals.filter(g =>
        formatTargetTime(g.targetHours).toLowerCase().includes(q) ||
        formatDate(g.startDate).toLowerCase().includes(q) ||
        formatDate(g.endDate).toLowerCase().includes(q) ||
        String(g.completionPercent).includes(q))
    : goals;

  const primaryGoal = searchedGoals[0] ?? null;
  const otherGoals  = searchedGoals.slice(1);

  const searchBarSlot = (
    <div className="search-bar">
      <Search size={16} color="#94A3B8" />
      <input
        type="text"
        placeholder="Search goals..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );

  return (
    <AppLayout searchBarSlot={searchBarSlot}>
      <div className="goals-wrapper">
        {error && (
          <div className="warning-banner">
            <AlertTriangle size={20} />
            <span>{error} <button onClick={() => { setLoading(true); const c = new AbortController(); fetchData(c.signal); }} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Retry</button></span>
          </div>
        )}

        <div className="goals-header">
          <div className="gh-left">
            <h2>Goals & Milestones</h2>
            <p>Set study targets and track your progress. Consistent effort leads to mastery.</p>
          </div>
          <button className="btn-new-goal" onClick={() => setShowModal(true)}>
            <PlusCircle size={18} /> Define New Goal
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="empty-state">
            <PlusCircle size={48} color="#CBD5E1" />
            <h3>No goals yet</h3>
            <p>Create your first study goal to start tracking your progress.</p>
            <button className="btn-new-goal" onClick={() => setShowModal(true)}><PlusCircle size={18} /> Create First Goal</button>
          </div>
        ) : (
          <>
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
                  <div className="bgc-fill" style={{ width: `${primaryGoal.completionPercent}%`, backgroundColor: primaryGoal.completionPercent >= 100 ? '#10B981' : '#0059BB' }} />
                </div>

                <div className="bgc-chips">
                  <div key="chip-days" className="chip">
                    <div className="chip-icon"><Clock size={22} color="#059669" /></div>
                    <div className="chip-text"><span>Days Remaining</span><b>{primaryGoal.daysRemaining} Days</b></div>
                  </div>
                  <div key="chip-sessions" className="chip">
                    <div className="chip-icon"><TrendingUp size={22} color="#0059BB" /></div>
                    <div className="chip-text"><span>Sessions Logged</span><b>{primaryGoal.sessionCount} Sessions</b></div>
                  </div>
                  <div key="chip-status" className="chip">
                    <div className="chip-icon">
                      {primaryGoal.completionPercent >= 100
                        ? <CheckCircle size={22} color="#10B981" />
                        : <Calendar size={22} color="#9333EA" />}
                    </div>
                    <div className="chip-text"><span>Status</span><b>{primaryGoal.completionPercent >= 100 ? 'Target Reached!' : 'In Progress'}</b></div>
                  </div>
                </div>

                <button className="btn-delete-goal" onClick={() => handleDelete(primaryGoal.id)}>Delete Goal</button>
              </div>
            )}

            {otherGoals.length > 0 && (
              <div className="small-goals-grid">
                {otherGoals.map((goal, i) => (
                  <div key={goal.id} className={`sm-card ${getTheme(i)}`}>
                    <div>
                      <div className="sm-header">
                        <div className="sm-icon"><PlusCircle size={20} /></div>
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
                        <div className="sm-fill" style={{ width: `${goal.completionPercent}%` }} />
                      </div>
                    </div>
                    <button className="btn-delete-sm" onClick={() => handleDelete(goal.id)}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmId && (
        <div className="modal-overlay" onClick={() => setConfirmId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle size={24} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Delete goal?</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.5 }}>This action cannot be undone. The goal and all its progress will be permanently deleted.</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirmId(null)}
                style={{ flex: 1, padding: '12px', borderRadius: 999, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{ flex: 1, padding: '12px', borderRadius: 999, border: 'none', background: '#EF4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <input type="number" min="0" placeholder="0" value={form.targetHours} onChange={(e) => setForm({ ...form, targetHours: e.target.value })} />
                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>hours</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type="number" min="0" max="59" placeholder="0" value={form.targetMinutes} onChange={(e) => setForm({ ...form, targetMinutes: e.target.value })} />
                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>mins</span>
                  </div>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-field">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div className="modal-field">
                  <label>End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="btn-new-goal" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                <PlusCircle size={18} /> Create Goal
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Goals;
