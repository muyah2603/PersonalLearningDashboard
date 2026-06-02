import { useState, useRef, useEffect, useCallback } from 'react';
import { BrainCircuit, X, Send, User } from 'lucide-react';
import API from '../services/api';
import './ChatBot.css';

const FAB_SIZE = 52;
const CHAT_W   = 360;
const CHAT_H   = 520;
const MARGIN   = 12;

const QUICK_CHIPS = [
  'How long should I study each day?',
  'How to improve focus while studying?',
  'Suggest a study plan for this week',
];

const WELCOME_MSG = {
  role: 'bot',
  content: "Hi there! I'm your AI Study Coach 👋\nI can help you plan your study schedule, improve focus, and track your progress. What would you like to know?",
};

const formatMessage = (text) =>
  text.split('\n').filter(l => l.trim()).map((line, i) => (
    <p key={i} style={{ margin: '3px 0', lineHeight: '1.55' }}>
      {line.replace(/^\*+\s*/, '').trim()}
    </p>
  ));

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const defaultPos = () => ({
  x: window.innerWidth  - FAB_SIZE - 28,
  y: window.innerHeight - FAB_SIZE - 28,
});

const loadPos = () => {
  try {
    const s = localStorage.getItem('chatbot-pos');
    if (s) {
      const p = JSON.parse(s);
      // keep within current viewport
      return {
        x: clamp(p.x, 0, window.innerWidth  - FAB_SIZE),
        y: clamp(p.y, 0, window.innerHeight - FAB_SIZE),
      };
    }
  } catch {}
  return defaultPos();
};

const ChatBot = () => {
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [loading,  setLoading]  = useState(false);
  const [pos,      setPos]      = useState(loadPos);
  const [dragging, setDragging] = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const dragOrigin = useRef({ mx: 0, my: 0, bx: 0, by: 0 });
  const didDrag    = useRef(false);

  /* ── scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  /* ── drag logic ── */
  const startDrag = useCallback((clientX, clientY) => {
    didDrag.current = false;
    dragOrigin.current = { mx: clientX, my: clientY, bx: pos.x, by: pos.y };
    setDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = cx - dragOrigin.current.mx;
      const dy = cy - dragOrigin.current.my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag.current = true;
      setPos({
        x: clamp(dragOrigin.current.bx + dx, 0, window.innerWidth  - FAB_SIZE),
        y: clamp(dragOrigin.current.by + dy, 0, window.innerHeight - FAB_SIZE),
      });
    };

    const onUp = () => {
      setDragging(false);
      setPos(prev => {
        localStorage.setItem('chatbot-pos', JSON.stringify(prev));
        return prev;
      });
    };

    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseup',    onUp);
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('touchend',   onUp);
    return () => {
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('mouseup',    onUp);
      window.removeEventListener('touchmove',  onMove);
      window.removeEventListener('touchend',   onUp);
    };
  }, [dragging]);

  /* ── keep in viewport on resize ── */
  useEffect(() => {
    const onResize = () => setPos(prev => ({
      x: clamp(prev.x, 0, window.innerWidth  - FAB_SIZE),
      y: clamp(prev.y, 0, window.innerHeight - FAB_SIZE),
    }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── chat window position (smart: above / below / left / right of fab) ── */
  const chatStyle = () => {
    let left = pos.x + FAB_SIZE / 2 - CHAT_W / 2;
    let top  = pos.y - CHAT_H - MARGIN;

    if (left + CHAT_W > window.innerWidth  - MARGIN) left = window.innerWidth  - CHAT_W - MARGIN;
    if (left < MARGIN)                               left = MARGIN;
    if (top  < MARGIN)                               top  = pos.y + FAB_SIZE + MARGIN;

    return { position: 'fixed', left, top, right: 'auto', bottom: 'auto' };
  };

  /* ── send message ── */
  const buildHistory = (msgs) =>
    msgs
      .filter((m, i) => !(m.role === 'bot' && i === 0))
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content }));

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await API.post('/chatbot/chat', {
        message: trimmed,
        history: buildHistory(messages),
      });
      setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I encountered a connection error. Please try again!' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleFabClick = () => {
    if (didDrag.current) return;
    setOpen(o => !o);
  };

  return (
    <>
      {open && (
        <div className="chat-window" style={chatStyle()}>
          <div className="chat-header">
            <div className="chat-header-left">
              <div className="chat-avatar"><BrainCircuit size={18} color="#fff" /></div>
              <div className="chat-header-info">
                <h4>AI Study Coach</h4>
                <div className="chat-online">
                  <div className="chat-online-dot" />
                  Online
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
                    : <User size={14} color="#fff" />}
                </div>
                <div className="bubble">
                  {msg.role === 'bot' ? formatMessage(msg.content) : msg.content}
                  {i === 0 && (
                    <div className="chat-chips">
                      {QUICK_CHIPS.map(chip => (
                        <button key={chip} className="chat-chip" onClick={() => sendMessage(chip)}>
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
                <div className="msg-icon"><BrainCircuit size={14} color="#0059BB" /></div>
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
              placeholder="Ask a question..."
              value={input}
              onChange={e => setInput(e.target.value)}
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
        className={`chat-fab ${open ? 'open' : ''} ${dragging ? 'dragging' : ''}`}
        style={{ left: pos.x, top: pos.y }}
        onMouseDown={e => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
        onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onClick={handleFabClick}
        title="Drag to move · Click to open chat"
      >
        {open && !dragging
          ? <X size={22} color="#fff" />
          : <BrainCircuit size={22} color="#fff" />}
      </button>
    </>
  );
};

export default ChatBot;
