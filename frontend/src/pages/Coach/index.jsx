import { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit, Lightbulb, RefreshCw,
  TrendingUp, Clock, Flame, Zap, AlertCircle
} from 'lucide-react';
import { useAuth }        from '../../context/AuthContext';
import AppLayout          from '../../components/AppLayout';
import { getCoachData }   from '../../services/coach.service';
import './Coach.css';

const SUGG_TAGS = ['QUICK WIN', 'RECOMMENDED', 'PRO TIP', 'CHALLENGE', 'HABIT'];
const getScoreClass = (level) => {
  const map = { Excellent: 'level-excellent', Good: 'level-good', Average: 'level-average', Poor: 'level-poor' };
  return map[level] || 'level-average';
};

const Coach = () => {
  const { user } = useAuth();

  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [spinning, setSpinning] = useState(false);

  const fetchCoach = useCallback(async (isRefresh = false) => {
    if (isRefresh) setSpinning(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getCoachData();
      setData(res.data);
    } catch (err) {
      setError('Unable to load data. Please check your connection or try again.');
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => { fetchCoach(); }, [fetchCoach]);

  const scoreBreakdown = data?.score ? [
    { name: 'Study Time',    key: 'time',        pct: Math.min(100, data.score.value * 1.0), colorClass: 'time' },
    { name: 'Focus Quality', key: 'focus',       pct: Math.min(100, data.score.value * 0.9), colorClass: 'focus' },
    { name: 'Consistency',   key: 'consistency', pct: Math.min(100, data.score.value * 0.8), colorClass: 'consistency' },
  ] : [];

  return (
    <AppLayout>
      <div className="coach-body">

        {/* BANNER */}
        <div className="coach-banner">
          <div className="banner-left">
            <h2>Coach{user?.name ? `, ${user.name}` : ''}</h2>
            <p>"Analyze your study behavior - personalized recommendations every week."</p>
          </div>
          {data?.score && (
            <div className={`score-pill ${getScoreClass(data.score.level)}`}>
              <span className="score-label">Study Score</span>
              <span className="score-num">{data.score.value}</span>
              <span className="score-level">{data.score.level}</span>
            </div>
          )}
        </div>

        {/* REFRESH */}
        <div className="coach-refresh-row">
          <button
            className={`btn-refresh ${spinning ? 'spinning' : ''}`}
            onClick={() => fetchCoach(true)}
            disabled={spinning}
          >
            <RefreshCw size={15} />
            {spinning ? 'Loading...' : 'Refresh Analysis'}
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="coach-loading">
            <div className="spinner" />
            <span>Analyzing your learning data...</span>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="coach-error">
            <AlertCircle size={16} style={{ display: 'inline', marginRight: 8 }} />
            {error}
          </div>
        )}

        {/* DATA */}
        {!loading && data && (
          <div className="coach-grid">

            {/* LEFT — Insights */}
            <div className="coach-card">
              <span className="card-section-label">WEEKLY INSIGHTS</span>
              <h3 className="card-title">Weekly Review</h3>
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

            {/* RIGHT — Score + Suggestions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Score Breakdown */}
              <div className="coach-card">
                <span className="card-section-label">COMPONENT SCORES</span>
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

              {/* Suggestions */}
              <div className="coach-dark-card">
                <div className="dark-card-header">
                  <Lightbulb size={18} color="#2DD4BF" />
                  <h3>Improvement Suggestions</h3>
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
    </AppLayout>
  );
};

export default Coach;
