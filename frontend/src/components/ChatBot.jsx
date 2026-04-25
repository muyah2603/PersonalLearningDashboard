import { useState, useRef, useEffect } from 'react';
import { BrainCircuit, X, Send, User } from 'lucide-react';
import API from '../services/api';
import './ChatBot.css';

const QUICK_CHIPS = [
  'Tôi nên học bao lâu mỗi ngày?',
  'Cách tăng tập trung khi học?',
  'Gợi ý kế hoạch tuần này',
];

const WELCOME_MSG = {
  role: 'bot',
  content: 'Xin chào! Mình là AI Study Coach 👋\nMình có thể giúp bạn lập kế hoạch học, cải thiện tập trung và theo dõi tiến độ. Bạn muốn hỏi gì?',
};

const formatMessage = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  return lines.map((line, i) => {
    const cleaned = line.replace(/^\*+\s*/, '').trim();
    return (
      <p key={i} style={{ margin: '3px 0', lineHeight: '1.55' }}>
        {cleaned}
      </p>
    );
  });
};

const ChatBot = () => {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const buildHistory = (msgs) =>
    msgs
      .filter((m, idx) => !(m.role === 'bot' && idx === 0))
      .map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      }));

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await API.post('/chatbot/chat', {
        message: trimmed,
        history: buildHistory(messages),
      });
      setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'bot', content: 'Xin lỗi, mình gặp sự cố kết nối. Hãy thử lại nhé!' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-left">
              <div className="chat-avatar">
                <BrainCircuit size={18} color="#fff" />
              </div>
              <div className="chat-header-info">
                <h4>AI Study Coach</h4>
                <div className="chat-online">
                  <div className="chat-online-dot" />
                  Đang hoạt động
                </div>
              </div>
            </div>
            <button className="chat-close-btn" onClick={() => setOpen(false)}>
              <X size={15} color="#fff" />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`msg-row ${msg.role}`}>
                <div className="msg-icon">
                  {msg.role === 'bot'
                    ? <BrainCircuit size={14} color="#0059BB" />
                    : <User size={14} color="#fff" />
                  }
                </div>
                <div className="bubble">
                  {msg.role === 'bot'
                    ? formatMessage(msg.content)
                    : msg.content
                  }
                  {i === 0 && (
                    <div className="chat-chips">
                      {QUICK_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          className="chat-chip"
                          onClick={() => sendMessage(chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg-row bot">
                <div className="msg-icon">
                  <BrainCircuit size={14} color="#0059BB" />
                </div>
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-area">
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="Nhập câu hỏi..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}

      <button
        className={`chat-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="AI Study Coach"
      >
        {open
          ? <X size={22} color="#fff" />
          : <BrainCircuit size={22} color="#fff" />
        }
      </button>
    </>
  );
};

export default ChatBot;
