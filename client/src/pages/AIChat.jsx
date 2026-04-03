import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../data/paths';
import './AIChat.css';

const API = process.env.REACT_APP_API_URL || '/api';

/* ── Helpers ────────────────────────────────────────────────────────────────── */

const COUNTRY_FLAGS = {
  nigeria: '🇳🇬', ghana: '🇬🇭', kenya: '🇰🇪', 'south africa': '🇿🇦',
  'united states': '🇺🇸', usa: '🇺🇸', 'united kingdom': '🇬🇧', uk: '🇬🇧',
  canada: '🇨🇦', germany: '🇩🇪', france: '🇫🇷', australia: '🇦🇺',
  uae: '🇦🇪', 'united arab emirates': '🇦🇪', dubai: '🇦🇪',
  'saudi arabia': '🇸🇦', turkey: '🇹🇷', india: '🇮🇳', china: '🇨🇳',
  japan: '🇯🇵', brazil: '🇧🇷', egypt: '🇪🇬', morocco: '🇲🇦',
  italy: '🇮🇹', spain: '🇪🇸', netherlands: '🇳🇱', sweden: '🇸🇪',
  ireland: '🇮🇪', portugal: '🇵🇹', poland: '🇵🇱', malaysia: '🇲🇾',
  singapore: '🇸🇬', 'south korea': '🇰🇷', mexico: '🇲🇽',
};

function getFlag(country) {
  if (!country) return '🌍';
  const key = country.toLowerCase().trim();
  return COUNTRY_FLAGS[key] || '🌍';
}

/** Lightweight markdown-ish renderer for chat messages */
function formatMessage(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Numbered list items
    if (/^\d+[\.\)]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[\.\)]\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="chat-ol">
          {items.map((item, idx) => (
            <li key={idx}>{inlineFormat(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Bullet list items
    if (/^[-•*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-•*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="chat-ul">
          {items.map((item, idx) => (
            <li key={idx}>{inlineFormat(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Empty line = spacer
    if (line.trim() === '') {
      elements.push(<div key={`sp-${i}`} className="chat-spacer" />);
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(<p key={`p-${i}`} className="chat-p">{inlineFormat(line)}</p>);
    i++;
  }

  return elements;
}

/** Handle **bold** and *italic* inline */
function inlineFormat(text) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function AIChat() {
  const navigate = useNavigate();
  const [sessionId] = useState(() => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [travelData, setTravelData] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [ready, setReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [welcomed, setWelcomed] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Send welcome message on mount
  useEffect(() => {
    if (!welcomed) {
      setWelcomed(true);
      setMessages([
        {
          role: 'assistant',
          content:
            "Hello! I'm your **AI Travel Consultant** at Tragency. I'm here to help you figure out exactly what you need for your trip.\n\nTell me a bit about your travel plans — where are you traveling from, where are you headed, and what's the purpose of your trip?",
        },
      ]);
    }
  }, [welcomed]);

  // Restore conversation on mount (optional)
  useEffect(() => {
    async function restore() {
      try {
        const res = await fetch(`${API}/ai/conversation/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages?.length > 0) {
            setMessages(data.messages.map((m) => ({ role: m.role, content: m.content })));
          }
        }
      } catch {
        // ignore — fresh session
      }
    }
    restore();
  }, []); // eslint-disable-line

  /* ── Send message ──────────────────────────────────────────────────────────── */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });

      if (!res.ok) throw new Error('Network error');

      const data = await res.json();

      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);

      if (data.conversationId) setConversationId(data.conversationId);

      if (data.travelData) {
        setTravelData((prev) => ({ ...prev, ...data.travelData }));
      }

      if (data.ready) {
        setReady(true);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const goToMatch = () => {
    navigate('/match', { state: { conversationId, travelData } });
  };

  /* ── Derived data for side panel ───────────────────────────────────────────── */
  const pathInfo = travelData?.travelPath ? PATHS[travelData.travelPath] : null;
  const hasData = travelData && (travelData.fromCountry || travelData.toCountry || travelData.travelPath);

  /* ── Render ────────────────────────────────────────────────────────────────── */
  return (
    <div className="aichat">
      {/* ── Main chat column ─────────────────────────────────────────────────── */}
      <div className="aichat-main">
        {/* Messages */}
        <div className="aichat-messages">
          {messages.length === 0 && !loading && (
            <div className="aichat-welcome">
              <div className="aichat-welcome-icon">🌍</div>
              <h1 className="serif">Chat with our AI Travel Consultant</h1>
              <p>
                Tell me about your travel plans and I will help you understand visa requirements, prepare your
                documents, and connect you with the perfect verified agent.
              </p>
              <div className="aichat-welcome-paths">
                {Object.values(PATHS).map((p) => (
                  <span key={p.id} className="aichat-path-tag" style={{ borderColor: p.color, color: p.color }}>
                    {p.icon} {p.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`aichat-msg aichat-msg--${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="aichat-avatar">
                  <span>T</span>
                </div>
              )}
              <div className="aichat-bubble">{formatMessage(msg.content)}</div>
            </div>
          ))}

          {loading && (
            <div className="aichat-msg aichat-msg--assistant">
              <div className="aichat-avatar">
                <span>T</span>
              </div>
              <div className="aichat-bubble aichat-typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Ready CTA (inline, above input) */}
        {ready && (
          <div className="aichat-ready-bar">
            <p>Your travel details are ready! Let us match you with a specialist agent.</p>
            <button className="aichat-ready-btn" onClick={goToMatch}>
              Find My Agent &rarr;
            </button>
          </div>
        )}

        {/* Input */}
        <div className="aichat-input-bar">
          <textarea
            ref={inputRef}
            className="aichat-input"
            rows={1}
            placeholder="Describe your travel plans..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button className="aichat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile panel toggle ──────────────────────────────────────────────── */}
      {hasData && (
        <button className="aichat-panel-toggle" onClick={() => setPanelOpen(!panelOpen)}>
          {panelOpen ? '✕' : '📋'} <span>Travel Info</span>
        </button>
      )}

      {/* ── Side panel ───────────────────────────────────────────────────────── */}
      <aside className={`aichat-panel ${panelOpen ? 'open' : ''} ${hasData ? 'has-data' : ''}`}>
        <div className="aichat-panel-header">
          <h3 className="serif">Travel Details</h3>
          <button className="aichat-panel-close" onClick={() => setPanelOpen(false)}>✕</button>
        </div>

        {!hasData && (
          <div className="aichat-panel-empty">
            <span className="aichat-panel-empty-icon">💬</span>
            <p>Start chatting and I will gather your travel details here.</p>
          </div>
        )}

        {hasData && (
          <div className="aichat-panel-body">
            {/* From */}
            {travelData.fromCountry && (
              <div className="aichat-detail">
                <label>From</label>
                <div className="aichat-detail-val">
                  <span className="aichat-flag">{getFlag(travelData.fromCountry)}</span>
                  {travelData.fromCountry}
                </div>
              </div>
            )}

            {/* To */}
            {travelData.toCountry && (
              <div className="aichat-detail">
                <label>To</label>
                <div className="aichat-detail-val">
                  <span className="aichat-flag">{getFlag(travelData.toCountry)}</span>
                  {travelData.toCountry}
                </div>
              </div>
            )}

            {/* Route visual */}
            {travelData.fromCountry && travelData.toCountry && (
              <div className="aichat-route">
                <span>{getFlag(travelData.fromCountry)}</span>
                <span className="aichat-route-line" />
                <span className="aichat-route-plane">✈️</span>
                <span className="aichat-route-line" />
                <span>{getFlag(travelData.toCountry)}</span>
              </div>
            )}

            {/* Travel path */}
            {pathInfo && (
              <div className="aichat-detail">
                <label>Travel Path</label>
                <div className="aichat-detail-val aichat-path-badge" style={{ borderColor: pathInfo.color }}>
                  <span>{pathInfo.icon}</span>
                  {pathInfo.label}
                </div>
              </div>
            )}

            {/* Checklist */}
            {travelData.checklist?.length > 0 && (
              <div className="aichat-checklist">
                <label>Document Checklist</label>
                <ul>
                  {travelData.checklist.map((item, idx) => (
                    <li key={idx}>
                      <span className="aichat-check-icon">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ready CTA in panel */}
            {ready && (
              <button className="aichat-panel-cta" onClick={goToMatch}>
                Find My Agent &rarr;
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
