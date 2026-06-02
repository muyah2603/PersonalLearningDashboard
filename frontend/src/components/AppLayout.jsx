import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Landmark, LayoutDashboard, BookOpen, Target, BarChart2, User,
  Search, LifeBuoy, LogOut, BrainCircuit, Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BtnNewSession from './BtnNewSession';
import UserAvatar from './UserAvatar';
import NotificationBell from './NotificationBell';
import ChatBot from './ChatBot';

const AppLayout = ({ children, showChatBot = true, searchBarSlot }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const closeSidebar = () => setSidebarOpen(false);

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/sessions',  icon: <BookOpen size={18} />,        label: 'Sessions', matchFn: (p) => p.startsWith('/sessions') },
    { to: '/goals',     icon: <Target size={18} />,          label: 'Goals' },
    { to: '/analytics', icon: <BarChart2 size={18} />,       label: 'Analytics' },
    { to: '/ai-coach',  icon: <BrainCircuit size={18} />,    label: 'Coach' },
    { to: '/profile',   icon: <User size={18} />,            label: 'Profile' },
  ];

  const isActive = (item) =>
    item.matchFn ? item.matchFn(location.pathname) : location.pathname === item.to;

  const defaultSearchBar = (
    <div className="search-bar">
      <Search size={16} color="#94A3B8" />
      <input
        type="text"
        placeholder="Search..."
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.value.trim())
            navigate(`/sessions?q=${encodeURIComponent(e.target.value.trim())}`);
        }}
      />
    </div>
  );

  return (
    <div className="dashboard-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand-logo">
            <div className="logo-icon"><Landmark size={20} color="white" /></div>
            <span className="brand-text">Learning</span>
          </div>
          <nav className="nav-menu">
            {navItems.map(({ to, icon, label, matchFn }) => (
              <Link
                key={to}
                to={to}
                className={`nav-item${isActive({ to, matchFn }) ? ' active' : ''}`}
                onClick={closeSidebar}
              >
                {icon}
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <BtnNewSession />
          <div className="sidebar-links">
            <Link
              to="/support"
              className={`sb-link${location.pathname === '/support' ? ' active' : ''}`}
              onClick={closeSidebar}
            >
              <LifeBuoy size={16} /> Support
            </Link>
            <button
              className="sb-link"
              onClick={() => { logout(); navigate('/login'); }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-navbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen((prev) => !prev)} aria-label="Toggle menu">
            <Menu size={22} />
          </button>
          {searchBarSlot || defaultSearchBar}
          <div className="top-right">
            <NotificationBell />
            <UserAvatar />
          </div>
        </header>
        {children}
      </main>

      {showChatBot && <ChatBot />}

      <nav className="bottom-nav">
        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
          <LayoutDashboard size={20} />
          <span>Home</span>
        </Link>
        <Link to="/sessions" className={location.pathname.startsWith('/sessions') ? 'active' : ''}>
          <BookOpen size={20} />
          <span>Sessions</span>
        </Link>
        <Link to="/goals" className={location.pathname === '/goals' ? 'active' : ''}>
          <Target size={20} />
          <span>Goals</span>
        </Link>
        <Link to="/analytics" className={location.pathname === '/analytics' ? 'active' : ''}>
          <BarChart2 size={20} />
          <span>Analytics</span>
        </Link>
        <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
          <User size={20} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
};

export default AppLayout;
