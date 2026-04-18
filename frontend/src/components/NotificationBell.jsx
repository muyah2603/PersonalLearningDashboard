import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import API from '../services/api';
import './NotificationBell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await API.get('/notifications');
        setNotifications(data);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };
    fetchNotifications();
  }, []);

  // Đóng panel khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="noti-bell-wrapper" ref={panelRef}>
      <button className="icon-btn noti-trigger" onClick={() => setIsOpen(!isOpen)}>
        <Bell size={20} color="#64748B" />
        {unreadCount > 0 && <span className="noti-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="noti-panel">
          <div className="noti-panel-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="btn-mark-all" onClick={markAllRead}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="noti-list">
            {notifications.length === 0 ? (
              <div className="noti-empty">
                <Bell size={32} color="#CBD5E1" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div key={n._id} className={`noti-item ${n.isRead ? '' : 'unread'}`} onClick={() => !n.isRead && markAsRead(n._id)}>
                  <div className="noti-dot-col">
                    {!n.isRead && <span className="noti-dot" />}
                  </div>
                  <div className="noti-body">
                    <p className="noti-content">{n.content}</p>
                    <span className="noti-time">{formatTime(n.createdAt)}</span>
                  </div>
                  {!n.isRead && (
                    <button className="btn-noti-read" onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}>
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
