import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  FileText,
  AlertTriangle,
  ExternalLink,
  Bot,
  User,
  CheckCircle2,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

const QUICK_PROMPTS = [
  { label: '💡 9W LED Bulb (CRS)', q: 'Do I need BIS certification for 9W LED bulb?' },
  { label: '🇮🇳 हिंदी प्रश्न (Voice)', q: 'क्या मुझे एलईडी बल्ब के लिए बीआईएस चाहिए?' },
  { label: '✨ 22K Gold Ring (HUID)', q: 'What are the hallmarking requirements for 22K gold ring?' },
  { label: '🧸 Plastic Toy (ISI)', q: 'What is the mandatory standard for children plastic toys?' },
  { label: '🚫 Out-of-Domain Refusal', q: 'What is the airspeed of an unladen swallow?' }
];

export default function ChatPanel({ onSelectNode, onViewPassport }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Namaste! I am Manak Mitra, the AI compliance assistant for the Bureau of Indian Standards (BIS). Ask me about Quality Control Orders (QCOs), Indian Standards (IS), certification schemes, fees, or laboratory testing.',
      citations: [],
      abstained: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);

      // If response has highlight nodes, pass to parent for knowledge graph
      if (data.highlight_nodes && data.highlight_nodes.length > 0 && onSelectNode) {
        onSelectNode(data.highlight_nodes[0]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Unable to connect to the standards intelligence server. Please ensure the backend is running on port 8000.',
          citations: [],
          abstained: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Browser Speech-to-Text (STT)
  const toggleVoiceInput = () => {
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
      recognition.lang = 'hi-IN'; // Recognizes Hindi and Indian English
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSend(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Browser Text-to-Speech (TTS)
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const hasHindi = /[\u0900-\u097F]/.test(text);
    utterance.lang = hasHindi ? 'hi-IN' : 'en-IN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="chat-container">
      {/* Messages Scroll Area */}
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`msg-row ${m.sender}`}>
            <div className={`msg-avatar ${m.sender}`}>
              {m.sender === 'bot' ? <Bot size={20} /> : <User size={20} />}
            </div>

            <div className="msg-bubble-wrapper">
              <div className="msg-bubble">
                <div className="msg-text">{m.text}</div>

                {/* Citations Box */}
                {m.citations && m.citations.length > 0 && (
                  <div className="citations-box">
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                      Official Citations:
                    </span>
                    {m.citations.map((c, i) => (
                      <span
                        key={i}
                        className={`citation-chip ${c.kind}`}
                        title={c.ref}
                      >
                        {c.kind === 'standard' ? '🏷️ ' : '📜 '}
                        {c.ref}
                        {c.status && ` (${c.status})`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Refusal / Abstention Card */}
                {m.abstained && (
                  <div className="refusal-card">
                    <div className="refusal-header">
                      <ShieldAlert size={18} />
                      Zero-Hallucination Guardrail Active
                    </div>
                    <div className="refusal-body">
                      This inquiry falls outside authenticated gazette notifications or registered Indian Standards.
                    </div>
                    <div className="helpline-badge">
                      📞 BIS National Helpline: 1800-11-4000
                    </div>
                  </div>
                )}

                {/* Passport Trigger */}
                {m.passport_url && !m.abstained && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <button
                      onClick={() => onViewPassport(m.product)}
                      style={{
                        background: 'rgba(37, 99, 235, 0.2)',
                        border: '1px solid #3b82f6',
                        color: '#93c5fd',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <FileText size={15} />
                      View Compliance Passport Dossier
                    </button>
                  </div>
                )}
              </div>

              {/* Message Footer Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                  fontSize: '0.72rem',
                  color: '#64748b'
                }}
              >
                <span>{m.timestamp}</span>
                {m.sender === 'bot' && (
                  <button
                    onClick={() => speakText(m.text)}
                    style={{
                      background: 'none',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px'
                    }}
                    title="Listen to answer"
                  >
                    <Volume2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg-row bot">
            <div className="msg-avatar bot">
              <Bot size={20} />
            </div>
            <div className="msg-bubble" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} className="status-dot" />
              <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                Consulting BIS Standards database & e-Gazette QCOs...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input & Quick Prompts Area */}
      <div className="chat-input-wrapper">
        <div className="quick-prompts">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              className="prompt-btn"
              onClick={() => handleSend(p.q)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="input-box-row">
          <button
            className={`action-btn mic ${isListening ? 'listening' : ''}`}
            onClick={toggleVoiceInput}
            title={isListening ? 'Listening (click to stop)...' : 'Ask by Hindi / English voice'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input
            type="text"
            className="chat-input"
            placeholder="Ask about a product, IS standard, or HSN code (e.g. 9W LED bulb, 22K gold, toys)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />

          <button
            className="action-btn send"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            title="Send inquiry"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
