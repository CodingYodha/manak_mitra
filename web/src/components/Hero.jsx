import React from 'react';
import { Award, Search, FileText, ArrowRight, Building2, Scale, ShieldCheck } from 'lucide-react';

export default function Hero({ onStartChat, onOpenPassport, onOpenVerifier }) {
  return (
    <div>
      <section className="hero-editorial">
        <div className="container">
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
            <button className="btn-primary" onClick={onStartChat}>
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
