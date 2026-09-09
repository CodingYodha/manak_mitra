import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const QUICK_PROMPTS = [
  { label: '💡 9W LED Bulb (CRS)', q: 'Do I need BIS certification for 9W LED bulb?' },
  { label: '🧸 Plastic Toy (ISI)', q: 'What is the mandatory standard for children plastic toys?' },
  { label: '✨ 22K Gold Ring (HUID)', q: 'What are the hallmarking requirements for 22K gold ring?' },
  { label: '🇮🇳 हिंदी प्रश्न (Voice)', q: 'क्या मुझे एलईडी बल्ब के लिए बीआईएस चाहिए?' },
  { label: '🚫 Swallow (Refusal Demo)', q: 'What is the airspeed of an unladen swallow?' }
];

export default function ChatPanel({ onSelectNode, onViewPassport }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Namaste! I am Manak Mitra, the official compliance intelligence assistant for Bureau of Indian Standards (BIS). Ask about Quality Control Orders (QCOs), Indian Standards (IS), mandatory schemes, fees, or testing labs.',
      citations: [],
      abstained: false,
      timestamp: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    // Detect language
    const hasHindi = /[\u0900-\u097F]/.test(q);
    const lang = hasHindi ? 'hi' : 'en';

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: q,
      timestamp: 'Now'
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:8000/chat?q=${encodeURIComponent(q)}&lang=${lang}&channel=web`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.answer,
        citations: data.citations || [],
        abstained: data.abstained || false,
        intent: data.intent,
        highlight_nodes: data.highlight_nodes || [],
        passport_url: data.passport_url || '',
        product: q,
        timestamp: 'Now'
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data.highlight_nodes && data.highlight_nodes.length > 0 && onSelectNode) {
        onSelectNode(data.highlight_nodes[0]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      // Clean fallback if local server is starting
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Unable to reach backend on port 8000. Please verify the FastAPI server is running with `uvicorn api.main:app`.',
          citations: [],
          abstained: true,
          timestamp: 'Now'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Browser Voice Input (SpeechRecognition)
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setInput(text);
        setIsListening(false);
        handleSend(text);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Browser Voice Output (SpeechSynthesis)
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const hasHindi = /[\u0900-\u097F]/.test(text);
    utterance.lang = hasHindi ? 'hi-IN' : 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="editorial-chat-box">
      {/* Top bar */}
      <div className="chat-box-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="#181d26" />
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#181d26' }}>
            Interactive Compliance Engine
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>· 23,573 Standards</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#15803d', fontWeight: 500 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
          Zero-Hallucination Guardrails
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-box-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg-row ${m.sender}`}>
            <div className="chat-bubble">
              <div>{m.text}</div>

              {/* Citations (Official Gazette & IS Standards) */}
              {m.citations && m.citations.length > 0 && (
                <div className="chips-container">
                  {m.citations.map((c, i) => (
                    <span
                      key={i}
                      className={`chip-citation ${c.kind}`}
                      title={c.ref}
                    >
                      {c.kind === 'standard' ? '🏷️ ' : '📜 '}
                      {c.ref}
                      {c.status ? ` (${c.status})` : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* Refusal / Helpline Alert Card */}
              {m.abstained && (
                <div className="refusal-alert-card">
                  <div className="refusal-alert-title">
                    <ShieldAlert size={16} />
                    Official Refusal — Zero-Hallucination Guard Active
                  </div>
                  <div>
                    This inquiry cannot be answered from authenticated gazettes or published Indian Standards.
                  </div>
                  <div className="refusal-helpline">
                    📞 Bureau of Indian Standards Helpline: 1800-11-4000 (bis.gov.in)
                  </div>
                </div>
              )}

              {/* Compliance Passport Callout inside Chat */}
              {m.passport_url && !m.abstained && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => onViewPassport(m.product)}
                    className="btn-pill"
                    style={{ background: '#181d26', color: '#ffffff', border: 'none' }}
                  >
                    <FileText size={14} />
                    View Compliance Passport Dossier
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* Speaker button */}
              {m.sender === 'bot' && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => speakText(m.text)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                    title="Read out answer"
                  >
                    <Volume2 size={14} />
                  </button>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{m.timestamp}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg-row bot">
            <div className="chat-bubble" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <Sparkles size={16} color="#181d26" />
              <span>Verifying against published QCO Gazette notifications & standards index...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        <div className="quick-prompts-row">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              className="quick-prompt-pill"
              onClick={() => handleSend(p.q)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="input-row-controls">
          <button
            className={`mic-toggle-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleVoice}
            title={isListening ? 'Listening... click to stop' : 'Ask by Hindi/English Voice'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input
            type="text"
            className="editorial-input"
            placeholder="Type a product name, IS number, or HSN code (e.g. 9W LED bulb, 22K gold, toys)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />

          <button
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '14px' }}
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <Send size={15} />
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
