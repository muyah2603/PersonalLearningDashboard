import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Save, BookMarked } from 'lucide-react';
import AppLayout        from '../../components/AppLayout';
import { getSubjects, createSubject } from '../../services/subject.service';
import { createSession }              from '../../services/session.service';
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

  const [subjects,        setSubjects]        = useState([]);
  const [toast,           setToast]           = useState({ show: false, message: '', type: 'success' });
  const [loading,         setLoading]         = useState(false);
  const [errorMsg,        setErrorMsg]        = useState('');
  const [subjectLoading,  setSubjectLoading]  = useState(false);
  const [newSubjectForm,  setNewSubjectForm]  = useState({ name: '', description: '', targetHours: '' });

  const [form, setForm] = useState({
    subjectId:   '',
    sessionDate: new Date().toISOString().substring(0, 10),
    startTime:   '',
    endTime:     '',
    focusLevel:  1,
    notes:       ''
  });

  const showToastMsg = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await getSubjects();
        const data = res.data ?? [];
        setSubjects(data);
        if (data.length > 0) setForm(prev => ({ ...prev, subjectId: data[0]._id }));
      } catch (err) {
        console.error('Error loading subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleNewSubjectChange = (e) => {
    let { name, value } = e.target;
    if (name === 'targetHours') value = value.replace(/[^0-9]/g, '');
    setNewSubjectForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubject = async () => {
    const newName = newSubjectForm.name.trim();
    if (!newName) { showToastMsg('Please enter subject name', 'error'); return; }

    const isDuplicate = subjects.some(s => s.name.trim().toLowerCase() === newName.toLowerCase());
    if (isDuplicate) { showToastMsg('Subject name already exists', 'error'); return; }

    setSubjectLoading(true);
    try {
      const payload = {
        name: newName,
        ...(newSubjectForm.description  && { description:  newSubjectForm.description.trim() }),
        ...(newSubjectForm.targetHours  && { targetHours:  Number(newSubjectForm.targetHours) }),
      };
      const res  = await createSubject(payload);
      const data = res.data ?? res;
      setSubjects(prev => [...prev, data]);
      setForm(prev => ({ ...prev, subjectId: data._id }));
      setNewSubjectForm({ name: '', description: '', targetHours: '' });
      showToastMsg(`Added subject "${data.name}"`, 'success');
    } catch (err) {
      showToastMsg(err.response?.data?.error?.message || 'Error creating subject', 'error');
    } finally {
      setSubjectLoading(false);
    }
  };

  const handleFocus = (level) => setForm(prev => ({ ...prev, focusLevel: level }));

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
        subjectId:  form.subjectId,
        startTime:  new Date(form.startTime).toISOString(),
        endTime:    new Date(form.endTime).toISOString(),
        focusLevel: Number(form.focusLevel),
        notes:      form.notes,
      });
      showToastMsg('Session saved successfully!', 'success');
      setTimeout(() => navigate('/sessions'), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Error saving session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      {toast.show && (
        <div className={`ns-toast ns-toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="ns-header" style={{ padding: '0 40px 24px 40px' }}>
        <div>
          <h2>Study Sessions <span className="ns-breadcrumb">&gt; NEW SESSION</span></h2>
          <p>Your chronological map of cognitive growth and mastery. Add a new subject first, then set your study time and start learning effectively.</p>
          {errorMsg && (
            <p style={{ color: '#DC2626', marginTop: '10px', fontSize: '14px', fontWeight: '500' }}>
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      <div className="ns-wrapper">
        {/* RIGHT — Add New Subject (now first = left on desktop, top on mobile) */}
        <div className="ns-right">
          <div className="ns-add-subject-card">
            <div className="ns-add-subject-header">
              <BookMarked size={18} />
              <h3>Add New Subject</h3>
            </div>

            <div className="ns-field">
              <label>Subject Name <span className="ns-required">*</span></label>
              <input
                type="text" name="name"
                placeholder="Ex: Data Structures"
                value={newSubjectForm.name}
                onChange={handleNewSubjectChange}
              />
            </div>

            <div className="ns-field">
              <label>Description</label>
              <textarea
                name="description"
                placeholder="Short description..."
                value={newSubjectForm.description}
                onChange={handleNewSubjectChange}
                rows={3}
              />
            </div>

            <div className="ns-field">
              <label>Target Hours</label>
              <input
                type="text" inputMode="numeric" name="targetHours"
                placeholder="Ex: 50"
                value={newSubjectForm.targetHours}
                onChange={handleNewSubjectChange}
              />
            </div>

            <button
              type="button" className="btn-add-subject"
              onClick={handleCreateSubject}
              disabled={subjectLoading}
            >
              <Plus size={16} />
              {subjectLoading ? 'Adding...' : 'Add Subject'}
            </button>
          </div>
        </div>

        {/* LEFT — Session form (now second = right on desktop, bottom on mobile) */}
        <div className="ns-left">
          <div className="ns-form-card">

            {/* Row 1 */}
            <div className="ns-row">
              <div className="ns-field">
                <label>Subject</label>
                <div className="ns-select-wrapper">
                  <select name="subjectId" value={form.subjectId} onChange={handleChange}>
                    {subjects.length === 0 ? (
                      <option value="">No subject available</option>
                    ) : (
                      subjects.map(sub => (
                        <option key={sub._id} value={sub._id}>{sub.name}</option>
                      ))
                    )}
                  </select>
                  <div className="color-dot dot-navy" />
                </div>
              </div>
              <div className="ns-field">
                <label>Session Date</label>
                <input type="date" name="sessionDate" value={form.sessionDate} onChange={handleChange} />
              </div>
            </div>

            {/* Row 2 */}
            <div className="ns-row">
              <div className="ns-field">
                <label>Start Time</label>
                <input type="datetime-local" name="startTime" value={form.startTime} onChange={handleChange} />
              </div>
              <div className="ns-field">
                <label>End Time (Projected)</label>
                <input type="datetime-local" name="endTime" value={form.endTime} onChange={handleChange} />
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
                    key={n} type="button"
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
                placeholder="Outline the specific questions you intend to answer..."
                value={form.notes}
                onChange={handleChange}
                rows={5}
              />
            </div>

            {/* Actions */}
            <div className="ns-actions">
              <button type="button" className="btn-cancel" onClick={() => navigate('/sessions')}>Cancel</button>
              <button type="button" className="btn-save-session" onClick={handleSaveSession} disabled={loading}>
                <Save size={16} />
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

      </div>
    </AppLayout>
  );
};

export default NewSession;
