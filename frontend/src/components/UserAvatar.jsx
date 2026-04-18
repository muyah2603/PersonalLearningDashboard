import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';
import './UserAvatar.css';

const UserAvatar = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const name = user?.name || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="ua-wrapper" ref={ref}>
      <button className="ua-trigger" onClick={() => setOpen(!open)}>
        <div className="ua-circle">
          <span>{initials}</span>
        </div>
      </button>

      {open && (
        <div className="ua-dropdown">
          <div className="ua-header">
            <div className="ua-circle-sm">
              <span>{initials}</span>
            </div>
            <div className="ua-info">
              <span className="ua-name">{name}</span>
              <span className="ua-email">{user?.email}</span>
            </div>
          </div>
          <div className="ua-divider"></div>
          <button className="ua-item" onClick={() => { setOpen(false); navigate('/profile'); }}>
            <User size={16} />
            <span>Profile</span>
          </button>
          <button className="ua-item ua-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
