import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Landmark, LayoutDashboard, BookOpen, Target, BarChart2, User,
  Search, LifeBuoy, LogOut, BrainCircuit, Lightbulb, RefreshCw,
  TrendingUp, Clock, Flame, Zap, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BtnNewSession from '../../components/BtnNewSession';
import UserAvatar from '../../components/UserAvatar';
import NotificationBell from '../../components/NotificationBell';
import { getCoachData } from '../../services/coach.service';
import ChatBot from '../../components/ChatBot';
import './AICoach.css';

const SUGG_TAGS = ['QUICK WIN', 'RECOMMENDED', 'PRO TIP', 'CHALLENGE', 'HABIT'];
const getScoreClass = (level) => {
  const map = { Excellent: 'level-excellent', Good: 'level-good', Average: 'level-average', Poor: 'level-poor' };
  return map[level] || 'level-average';
};

const AICoach = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const fetchCoach = useCallback(async (isRefresh = false) => {
    if (isRefresh) setSpinning(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getCoachData();
      setData(res.data);
    } catch (err) {
      setError('Không thể tải dữ liệu. Hãy kiểm tra kết nối hoặc thử lại.');
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => { fetchCoach(); }, [fetchCoach]);

  const scoreBreakdown = data?.score ? [
    { name: 'Thời gian học', key: 'time', pct: Math.min(100, data.score.value * 1.0), colorClass: 'time' },
    { name: 'Chất lượng tập trung', key: 'focus', pct: Math.min(100, data.score.value * 0.9), colorClass: 'focus' },
    { name: 'Nhất quán', key: 'consistency', pct: Math.min(100, data.score.value * 0.8), colorClass: 'consistency' },
  ] : [];

  return (
    <div className="coach-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-logo">
            <div className="logo-icon"><Landmark size={20} color="white" /></div>
            <span className="brand-text">Learning</span>
          </div>
          <nav className="nav-menu">
            <Link to="/dashboard"  className="nav-item"><LayoutDashboard size={18} /><span>Dashboard</span></Link>
            <Link to="/sessions"   className="nav-item"><BookOpen size={18} /><span>Sessions</span></Link>
            <Link to="/goals"      className="nav-item"><Target size={18} /><span>Goals</span></Link>
            <Link to="/analytics"  className="nav-item"><BarChart2 size={18} /><span>Analytics</span></Link>
            <Link to="/profile"    className="nav-item"><User size={18} /><span>Profile</span></Link>
            <Link to="/ai-coach"   className="nav-item active"><BrainCircuit size={18} /><span>AI Coach</span></Link>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <BtnNewSession />
          <div className="sidebar-links">
            <Link to="/support" className="sb-link"><LifeBuoy size={16} /> Support</Link>
            <Link to="/login"   className="sb-link"><LogOut size={16} /> Sign Out</Link>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-navbar">
          <div className="search-bar">
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search sessions..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim())
                  navigate(`/sessions?q=${encodeURIComponent(e.target.value.trim())}`);
              }}
            />
          </div>
          <div className="top-right">
            <NotificationBell />
            <UserAvatar />
          </div>
        </header>

        <div className="coach-body">
          <div className="coach-banner">
            <div className="banner-left">
              <h2>AI Study Coach{user?.name ? `, ${user.name}` : ''}</h2>
              <p>"Phân tích hành vi học tập — gợi ý cá nhân hoá mỗi tuần."</p>
            </div>
            {data?.score && (
              <div className={`score-pill ${getScoreClass(data.score.level)}`}>
                <span className="score-label">Study Score</span>
                <span className="score-num">{data.score.value}</span>
                <span className="score-level">{data.score.level}</span>
              </div>
            )}
          </div>

          <div className="coach-refresh-row">
            <button
              className={`btn-refresh ${spinning ? 'spinning' : ''}`}
              onClick={() => fetchCoach(true)}
              disabled={spinning}
            >
              <RefreshCw size={15} />
              {spinning ? 'Đang tải...' : 'Làm mới phân tích'}
            </button>
          </div>

          {loading && (
            <div className="coach-loading">
              <div className="spinner" />
              <span>Đang phân tích dữ liệu học tập của bạn...</span>
            </div>
          )}

          {!loading && error && (
            <div className="coach-error">
              <AlertCircle size={16} style={{ display: 'inline', marginRight: 8 }} />
              {error}
            </div>
          )}

          {!loading && data && (
            <div className="coach-grid">
              <div className="coach-card">
                <span className="card-section-label">Nhận xét tuần này</span>
                <h3 className="card-title">Phân tích học tập</h3>
                <div className="insight-list">
                  {data.insights?.map((text, i) => (
                    <div key={i} className="insight-item">
                      <div className="insight-icon">
                        {i === 0 && <TrendingUp size={14} color="#0059BB" />}
                        {i === 1 && <Clock size={14} color="#0059BB" />}
                        {i === 2 && <Flame size={14} color="#0059BB" />}
                        {i === 3 && <Zap size={14} color="#0059BB" />}
                        {i >= 4  && <BrainCircuit size={14} color="#0059BB" />}
                      </div>
                      <span className="insight-text">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="coach-card">
                  <span className="card-section-label">Điểm thành phần</span>
                  <h3 className="card-title">Study Score Breakdown</h3>
                  <div className="score-breakdown">
                    {scoreBreakdown.map((row) => (
                      <div key={row.key} className="breakdown-row">
                        <div className="breakdown-label-row">
                          <span className="breakdown-name">{row.name}</span>
                          <span className="breakdown-val">{Math.round(row.pct)}%</span>
                        </div>
                        <div className="breakdown-bar-bg">
                          <div className={`breakdown-bar-fill ${row.colorClass}`} style={{ width: `${row.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="coach-dark-card">
                  <div className="dark-card-header">
                    <Lightbulb size={18} color="#2DD4BF" />
                    <h3>Gợi ý cải thiện</h3>
                  </div>
                  <div className="suggestion-list">
                    {data.suggestions?.map((text, i) => (
                      <div key={i} className="suggestion-item">
                        <div className="sugg-num">{i + 1}</div>
                        <div className="sugg-content">
                          <div className="sugg-tag">{SUGG_TAGS[i] || 'TIP'}</div>
                          <p className="sugg-text">{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

       <ChatBot />
    </div>
  );
};

export default AICoach;