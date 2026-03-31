import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Library, Landmark, LayoutDashboard, BookOpen, Target, User, Search, Bell,
  Pencil, BadgeCheck, Sparkles, Zap, BookMarked, Lock, ChevronRight, LifeBuoy, LogOut, Clock
} from 'lucide-react';
import BtnNewSession from '../../components/BtnNewSession';
import UserAvatar from '../../components/UserAvatar';
import { getProfile } from '../../services/auth.service';
import { getSummary } from '../../services/analytics.service';
import { getSessions } from '../../services/session.service';
import { getGoals } from '../../services/goal.service';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalHours: 0, sessionCount: 0, subjectCount: 0, goalCount: 0 });
  const [loading, setLoading] = useState(true);

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
            <input type="text" placeholder="Search..." />
          </div>
          <div className="top-right">
            <button className="icon-btn"><Bell size={20} color="#64748B" /></button>
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
                  <img src={user.avatar} alt={user.name} className="ph-avatar" />
                ) : (
                  <div className="ph-avatar ph-avatar-initials">{avatarInitials}</div>
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
                      <button className="btn-action-pill">
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
    </div>
  );
};

export default Profile;
