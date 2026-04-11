import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Library, Landmark, LayoutDashboard, BookOpen, Target, BarChart2, User,
  Search, Bell, Plus, Save, LifeBuoy, LogOut, BookMarked
} from 'lucide-react';
import UserAvatar from '../../components/UserAvatar';
import BtnNewSession from '../../components/BtnNewSession';
import { getSubjects, createSubject } from '../../services/subject.service';
import { createSession } from '../../services/session.service';
import './NewSession.css';

const focusLabels = {
  1: 'LEVEL 1: PASSIVE REVIEW',
  2: 'LEVEL 2: LIGHT ENGAGEMENT',
  3: 'LEVEL 3: ACTIVE RECALL',
  4: 'LEVEL 4: HYPERFOCUS',
  5: 'LEVEL 5: DEEP SYNTHESIS'
};

const NewSession = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const showToastMsg = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const [subjectLoading, setSubjectLoading] = useState(false);
  const [newSubjectForm, setNewSubjectForm] = useState({ name: '', description: '', targetHours: '' });

  const [form, setForm] = useState({
    subjectId: '',
    sessionDate: new Date().toISOString().substring(0, 10),
    startTime: '',
    endTime: '',
    focusLevel: 1,
    notes: ''
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data } = await getSubjects();
        setSubjects(data);
        if (data.length > 0) {
          setForm(prev => ({ ...prev, subjectId: data[0]._id }));
        }
      } catch (err) {
        console.error('Error loading subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNewSubjectChange = (e) => {
    let { name, value } = e.target;
    if (name === 'targetHours') {
      value = value.replace(/[^0-9]/g, '');
    }
    setNewSubjectForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubject = async () => {
    const newName = newSubjectForm.name.trim();
    if (!newName) {
      showToastMsg('Please enter subject name', 'error');
      return;
    }

    const isDuplicate = subjects.some(
      (sub) => sub.name.trim().toLowerCase() === newName.toLowerCase()
    );

    if (isDuplicate) {
      showToastMsg('Subject name already exists', 'error');
      return;
    }

    setSubjectLoading(true);
    try {
      const payload = {
        name: newName,
        ...(newSubjectForm.description && { description: newSubjectForm.description.trim() }),
        ...(newSubjectForm.targetHours && { targetHours: Number(newSubjectForm.targetHours) })
      };
      const { data } = await createSubject(payload);
      setSubjects(prev => [...prev, data]);
      setForm(prev => ({ ...prev, subjectId: data._id }));
      setNewSubjectForm({ name: '', description: '', targetHours: '' });
      showToastMsg(`Added subject "${data.name}"`, 'success');
    } catch (err) {
      showToastMsg(err.response?.data?.message || 'Error creating subject', 'error');
    } finally {
      setSubjectLoading(false);
    }
  };

  const handleFocus = (level) => {
    setForm(prev => ({ ...prev, focusLevel: level }));
  };

  const handleSaveSession = async () => {
    if (!form.subjectId || !form.startTime || !form.endTime) {
      setErrorMsg('Please fill in Subject, Start Time, and End Time');
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setErrorMsg('End time must be after start time');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    try {
      await createSession({
        subjectId: form.subjectId,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        focusLevel: form.focusLevel,
        notes: form.notes
      });
      showToastMsg('Session saved successfully!', 'success');
      setTimeout(() => navigate('/sessions'), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {toast.show && (
        <div className={`ns-toast ns-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
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
          <div className="top-right">
            <button className="icon-btn"><Bell size={20} color="#64748B" /></button>
            <UserAvatar />
          </div>
        </header>

        <div className="ns-header" style={{ padding: '0 40px 24px 40px' }}>
          <div>
            <h2>Study Sessions <span className="ns-breadcrumb">&gt; NEW SESSION</span></h2>
            <p>Your chronological map of cognitive growth and mastery.</p>
            {errorMsg && <p style={{ color: '#DC2626', marginTop: '10px', fontSize: '14px', fontWeight: '500' }}>{errorMsg}</p>}
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
                    <select name="subjectId" value={form.subjectId} onChange={handleChange}>
                      {subjects.length === 0 ? (
                        <option value="">No subject available (Please create in Goal / Dashboard)</option>
                      ) : (
                        subjects.map(sub => (
                          <option key={sub._id} value={sub._id}>{sub.name}</option>
                        ))
                      )}
                    </select>
                    <div className="color-dot dot-navy"></div>
                  </div>
                </div>
                <div className="ns-field">
                  <label>Session Date</label>
                  <input type="date" name="sessionDate" value={form.sessionDate} onChange={handleChange}/>
                </div>
              </div>

              {/* Row 2 */}
              <div className="ns-row">
                <div className="ns-field">
                  <label>Start Time</label>
                  <input type="datetime-local" name="startTime" value={form.startTime} onChange={handleChange}/>
                </div>
                <div className="ns-field">
                  <label>End Time (Projected)</label>
                  <input type="datetime-local" name="endTime" value={form.endTime} onChange={handleChange}/>
                </div>
              </div>

              {/* Focus Level */}
              <div className="ns-focus-section">
                <div className="ns-focus-header">
                  <label>Cognitive Load / Focus Intensity</label>
                  <span className="ns-focus-label">{focusLabels[form.focusLevel]}</span>
                </div>
                <div className="ns-focus-btns">
                  {[1,2,3,4,5].map(n => (
                    <button 
                      key={n} 
                      type="button"
                      className={`focus-btn ${form.focusLevel === n ? 'active' : ''}`}
                      onClick={() => handleFocus(n)}
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
                  placeholder="Outline the specific questions you intend to answer or the synthesis goals for this session..."
                  value={form.notes}
                  onChange={handleChange}
                  rows={5}
                ></textarea>
              </div>

              {/* Actions */}
              <div className="ns-actions">
                <button type="button" className="btn-cancel" onClick={() => navigate('/sessions')}>Cancel</button>
                <button type="button" className="btn-save-session" onClick={handleSaveSession} disabled={loading}>
                  <Save size={16}/>
                  {loading ? 'Saving...' : 'Save Session'}
                </button>
              </div>
            </div>

            <div className="ns-archive-row">
              <button className="btn-view-archive" onClick={() => navigate('/sessions')}>
                View Session Archive →
              </button>
            </div>
          </div>

          {/* RIGHT — Form thêm môn học */}
          <div className="ns-right">
            <div className="ns-add-subject-card">
              <div className="ns-add-subject-header">
                <BookMarked size={18} />
                <h3>Add New Subject</h3>
              </div>

              <div className="ns-field">
                <label>Subject Name <span className="ns-required">*</span></label>
                <input
                  type="text"
                  name="name"
                  placeholder="Ex: Data Structures"
                  value={newSubjectForm.name}
                  onChange={handleNewSubjectChange}
                />
              </div>

              <div className="ns-field">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Short description of the subject..."
                  value={newSubjectForm.description}
                  onChange={handleNewSubjectChange}
                  rows={3}
                />
              </div>

              <div className="ns-field">
                <label>Target Hours</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="targetHours"
                  placeholder="Ex: 50"
                  value={newSubjectForm.targetHours}
                  onChange={handleNewSubjectChange}
                />
              </div>

              <button
                type="button"
                className="btn-add-subject"
                onClick={handleCreateSubject}
                disabled={subjectLoading}
              >
                <Plus size={16} />
                {subjectLoading ? 'Adding...' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewSession;
