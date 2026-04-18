import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Library, Landmark, LayoutDashboard, BookOpen, Target, BarChart2, User, Search,
  Pencil, BadgeCheck, Sparkles, Zap, BookMarked, Lock, ChevronRight, LifeBuoy, LogOut, Clock, X, Eye, EyeOff
} from 'lucide-react';
import BtnNewSession from '../../components/BtnNewSession';
import UserAvatar from '../../components/UserAvatar';
import NotificationBell from '../../components/NotificationBell';
import { getProfile, changePassword, uploadAvatar } from '../../services/auth.service';
import { getSummary } from '../../services/analytics.service';
import { getSessions } from '../../services/session.service';
import { getGoals } from '../../services/goal.service';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalHours: 0, sessionCount: 0, subjectCount: 0, goalCount: 0 });
  const [loading, setLoading] = useState(true);

  // Avatar State
  const fileInputRef = useRef(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Password Modal States
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, _summaryRes, sessionsRes, goalsRes] = await Promise.all([
          getProfile(),
          getSummary('month'),
          getSessions(),
          getGoals(),
        ]);
        setUser(profileRes.data);
        
        const sessions = sessionsRes.data;
        const totalActualSeconds = sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
        const uniqueSubjects = new Set(sessions.map(s => s.subjectId?._id).filter(Boolean));

        setStats({
          totalHours: (totalActualSeconds / 3600).toFixed(1),
          sessionCount: sessions.length,
          subjectCount: uniqueSubjects.size,
          goalCount: goalsRes.data.length,
        });
      } catch (err) {
        console.error('Error fetching profile data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const memberSince = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'N/A';

  const avatarInitials = user?.name 
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) 
    : 'U';

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword !== confirmPassword) {
      return setPwdError('Mật khẩu xác nhận không khớp.');
    }
    if (oldPassword === newPassword) {
      return setPwdError('Mật khẩu mới không được trùng với mật khẩu cũ.');
    }

    try {
      setPwdLoading(true);
      await changePassword({ oldPassword, newPassword });
      setPwdSuccess('Đổi mật khẩu thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPwdModalOpen(false);
        setPwdSuccess('');
      }, 2000);
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
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

      const res = await uploadAvatar(formData);
      setUser(prev => ({ ...prev, avatar: res.data.avatar }));
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi tải ảnh lên.');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
            <Link to="/analytics" className="nav-item"><BarChart2 size={18} /><span>Analytics</span></Link>
            <Link to="/profile" className="nav-item active"><User size={18} /><span>Profile</span></Link>
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

        {loading ? (
          <div style={{ padding: '60px 40px', color: '#64748B' }}>Loading profile...</div>
        ) : (
          <div className="profile-wrapper">
            {/* HERO HEADER */}
            <div className="profile-hero">
              <div className="ph-avatar-container">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="ph-avatar" style={{ opacity: avatarLoading ? 0.5 : 1 }} />
                ) : (
                  <div className="ph-avatar ph-avatar-initials" style={{ opacity: avatarLoading ? 0.5 : 1 }}>{avatarInitials}</div>
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

            {/* TWO COLUMNS LAYOUT */}
            <div className="profile-grid">
              
              {/* LEFT COLUMN: Study Summary */}
              <div className="core-achievements">
                <h3 className="section-title">Study Overview</h3>
                
                <div className="achieve-list">
                  <div className="achieve-card">
                    <div className="achieve-icon bg-green">
                      <Clock size={20} color="#059669" />
                    </div>
                    <div className="achieve-text">
                      <h4>{stats.totalHours} Hours</h4>
                      <p>Total study time recorded</p>
                    </div>
                  </div>

                  <div className="achieve-card">
                    <div className="achieve-icon bg-purple">
                      <Sparkles size={20} color="#9333EA" />
                    </div>
                    <div className="achieve-text">
                      <h4>{stats.sessionCount} Sessions</h4>
                      <p>Total study sessions created</p>
                    </div>
                  </div>

                  <div className="achieve-card">
                    <div className="achieve-icon bg-blue">
                      <BookMarked size={20} color="#0059BB" />
                    </div>
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

              {/* RIGHT COLUMN: Account Management */}
              <div className="account-mgmt">
                <h3 className="section-title">Account Management</h3>

                <div className="mgmt-card">
                  
                  {/* Name Section */}
                  <div className="mgmt-section">
                    <label className="mgmt-label">FULL NAME</label>
                    <div className="email-row">
                      <div className="email-pill">{user?.name || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Email Section */}
                  <div className="mgmt-section">
                    <label className="mgmt-label">EMAIL ADDRESS</label>
                    <div className="email-row">
                      <div className="email-pill">{user?.email || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Security Section */}
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

      </main>

      {/* PASSWORD CHANGE MODAL */}
      {isPwdModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setIsPwdModalOpen(false); }}>
          <div className="modal-content pwd-modal">
            <button className="btn-close-modal" onClick={() => setIsPwdModalOpen(false)}>
              <X size={20} />
            </button>
            <h3>Change Password</h3>
            <p className="modal-desc">Secure your account by updating your password.</p>
            
            {pwdError && <div className="alert-box alert-error">{pwdError}</div>}
            {pwdSuccess && <div className="alert-box alert-success">{pwdSuccess}</div>}

            <form onSubmit={handlePasswordChange} className="pwd-form">
              <div className="form-group">
                <label>Current Password</label>
                <div className="pwd-input-wrap">
                  <input 
                    type={showOldPwd ? "text" : "password"} 
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
                    type={showNewPwd ? "text" : "password"} 
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
                    type={showNewPwd ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    required 
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="pwd-form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsPwdModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={pwdLoading}>
                  {pwdLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
