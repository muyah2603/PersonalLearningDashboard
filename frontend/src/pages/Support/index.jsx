import { LifeBuoy, AlertTriangle, Clock, Target, Zap, BookMarked, CheckCircle, Shield } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import './Support.css';

const Support = () => {
  const rules = [
    {
      icon: <AlertTriangle size={20} />,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      title: '3-Day Inactivity Warning',
      description: 'If you do not record any study sessions for 3 consecutive days, the system will automatically send a warning notification to remind you to get back on track. Stay consistent!',
    },
    {
      icon: <Clock size={20} />,
      iconBg: '#D1FAE5',
      iconColor: '#059669',
      title: 'Auto-Complete Sessions',
      description: "When your study timer reaches the target duration (based on your session's start and end time), the session will automatically mark itself as \"Completed\". You cannot manually end a session early — this encourages discipline.",
    },
    {
      icon: <Target size={20} />,
      iconBg: '#EBF4FF',
      iconColor: '#0059BB',
      title: 'Goal Completion Rules',
      description: 'A goal is marked as "Completed" only when your total actual study time (from the timer) reaches or exceeds the target hours. Simply creating sessions does not count — you must actively study.',
    },
    {
      icon: <Zap size={20} />,
      iconBg: '#F4F0FF',
      iconColor: '#9333EA',
      title: 'Focus Score Calculation',
      description: 'Focus Score = average focus level × study duration (in minutes) across all sessions. A higher score means better sustained concentration. Rate your focus honestly (1–5) for accurate insights.',
    },
    {
      icon: <BookMarked size={20} />,
      iconBg: '#FCE7F3',
      iconColor: '#DB2777',
      title: 'Session Tracking',
      description: 'Each study session records: Subject, Start/End time, Focus level (1–5), and Notes. The system automatically calculates total study time by day, week, and month in the Analytics dashboard.',
    },
    {
      icon: <CheckCircle size={20} />,
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      title: 'Daily Streak System',
      description: 'Your daily streak counts how many consecutive days you have at least one recorded study session. Missing a day resets the counter to 0. Aim for long streaks to build strong habits!',
    },
    {
      icon: <Shield size={20} />,
      iconBg: '#F1F5F9',
      iconColor: '#475569',
      title: 'Smart Suggestions',
      description: 'The system analyzes your study behavior and provides personalized tips: long sessions with low focus → try Pomodoro technique, falling behind on goals → increase daily study time, inactive for days → reminder notification.',
    },
  ];

  return (
    <AppLayout showChatBot={false}>
      <div className="support-wrapper">
        <div className="support-header">
          <div className="support-icon-big">
            <LifeBuoy size={28} color="#0059BB" />
          </div>
          <h2>Rules & Guidelines</h2>
          <p>Understanding how the Learning Tracker works will help you get the most out of your study sessions.</p>
        </div>

        <div className="rules-grid">
          {rules.map((rule, i) => (
            <div key={i} className="rule-card">
              <div className="rule-icon" style={{ backgroundColor: rule.iconBg, color: rule.iconColor }}>
                {rule.icon}
              </div>
              <div className="rule-content">
                <h4>{rule.title}</h4>
                <p>{rule.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Support;
