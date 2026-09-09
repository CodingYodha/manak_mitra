import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ChatAssistant from './components/Chat/ChatAssistant';
import StandardsGraph from './components/KnowledgeGraph/StandardsGraph';
import CompliancePassport from './components/Passport/CompliancePassport';
import MarkVerifier from './components/MarkVerifier/MarkVerifier';
import SchemeTimeline from './components/Schemes/SchemeTimeline';
import LabLocator from './components/LabLocator/LabLocator';
import MinistryDashboard from './components/Dashboard/MinistryDashboard';
import Footer from './components/Footer';

import {
  FileText,
  ShieldCheck,
  Building2,
  Clock,
  MapPin,
  ExternalLink,
  ArrowRight,
  Sparkles,
  PhoneCall
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('assistant');
  const [focusedStandard, setFocusedStandard] = useState(null);

  const handleSelectStandard = (isNumber) => {
    setFocusedStandard(isNumber);
    setActiveTab('graph');
  };

  const handleOpenPassport = () => {
    setActiveTab('passport');
  };

  const handleOpenVerifier = () => {
    setActiveTab('verifier');
  };

  return (
    <div className="airtable-site">
      {/* 1. TOP NAVIGATION BAR (No Auth Required) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPassport={handleOpenPassport}
      />

      {/* 2. TABBED MAIN VIEWS OR FULL EDITORIAL LANDING */}
      {activeTab === 'assistant' && (
        <>
          {/* Hero Section */}
          <Hero
            onStartChat={() => {
              const el = document.getElementById('chat-core');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onOpenPassport={handleOpenPassport}
            onOpenVerifier={handleOpenVerifier}
          />

          {/* Interactive AI Assistant Core */}
          <section id="chat-core" className="section-rhythm" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
            <div className="container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                <div>
                  <h2 className="title-lg" style={{ marginBottom: '6px' }}>Bilingual Regulatory Query Interface</h2>
                  <p className="body-md" style={{ color: 'var(--color-muted)' }}>
                    Type or speak in Hindi or English. Grounded directly in gazetted orders with zero hallucination.
                  </p>
                </div>
                <div>
                  <button
                    className="btn-pill"
                    onClick={() => setActiveTab('graph')}
                  >
                    View Standards Graph →
                  </button>
                </div>
              </div>

              <ChatAssistant
                onSelectNode={handleSelectStandard}
                onViewPassport={handleOpenPassport}
              />
            </div>
          </section>

          {/* Signature Coral Card: The Compliance Passport (Demo Beat 3) */}
          <div className="container">
            <div className="signature-card-coral">
              <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '4px', marginBottom: '16px' }}>
                DEMO BEAT 3 · THE MONEY SHOT
              </div>
              <h2 className="display-md">The Compliance Passport. Total regulatory clarity in one page.</h2>
              <p>
                Transforms months of confusing bureaucratic search into an instant, verified regulatory dossier.
                Combines the governing QCO Gazette notification, applicable Indian Standard, required markings, nearest accredited testing labs, indicative fees, and audit timelines into a single printable document.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn-secondary-on-dark" onClick={handleOpenPassport}>
                  <FileText size={16} />
                  Open Compliance Passport Generator
                </button>
                <button className="btn-secondary-on-dark" onClick={handleOpenVerifier}>
                  <ShieldCheck size={16} />
                  Verify Mark / HUID Syntax
                </button>
              </div>
            </div>
          </div>

          {/* Multi-Card Demo Grid (Pastel Surfaces from design.md: Peach, Mint, Cream) */}
          <section className="demo-grid-section">
            <div className="container">
              <div className="demo-grid-header">
                <h2 className="display-md" style={{ marginBottom: '8px' }}>Three Demo Anchors. Tested Across Every Feature.</h2>
                <p className="body-md" style={{ color: 'var(--color-muted)', maxWidth: '640px' }}>
                  From mandatory electronics safety to hallmarked gold and children's toy security, Manak Mitra handles every primary BIS scheme.
                </p>
              </div>

              <div className="demo-cards-3up">
                {/* Peach Card: LED Bulb */}
                <div className="demo-card surface-peach">
                  <div>
                    <span className="caption" style={{ color: '#7c2d12', fontWeight: 600 }}>01 · ELECTRONICS & IT</span>
                    <h3 className="title-md" style={{ marginTop: '8px', marginBottom: '12px' }}>9W LED Lamp</h3>
                    <p className="body-md" style={{ color: '#431407', marginBottom: '20px' }}>
                      Governed by the <strong>Electronics & IT Goods QCO</strong>. Requires mandatory Compulsory Registration Scheme (CRS) and safety testing under <strong>IS 16102 (Part 1)</strong>.
                    </p>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#7c2d12', marginBottom: '12px' }}>
                      • Scheme: CRS Registration<br/>
                      • Standard: IS 16102 (Part 1)<br/>
                      • Testing: 15–30 days
                    </div>
                    <button
                      className="btn-pill"
                      style={{ background: '#ffffff', color: '#181d26', width: '100%', justifyContent: 'center' }}
                      onClick={handleOpenPassport}
                    >
                      Generate LED Passport
                    </button>
                  </div>
                </div>

                {/* Mint Card: Children's Toys */}
                <div className="demo-card surface-mint">
                  <div>
                    <span className="caption" style={{ color: '#064e3b', fontWeight: 600 }}>02 · CHILD SAFETY</span>
                    <h3 className="title-md" style={{ marginTop: '8px', marginBottom: '12px' }}>Children's Plastic Toy</h3>
                    <p className="body-md" style={{ color: '#022c22', marginBottom: '20px' }}>
                      Governed by the <strong>Toys (Quality Control) Order</strong> under DPIIT. Requires mandatory <strong>ISI Standard Mark (Scheme-I)</strong> with factory audit and mechanical safety under <strong>IS 9873 (Part 1)</strong>.
                    </p>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#064e3b', marginBottom: '12px' }}>
                      • Scheme: ISI Certification (Scheme-I)<br/>
                      • Standard: IS 9873 (Part 1)<br/>
                      • Factory Audit: 10–15 days
                    </div>
                    <button
                      className="btn-pill"
                      style={{ background: '#ffffff', color: '#181d26', width: '100%', justifyContent: 'center' }}
                      onClick={handleOpenPassport}
                    >
                      Generate Toy Passport
                    </button>
                  </div>
                </div>

                {/* Cream Card: 22K Gold Ring */}
                <div className="demo-card surface-cream">
                  <div>
                    <span className="caption" style={{ color: '#78350f', fontWeight: 600 }}>03 · PRECIOUS METALS</span>
                    <h3 className="title-md" style={{ marginTop: '8px', marginBottom: '12px' }}>22K Gold Jewellery</h3>
                    <p className="body-md" style={{ color: '#451a03', marginBottom: '20px' }}>
                      Governed by the <strong>Hallmarking of Gold Jewellery Order</strong> under DoCA. Requires 6-digit alphanumeric <strong>HUID</strong> laser engraved with purity 916 under <strong>IS 1417</strong>.
                    </p>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#78350f', marginBottom: '12px' }}>
                      • Scheme: Mandatory Hallmarking<br/>
                      • Purity: 22K (916 Fineness)<br/>
                      • Assaying Turnaround: 1–2 days
                    </div>
                    <button
                      className="btn-pill"
                      style={{ background: '#ffffff', color: '#181d26', width: '100%', justifyContent: 'center' }}
                      onClick={handleOpenPassport}
                    >
                      Generate Gold Passport
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Cream Callout Band: Testing Laboratories */}
          <div className="container">
            <div className="callout-band-cream">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <span className="caption" style={{ color: '#78350f', fontWeight: 600 }}>ACCREDITED TESTING INFRASTRUCTURE</span>
                  <h2 className="title-lg" style={{ marginTop: '4px' }}>Recognised BIS Testing Laboratories</h2>
                  <p className="body-md" style={{ color: '#451a03', marginTop: '6px', maxWidth: '640px' }}>
                    Access accredited public and regional testing facilities authorized to execute authentic test procedures for BIS certification.
                  </p>
                </div>
                <button className="btn-secondary" style={{ background: '#ffffff' }} onClick={() => setActiveTab('labs')}>
                  Explore All Labs Directory →
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#181d26', fontWeight: 600, fontSize: '14.5px', marginBottom: '4px' }}>
                    <MapPin size={16} color="#2563eb" />
                    National Test House (NR), New Delhi
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b' }}>Accredited Scope: Electronics, Toys, Lighting, Cement</div>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#181d26', fontWeight: 600, fontSize: '14.5px', marginBottom: '4px' }}>
                    <MapPin size={16} color="#2563eb" />
                    BIS Western Regional Lab, Mumbai
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b' }}>Accredited Scope: CRS Electronics, Gold Hallmarking</div>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#181d26', fontWeight: 600, fontSize: '14.5px', marginBottom: '4px' }}>
                    <MapPin size={16} color="#2563eb" />
                    Central Power Research Institute (CPRI), Bangalore
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b' }}>Accredited Scope: Lamp Ballasts, Power Electronics</div>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Forest Card: Certification Schemes */}
          <div className="container">
            <div className="signature-card-forest">
              <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '4px', marginBottom: '16px' }}>
                COMPLIANCE ROADMAP
              </div>
              <h2 className="display-md">Transparent Scheme Timelines & Statutory Fees.</h2>
              <p>
                Know exact audit durations, laboratory testing cycles, and government fee schedules before initiating your application.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn-secondary-on-dark" onClick={() => setActiveTab('schemes')}>
                  Explore Scheme Decision Trees
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Signature Dark Card: Ministry Dashboard */}
          <div className="container">
            <div className="signature-card-dark">
              <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255, 255, 255, 0.15)', padding: '4px 10px', borderRadius: '4px', marginBottom: '16px' }}>
                DEMO BEAT 6 · REGULATORY INTELLIGENCE
              </div>
              <h2 className="display-md">Ministry of Consumer Affairs Regulatory Intelligence.</h2>
              <p>
                "And here is what this gives you." Live telemetry on what Indian citizens and manufacturers are asking, regional language distribution, and regulatory gaps where new QCOs are needed.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn-secondary-on-dark" onClick={() => setActiveTab('dashboard')}>
                  Open Ministry Analytics Dashboard
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Light Gray CTA Banner */}
          <div className="container">
            <div className="cta-band-light">
              <div>
                <h2 className="title-lg">Verify your product against Indian Standards today.</h2>
                <p className="body-md" style={{ color: 'var(--color-muted)' }}>
                  Legally grounded compliance intelligence. Open, accessible, and verified.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-primary" onClick={() => {
                  const el = document.getElementById('chat-core');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Ask Compliance Assistant
                </button>
                <a href="tel:1800114000" className="btn-secondary">
                  <PhoneCall size={14} />
                  Helpline 1800-11-4000
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Standalone Section: Standards Knowledge Graph */}
      {activeTab === 'graph' && (
        <StandardsGraph
          focusedStandard={focusedStandard}
          onSelectStandard={(std) => setFocusedStandard(std)}
        />
      )}

      {/* Standalone Section: Compliance Passport */}
      {activeTab === 'passport' && (
        <CompliancePassport />
      )}

      {/* Standalone Section: Mark Verifier */}
      {activeTab === 'verifier' && (
        <MarkVerifier />
      )}

      {/* Standalone Section: Certification Schemes */}
      {activeTab === 'schemes' && (
        <SchemeTimeline />
      )}

      {/* Standalone Section: Testing Laboratories */}
      {activeTab === 'labs' && (
        <LabLocator />
      )}

      {/* Standalone Section: Ministry Dashboard */}
      {activeTab === 'dashboard' && (
        <MinistryDashboard />
      )}

      {/* 3. EDITORIAL FOOTER */}
      <Footer onNavigate={(tab) => setActiveTab(tab)} />
    </div>
  );
}
