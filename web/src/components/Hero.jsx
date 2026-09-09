import React from 'react';
import {
  Award,
  Search,
  FileText,
  ArrowRight,
  Building2,
  Scale,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function Hero({ onStartChat, onOpenPassport, onOpenVerifier }) {
  const samplePrompts = [
    { label: '💡 9W LED Bulb', q: 'Do I need BIS certification for 9W LED bulb?' },
    { label: '🧸 Children Toys', q: 'What is the mandatory standard for children plastic toys?' },
    { label: '✨ 22K Gold (HUID)', q: 'What are the hallmarking requirements for 22K gold ring?' },
    { label: '🇮🇳 हिंदी प्रश्न', q: 'क्या मुझे एलईडी बल्ब के लिए बीआईएस चाहिए?' }
  ];

  const handleBoxClick = (e, query) => {
    e.stopPropagation();
    if (onStartChat) {
      onStartChat(query);
    }
  };

  return (
    <div>
      <section className="hero-editorial">
        <div className="container">
          <div className="hero-grid-2col">
            {/* Left Column: Hero Copy & Actions */}
            <div className="hero-text-col">
              <div className="hero-tag">
                <Award size={14} color="#181d26" />
                <span>Smart India Hackathon 2026 · Problem Statement <span className="badge-num">PS 26107</span></span>
              </div>

              <h1 className="hero-headline display-lg">
                Authoritative BIS standards intelligence. With zero hallucination.
              </h1>

              <p className="hero-subhead">
                Verify mandatory certification requirements across 23,573 Indian Standards and Quality Control Orders (QCOs).
                Grounded strictly in published e-Gazette orders, accredited testing laboratories, and instant Compliance Passports.
              </p>

              <div className="hero-actions">
                <button className="btn-primary" onClick={() => onStartChat && onStartChat()}>
                  <Search size={16} />
                  Launch Assistant
                </button>
                <button className="btn-secondary" onClick={onOpenPassport}>
                  <FileText size={16} />
                  Generate Compliance Passport
                </button>
                <button className="btn-secondary" onClick={onOpenVerifier}>
                  Verify Mark / HUID
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Right Column: Interactive Small AI Box */}
            <div className="hero-ai-preview-col">
              <div
                className="hero-mini-ai-box"
                onClick={(e) => handleBoxClick(e)}
                title="Click to interact with the Compliance Assistant below"
              >
                <div className="hero-mini-ai-header">
                  <div className="hero-mini-ai-title">
                    <div className="mini-ai-icon-mark">
                      <Sparkles size={14} color="#181d26" />
                    </div>
                    <span>Interactive Compliance Assistant</span>
                  </div>
                  <div className="hero-mini-ai-badge">
                    <span className="live-dot" />
                    23,573 Standards
                  </div>
                </div>

                <div className="hero-mini-ai-input-preview">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={15} color="#94a3b8" />
                    <span style={{ color: '#64748b' }}>Ask in Hindi or English...</span>
                  </span>
                  <span className="mini-ask-btn">
                    Ask
                    <ArrowRight size={13} />
                  </span>
                </div>

                <div className="hero-mini-ai-chips">
                  {samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      className="hero-mini-ai-chip"
                      onClick={(e) => handleBoxClick(e, p.q)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="hero-mini-ai-footer">
                  <span>Grounded in gazetted orders</span>
                  <span className="hero-mini-ai-cta">
                    Open Full Assistant ↓
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Monochrome Partner & Ministry Strip */}
      <div className="container">
        <div className="partner-strip">
          <div className="partner-strip-label">Regulated under & integrated with</div>
          <div className="partner-logos">
            <div className="partner-badge"><Building2 size={16} /> Ministry of Consumer Affairs</div>
            <div className="partner-badge"><Scale size={16} /> Bureau of Indian Standards (BIS)</div>
            <div className="partner-badge"><ShieldCheck size={16} /> e-Gazette of India (QCO Orders)</div>
            <div className="partner-badge"><Building2 size={16} /> DPIIT & MeitY Mandates</div>
            <div className="partner-badge"><Award size={16} /> National Test House (NTH)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
