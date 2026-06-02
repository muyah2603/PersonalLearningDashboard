import { useState, useEffect, useRef } from 'react';
import {
  Pencil, BadgeCheck, Sparkles, Zap, BookMarked, Lock, ChevronRight,
  Clock, X, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import { getProfile, changePassword, uploadAvatar } from '../../services/auth.service';
import { getSummary } from '../../services/analytics.service';
import { getGoals } from '../../services/goal.service';
import './Profile.css';

const Profile = () => {
  const { updateUser } = useAuth();

  const [user, setUser]       = useState(null);
  const [stats, setStats]     = useState({ totalHours: 0, sessionCount: 0, subjectCount: 0, goalCount: 0 });
  const [loading, setLoading] = useState(true);

  const fileInputRef                      = useRef(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [isPwdModalOpen,  setIsPwdModalOpen]  = useState(false);
  const [oldPassword,     setOldPassword]     = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError,        setPwdError]        = useState('');
  const [pwdSuccess,      setPwdSuccess]      = useState('');
  const [pwdLoading,      setPwdLoading]      = useState(false);
  const [showOldPwd,      setShowOldPwd]      = useState(false);
  const [showNewPwd,      setShowNewPwd]      = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const [profileRes, summaryRes, goalsRes] = await Promise.all([
          getProfile(       { signal: controller.signal }),
          getSummary('all', { signal: controller.signal }),
          getGoals(         { signal: controller.signal }),
        ]);

        setUser(profileRes.data);
        setStats({
          totalHours:   summaryRes.data?.totalHours   ?? 0,
          sessionCount: summaryRes.data?.sessionCount ?? 0,
          subjectCount: 0,
          goalCount:    goalsRes.data?.length         ?? 0,
        });

      } catch (err) {
        if (err.name !== 'CanceledError')
          console.error('Error fetching profile data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, []);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'N/A';

  const avatarInitials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdError(''); setPwdSuccess('');
    if (newPassword !== confirmPassword) return setPwdError('Passwords do not match.');
    if (oldPassword === newPassword)     return setPwdError('New password must be different from the old password.');
    try {
      setPwdLoading(true);
      await changePassword({ oldPassword, newPassword });
      setPwdSuccess('Password changed successfully!');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => { setIsPwdModalOpen(false); setPwdSuccess(''); }, 2000);
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarLoading(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const res          = await uploadAvatar(formData);
      const newAvatarUrl = res.data.avatar;

      setUser(prev => ({ ...prev, avatar: newAvatarUrl }));
      updateUser({ avatar: newAvatarUrl });

    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <AppLayout>
      {loading ? (
        <div style={{ padding: '60px 40px', color: '#64748B' }}>Loading profile...</div>
      ) : (
        <div className="profile-wrapper">

          {/* HERO */}
          <div className="profile-hero">
            <div className="ph-avatar-container">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="ph-avatar"
                  style={{ opacity: avatarLoading ? 0.5 : 1 }}
                />
              ) : (
                <div className="ph-avatar ph-avatar-initials" style={{ opacity: avatarLoading ? 0.5 : 1 }}>
                  {avatarInitials}
                </div>
              )}
            </div>

            <div className="ph-info">
              <h2>{user?.name || 'User'}</h2>
              <p>{user?.email} • Member since {memberSince}</p>
              <div className="ph-badges">
                <div className="badge-pill">
                  <BadgeCheck size={16} color="#059669" />
                  <span>Account Verified</span>
                </div>
                <button
                  className="badge-pill btn-change-avatar"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                >
                  <Pencil size={14} color="#0059BB" />
                  <span>{avatarLoading ? 'Uploading...' : 'Change Avatar'}</span>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
          </div>

          {/* TWO COLUMNS */}
          <div className="profile-grid">

            {/* LEFT: Study Overview */}
            <div className="core-achievements">
              <h3 className="section-title">Study Overview</h3>
              <div className="achieve-list">
                <div className="achieve-card">
                  <div className="achieve-icon bg-green"><Clock size={20} color="#059669" /></div>
                  <div className="achieve-text">
                    <h4>{stats.totalHours} Hours</h4>
                    <p>Total study time recorded</p>
                  </div>
                </div>
                <div className="achieve-card">
                  <div className="achieve-icon bg-purple"><Sparkles size={20} color="#9333EA" /></div>
                  <div className="achieve-text">
                    <h4>{stats.sessionCount} Sessions</h4>
                    <p>Total study sessions created</p>
                  </div>
                </div>
                <div className="achieve-card">
                  <div className="achieve-icon bg-blue"><BookMarked size={20} color="#0059BB" /></div>
                  <div className="achieve-text">
                    <h4>{stats.subjectCount} Subjects</h4>
                    <p>Unique subjects studied</p>
                  </div>
                </div>
                <div className="achieve-card">
                  <div className="achieve-icon" style={{ backgroundColor: '#FEF3C7' }}>
                    <Zap size={20} color="#D97706" />
                  </div>
                  <div className="achieve-text">
                    <h4>{stats.goalCount} Goals</h4>
                    <p>Learning goals created</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Account Management */}
            <div className="account-mgmt">
              <h3 className="section-title">Account Management</h3>
              <div className="mgmt-card">
                <div className="mgmt-section">
                  <label className="mgmt-label">FULL NAME</label>
                  <div className="email-row">
                    <div className="email-pill">{user?.name || 'N/A'}</div>
                  </div>
                </div>
                <div className="mgmt-section">
                  <label className="mgmt-label">EMAIL ADDRESS</label>
                  <div className="email-row">
                    <div className="email-pill">{user?.email || 'N/A'}</div>
                  </div>
                </div>
                <div className="mgmt-section">
                  <label className="mgmt-label">SECURITY</label>
                  <div className="security-actions">
                    <button className="btn-action-pill" onClick={() => setIsPwdModalOpen(true)}>
                      <div className="bap-left">
                        <Lock size={16} color="#64748B" />
                        <span>Change Password</span>
                      </div>
                      <ChevronRight size={16} color="#64748B" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {isPwdModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target.className === 'modal-overlay') setIsPwdModalOpen(false); }}
        >
          <div className="modal-content pwd-modal">
            <button className="btn-close-modal" onClick={() => setIsPwdModalOpen(false)}>
              <X size={20} />
            </button>
            <h3>Change Password</h3>
            <p className="modal-desc">Secure your account by updating your password.</p>

            {pwdError   && <div className="alert-box alert-error">{pwdError}</div>}
            {pwdSuccess && <div className="alert-box alert-success">{pwdSuccess}</div>}

            <form onSubmit={handlePasswordChange} className="pwd-form">
              <div className="form-group">
                <label>Current Password</label>
                <div className="pwd-input-wrap">
                  <input
                    type={showOldPwd ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                  />
                  <button type="button" className="btn-eye" onClick={() => setShowOldPwd(!showOldPwd)}>
                    {showOldPwd ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div className="pwd-input-wrap">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                  />
                  <button type="button" className="btn-eye" onClick={() => setShowNewPwd(!showNewPwd)}>
                    {showNewPwd ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="pwd-input-wrap">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <div className="pwd-form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsPwdModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={pwdLoading}>
                  {pwdLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Profile;
