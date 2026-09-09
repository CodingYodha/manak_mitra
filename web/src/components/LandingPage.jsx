import React from 'react';
import {
  Award,
  FileText,
  ArrowRight,
  Building2,
  Scale,
  ShieldCheck,
  Sparkles,
  Network,
  Clock,
  Globe,
  CheckCircle2
} from 'lucide-react';
import KGHeroAnimation from './KGHeroAnimation';

export default function LandingPage({ onNavigate }) {
  return (
    <div className="landing-page">

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO BAND: 3D KG Demo (Left) + Text & Problem Statement (Right)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-hero-band">
        <div className="container">
          <div className="landing-hero-inner">

            {/* Left — 3D Knowledge Graph Traversal Demo */}
            <div className="hero-kg-demo-col">
              <div className="hero-kg-card">
                <div className="hero-kg-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="mini-ai-icon-mark"><Network size={14} color="#181d26" /></div>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                      Knowledge Graph Traversal
                    </span>
                  </div>
                  <div className="hero-mini-ai-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    <span className="live-dot" style={{ background: '#38bdf8' }} />
                    26k+ Nodes
                  </div>
                </div>

                <KGHeroAnimation />

                <div className="hero-kg-card-footer">
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    Live query resolution · e-Gazette QCOs & Labs
                  </span>
                  <button
                    className="hero-kg-explore-link"
                    onClick={() => onNavigate('graph')}
                  >
                    Open Graph →
                  </button>
                </div>
              </div>
            </div>

            {/* Right — Hero Copy & Actions */}
            <div className="landing-hero-copy">
              <div className="hero-tag" style={{ marginBottom: '18px' }}>
                <Award size={14} color="#181d26" />
                <span>
                  Smart India Hackathon 2026 ·{' '}
                  <span className="badge-num">PS 26107</span>
                </span>
              </div>

              <h1 className="landing-headline display-lg">
                BIS compliance is a labyrinth.{' '}
                <span className="landing-headline-accent">We mapped it.</span>
              </h1>

              <p className="landing-subhead">
                Every regulatory query triggers a real-time graph traversal — from product
                to <strong>23,573 Indian Standards</strong> to governing QCOs and accredited testing labs.
                Authoritative compliance intelligence in seconds, grounded strictly in gazetted e-Gazette orders with zero hallucination.
              </p>

              <div className="landing-hero-actions">
                <button
                  className="btn-primary landing-cta-primary"
                  onClick={() => onNavigate('ai')}
                >
                  <Sparkles size={16} />
                  Launch AI Assistant
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => onNavigate('graph')}
                >
                  <Network size={16} />
                  Explore Knowledge Graph
                </button>
              </div>

              {/* Quick stats */}
              <div className="landing-inline-stats">
                <div className="landing-stat-item">
                  <span className="landing-stat-num">23,573</span>
                  <span className="landing-stat-label">Indian Standards</span>
                </div>
                <div className="landing-stat-divider" />
                <div className="landing-stat-item">
                  <span className="landing-stat-num">Zero</span>
                  <span className="landing-stat-label">Hallucinations</span>
                </div>
                <div className="landing-stat-divider" />
                <div className="landing-stat-item">
                  <span className="landing-stat-num">Hi + En</span>
                  <span className="landing-stat-label">Bilingual AI</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Ministry / partner strip */}
      <div className="container">
        <div className="partner-strip">
          <div className="partner-strip-label">Regulated under & integrated with</div>
          <div className="partner-logos">
            <div className="partner-badge"><Building2 size={15} /> Ministry of Consumer Affairs</div>
            <div className="partner-badge"><Scale size={15} /> Bureau of Indian Standards (BIS)</div>
            <div className="partner-badge"><ShieldCheck size={15} /> e-Gazette of India (QCOs)</div>
            <div className="partner-badge"><Building2 size={15} /> DPIIT & MeitY Mandates</div>
            <div className="partner-badge"><Award size={15} /> National Test House (NTH)</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — PROBLEM STATEMENT STATS
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-stats-section">
        <div className="container">
          <div className="landing-stats-grid">
            <div className="landing-stat-card">
              <div className="stat-card-icon" style={{ background: '#fef3c7' }}>
                <Clock size={20} color="#d97706" />
              </div>
              <div className="stat-card-num">3–6 months</div>
              <div className="stat-card-title">Average compliance journey</div>
              <div className="stat-card-desc">
                MSMEs and importers spend months manually cross-referencing
                QCOs, standards, labs, and fee schedules before a single
                certification application.
              </div>
              <div className="stat-card-resolution">
                <CheckCircle2 size={14} color="#10b981" />
                Manak Mitra reduces this to <strong>minutes</strong>
              </div>
            </div>

            <div className="landing-stat-card">
              <div className="stat-card-icon" style={{ background: '#ede9fe' }}>
                <Globe size={20} color="#7c3aed" />
              </div>
              <div className="stat-card-num">23,573</div>
              <div className="stat-card-title">Indian Standards — impossible to navigate alone</div>
              <div className="stat-card-desc">
                BIS maintains a sprawling catalogue of active standards across
                ICS domains — electronics, toys, jewellery, cement, steel, food
                — with no unified search or dependency mapping.
              </div>
              <div className="stat-card-resolution">
                <CheckCircle2 size={14} color="#10b981" />
                All indexed in a live <strong>Knowledge Graph</strong>
              </div>
            </div>

            <div className="landing-stat-card">
              <div className="stat-card-icon" style={{ background: '#dcfce7' }}>
                <Sparkles size={20} color="#16a34a" />
              </div>
              <div className="stat-card-num">Hindi + English</div>
              <div className="stat-card-title">First bilingual regulatory AI</div>
              <div className="stat-card-desc">
                Indian manufacturers in tier-2 and tier-3 cities primarily
                communicate in Hindi. No existing platform provides bilingual
                compliance guidance grounded in official sources.
              </div>
              <div className="stat-card-resolution">
                <CheckCircle2 size={14} color="#10b981" />
                Voice + text, <strong>zero hallucination policy</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — FEATURE GRID (2×2)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-features-section">
        <div className="container">
          <div className="landing-section-label">
            <Sparkles size={14} />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="landing-section-title">Everything you need to navigate BIS compliance.</h2>

          <div className="landing-features-grid">

            {/* AI Assistant */}
            <div className="landing-feature-card feature-ai">
              <div className="feature-card-icon">
                <Sparkles size={22} color="#aa2d00" />
              </div>
              <h3 className="feature-card-title">Bilingual AI Assistant</h3>
              <p className="feature-card-desc">
                Ask regulatory questions in Hindi or English. Get citations from
                official e-Gazette orders. Zero hallucination — if it's not in
                the gazette, the AI says so.
              </p>
              <div className="feature-card-tags">
                <span className="feature-tag">Voice Input</span>
                <span className="feature-tag">Hindi Support</span>
                <span className="feature-tag">IS Citations</span>
              </div>
              <button className="feature-card-cta" onClick={() => onNavigate('ai')}>
                Launch Assistant <ArrowRight size={14} />
              </button>
            </div>

            {/* Knowledge Graph */}
            <div className="landing-feature-card feature-graph">
              <div className="feature-card-icon">
                <Network size={22} color="#1d4ed8" />
              </div>
              <h3 className="feature-card-title">Standards Knowledge Graph</h3>
              <p className="feature-card-desc">
                Interactive 3D visualisation of all 23,573 Indian Standards
                and their relationships — QCOs, ICS clusters, testing labs, and
                certification schemes — in one navigable graph.
              </p>
              <div className="feature-card-tags">
                <span className="feature-tag">3D Interactive</span>
                <span className="feature-tag">26k+ Nodes</span>
                <span className="feature-tag">ICS Filtered</span>
              </div>
              <button className="feature-card-cta" onClick={() => onNavigate('graph')}>
                Open Graph <ArrowRight size={14} />
              </button>
            </div>

            {/* Compliance Passport */}
            <div className="landing-feature-card feature-passport">
              <div className="feature-card-icon">
                <FileText size={22} color="#0f766e" />
              </div>
              <h3 className="feature-card-title">Compliance Passport</h3>
              <p className="feature-card-desc">
                Generate a single-page regulatory dossier for any product: the
                governing QCO, applicable Indian Standard, required marks,
                nearest accredited lab, indicative fees, and audit timelines.
              </p>
              <div className="feature-card-tags">
                <span className="feature-tag">Printable PDF</span>
                <span className="feature-tag">Lab Locator</span>
                <span className="feature-tag">Fee Schedule</span>
              </div>
              <button className="feature-card-cta" onClick={() => onNavigate('passport')}>
                Generate Passport <ArrowRight size={14} />
              </button>
            </div>

            {/* Mark Verifier */}
            <div className="landing-feature-card feature-verifier">
              <div className="feature-card-icon">
                <ShieldCheck size={22} color="#6d28d9" />
              </div>
              <h3 className="feature-card-title">Mark & HUID Verifier</h3>
              <p className="feature-card-desc">
                Validate ISI mark syntax, BIS licence numbers, and 6-digit
                HUID alphanumeric codes for gold hallmarking. Instant
                syntactic and format check.
              </p>
              <div className="feature-card-tags">
                <span className="feature-tag">ISI Mark</span>
                <span className="feature-tag">HUID (6-char)</span>
                <span className="feature-tag">BIS Licence</span>
              </div>
              <button className="feature-card-cta" onClick={() => onNavigate('verifier')}>
                Verify Mark <ArrowRight size={14} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5 — DEMO PRODUCTS (condensed)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-demo-section">
        <div className="container">
          <div className="landing-section-label">
            <Award size={14} />
            <span>Three Core Demo Anchors</span>
          </div>
          <h2 className="landing-section-title">
            Tested across every primary BIS scheme.
          </h2>

          <div className="landing-demo-row">
            <div className="landing-demo-item surface-peach">
              <span className="demo-item-num">01</span>
              <div>
                <div className="demo-item-category">Electronics & IT</div>
                <div className="demo-item-product">9W LED Lamp</div>
                <div className="demo-item-standard">IS 16102 (Pt 1) · CRS</div>
              </div>
              <button className="demo-item-cta" onClick={() => onNavigate('passport')}>
                Generate Passport →
              </button>
            </div>

            <div className="landing-demo-item surface-mint">
              <span className="demo-item-num">02</span>
              <div>
                <div className="demo-item-category">Child Safety</div>
                <div className="demo-item-product">Children's Plastic Toy</div>
                <div className="demo-item-standard">IS 9873 (Pt 1) · ISI Scheme-I</div>
              </div>
              <button className="demo-item-cta" onClick={() => onNavigate('passport')}>
                Generate Passport →
              </button>
            </div>

            <div className="landing-demo-item surface-cream">
              <span className="demo-item-num">03</span>
              <div>
                <div className="demo-item-category">Precious Metals</div>
                <div className="demo-item-product">22K Gold Jewellery</div>
                <div className="demo-item-standard">IS 1417 · Mandatory HUID</div>
              </div>
              <button className="demo-item-cta" onClick={() => onNavigate('passport')}>
                Generate Passport →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 6 — FINAL CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-final-cta">
        <div className="container">
          <div className="final-cta-inner">
            <div>
              <h2 className="title-lg" style={{ marginBottom: '6px' }}>
                Verify your product against Indian Standards today.
              </h2>
              <p className="body-md" style={{ color: 'var(--color-muted)' }}>
                Legally grounded compliance intelligence. Open, accessible, and verified.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn-primary" onClick={() => onNavigate('ai')}>
                <Sparkles size={15} />
                Ask Compliance Assistant
              </button>
              <a href="tel:1800114000" className="btn-secondary">
                Helpline 1800-11-4000
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
