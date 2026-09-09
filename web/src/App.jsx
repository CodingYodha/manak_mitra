import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  MapPin,
  Clock,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  Award,
  Search,
  Sparkles,
  ArrowRight,
  Printer,
  ChevronRight,
  Building2,
  Scale
} from 'lucide-react';
import ChatPanel from './components/Chat/ChatPanel';

export default function App() {
  const [activeSection, setActiveSection] = useState('assistant');
  const [activePassportProduct, setActivePassportProduct] = useState(null);
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [focusedStandard, setFocusedStandard] = useState(null);
  const [graphNodes, setGraphNodes] = useState([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [labsList, setLabsList] = useState([]);

  // Load labs & graph data on startup
  useEffect(() => {
    fetch('http://localhost:8000/labs/near')
      .then((res) => res.json())
      .then((data) => setLabsList(data.labs || []))
      .catch((err) => console.log('Labs load note:', err));

    fetch('http://localhost:8000/graph')
      .then((res) => res.json())
      .then((data) => setGraphNodes(data.nodes || []))
      .catch((err) => console.log('Graph load note:', err));
  }, []);

  const handleOpenPassport = (productName) => {
    setActivePassportProduct(productName || '9W LED Bulb (Self-Ballasted)');
    setShowPassportModal(true);
  };

  const handleSelectStandardFromChat = (isNumber) => {
    setFocusedStandard(isNumber);
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="airtable-site">
      {/* 1. TOP NAV (Airtable-style 64px white bar, hairline border) */}
      <header className="airtable-nav">
        <div className="container nav-container">
          <div className="nav-left">
            <a href="#" className="nav-brand">
              <div className="nav-logo-mark">M</div>
              <div>
                <span className="nav-title">Manak Mitra</span>
                <span className="hindi">मानक मित्र</span>
              </div>
            </a>

            <ul className="nav-links">
              <li>
                <button
                  className={`nav-link-item ${activeSection === 'assistant' ? 'active' : ''}`}
                  onClick={() => { setActiveSection('assistant'); scrollTo('assistant-section'); }}
                >
                  AI Assistant
                </button>
              </li>
              <li>
                <button
                  className={`nav-link-item ${activeSection === 'benchmarks' ? 'active' : ''}`}
                  onClick={() => { setActiveSection('benchmarks'); scrollTo('benchmarks-section'); }}
                >
                  Products & Schemes
                </button>
              </li>
              <li>
                <button
                  className={`nav-link-item ${activeSection === 'passport' ? 'active' : ''}`}
                  onClick={() => { setActiveSection('passport'); scrollTo('passport-section'); }}
                >
                  Compliance Passport
                </button>
              </li>
              <li>
                <button
                  className={`nav-link-item ${activeSection === 'labs' ? 'active' : ''}`}
                  onClick={() => { setActiveSection('labs'); scrollTo('labs-section'); }}
                >
                  Testing Labs
                </button>
              </li>
              <li>
                <button
                  className={`nav-link-item ${activeSection === 'dashboard' ? 'active' : ''}`}
                  onClick={() => { setActiveSection('dashboard'); scrollTo('dashboard-section'); }}
                >
                  Ministry Intelligence
                </button>
              </li>
            </ul>
          </div>

          <div className="nav-right">
            <a href="tel:1800114000" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13.5px' }}>
              <PhoneCall size={14} />
              Helpline 1800-11-4000
            </a>
            <button
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '13.5px' }}
              onClick={() => handleOpenPassport('9W LED Bulb')}
            >
              Get Passport
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO BAND (Quietly editorial, pure white canvas, generous whitespace) */}
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
            Verify mandatory certification across 23,573 Indian Standards and Quality Control Orders (QCOs).
            Grounded in published e-Gazette orders, accredited testing laboratories, and instant Compliance Passports.
          </p>

          <div className="hero-actions">
            <button className="btn-primary" onClick={() => scrollTo('assistant-section')}>
              <Search size={16} />
              Ask Compliance Assistant
            </button>
            <button className="btn-secondary" onClick={() => scrollTo('benchmarks-section')}>
              Explore 3 Demo Benchmarks
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* 3. MONOCHROME PARTNER & GOVERNANCE STRIP */}
      <div className="container">
        <div className="partner-strip">
          <div className="partner-strip-label">Regulated under and integrated with</div>
          <div className="partner-logos">
            <div className="partner-badge"><Building2 size={16} /> Ministry of Consumer Affairs</div>
            <div className="partner-badge"><Scale size={16} /> Bureau of Indian Standards (BIS)</div>
            <div className="partner-badge"><ShieldCheck size={16} /> e-Gazette of India (QCOs)</div>
            <div className="partner-badge"><Building2 size={16} /> DPIIT & MeitY Orders</div>
            <div className="partner-badge"><Award size={16} /> National Test House (NTH)</div>
          </div>
        </div>
      </div>

      {/* 4. INTERACTIVE ASSISTANT & KNOWLEDGE GRAPH (Main Product Core) */}
      <section id="assistant-section" className="section-rhythm" style={{ paddingTop: '48px', paddingBottom: '48px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <h2 className="title-lg" style={{ marginBottom: '8px' }}>Bilingual Regulatory Query Interface</h2>
              <p className="body-md" style={{ color: 'var(--color-muted)' }}>
                Ask in English or Hindi by voice or text. If a product has no official mandate, the system explicitly refuses and refers you to official channels.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn-pill ${activeSection === 'assistant' ? 'active' : ''}`}
                style={activeSection === 'assistant' ? { background: '#181d26', color: '#fff', border: 'none' } : {}}
                onClick={() => setActiveSection('assistant')}
              >
                Chat Assistant
              </button>
              <button
                className={`btn-pill ${activeSection === 'graph' ? 'active' : ''}`}
                style={activeSection === 'graph' ? { background: '#181d26', color: '#fff', border: 'none' } : {}}
                onClick={() => setActiveSection('graph')}
              >
                Standards Graph ({graphNodes.length > 0 ? graphNodes.length : '23,573'})
              </button>
            </div>
          </div>

          {activeSection === 'graph' ? (
            /* Standards Knowledge Graph View */
            <div className="editorial-chat-box" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 className="title-md">Indian Standards (IS) Semantic Cluster Graph</h3>
                  <p className="caption">Visualizing standards clustered by International Classification for Standards (ICS codes).</p>
                </div>
                {focusedStandard && (
                  <div className="chip-citation standard">
                    Focused: <strong>{focusedStandard}</strong>
                  </div>
                )}
              </div>

              <div style={{ height: '420px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  {(graphNodes.length > 0 ? graphNodes.slice(0, 30) : [
                    { id: 'IS 16102 (Part 1)', label: 'Self-Ballasted LED Lamps (Safety Requirements)', group: '29' },
                    { id: 'IS 9873 (Part 1)', label: 'Safety of Toys — Mechanical & Physical Properties', group: '97' },
                    { id: 'IS 1417', label: 'Gold and Gold Alloys, Jewellery/Artefacts (Fineness & Marking)', group: '39' },
                    { id: 'IS 616', label: 'Audio, Video and Similar Electronic Apparatus — Safety', group: '33' },
                    { id: 'IS 694', label: 'Polyvinyl Chloride Insulated Cables', group: '29' },
                    { id: 'IS 269', label: 'Ordinary Portland Cement — Specification', group: '91' }
                  ]).map((node, i) => (
                    <div
                      key={i}
                      style={{
                        background: focusedStandard === node.id ? '#fef3c7' : '#ffffff',
                        border: focusedStandard === node.id ? '2px solid #f59e0b' : '1px solid #dddddd',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setFocusedStandard(node.id)}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', marginBottom: '4px' }}>
                        {node.id} · Group {node.group}
                      </div>
                      <div style={{ fontSize: '13px', color: '#181d26', fontWeight: 500, lineHeight: 1.4 }}>
                        {node.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Chat Assistant Panel */
            <ChatPanel
              onSelectNode={handleSelectStandardFromChat}
              onViewPassport={handleOpenPassport}
            />
          )}
        </div>
      </section>

      {/* 5. SIGNATURE CORAL CARD (Compliance Passport — The Brand Voltage Moment) */}
      <div className="container" id="passport-section">
        <div className="signature-card-coral">
          <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '4px', marginBottom: '16px' }}>
            DEMO BEAT 3 · THE MONEY SHOT
          </div>
          <h2 className="display-md">The Compliance Passport. Complete regulatory certainty in one page.</h2>
          <p>
            Transforms months of confusing bureaucratic search into an instant, verified regulatory dossier.
            Combines the governing QCO Gazette order, applicable Indian Standard, required markings, nearest 3 testing labs, indicative fees, and audit timelines into a single printable document.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn-secondary-on-dark" onClick={() => handleOpenPassport('9W LED Bulb (Self-Ballasted)')}>
              <FileText size={16} />
              Generate 9W LED Bulb Passport (CRS)
            </button>
            <button className="btn-secondary-on-dark" onClick={() => handleOpenPassport("Children's Plastic Toy")}>
              <FileText size={16} />
              Generate Children's Toy Passport (ISI)
            </button>
          </div>
        </div>
      </div>

      {/* 6. MULTI-CARD DEMO GRID (Pastel Surfaces from design.md: Peach, Mint, Cream) */}
      <section id="benchmarks-section" className="demo-grid-section">
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
                  Governed by the <strong>Electronics & IT Goods QCO</strong>. Requires mandatory Compulsory Registration Scheme (CRS) and self-ballasted safety verification under <strong>IS 16102 (Part 1)</strong>.
                </p>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#7c2d12', marginBottom: '12px' }}>
                  • Scheme: CRS Registration<br/>
                  • Standard: IS 16102 (Part 1)<br/>
                  • Testing Duration: 15–30 days
                </div>
                <button
                  className="btn-pill"
                  style={{ background: '#ffffff', color: '#181d26', width: '100%', justifyContent: 'center' }}
                  onClick={() => handleOpenPassport('9W LED Bulb (Self-Ballasted)')}
                >
                  View Passport Dossier
                </button>
              </div>
            </div>

            {/* Mint Card: Children's Toys */}
            <div className="demo-card surface-mint">
              <div>
                <span className="caption" style={{ color: '#064e3b', fontWeight: 600 }}>02 · CHILD SAFETY</span>
                <h3 className="title-md" style={{ marginTop: '8px', marginBottom: '12px' }}>Children's Plastic Toy</h3>
                <p className="body-md" style={{ color: '#022c22', marginBottom: '20px' }}>
                  Governed by the <strong>Toys (Quality Control) Order</strong> under DPIIT. Requires mandatory <strong>ISI Standard Mark (Scheme-I)</strong> with factory inspection and physical testing under <strong>IS 9873 (Part 1)</strong>.
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
                  onClick={() => handleOpenPassport("Children's Plastic Toy")}
                >
                  View Passport Dossier
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
                  • Center Assaying: 1–2 days
                </div>
                <button
                  className="btn-pill"
                  style={{ background: '#ffffff', color: '#181d26', width: '100%', justifyContent: 'center' }}
                  onClick={() => handleOpenPassport('22K Gold Ring')}
                >
                  View Passport Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CREAM CALLOUT BAND (Recognised BIS Testing Laboratories) */}
      <div className="container" id="labs-section">
        <div className="callout-band-cream">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
            <div>
              <span className="caption" style={{ color: '#78350f', fontWeight: 600 }}>ACCREDITED TESTING INFRASTRUCTURE</span>
              <h2 className="title-lg" style={{ marginTop: '4px' }}>Recognised BIS Testing Laboratories</h2>
              <p className="body-md" style={{ color: '#451a03', marginTop: '6px', maxWidth: '640px' }}>
                Direct integration with accredited testing centers to ensure manufacturers test against authentic Indian Standards.
              </p>
            </div>
            <a href="https://bis.gov.in" target="_blank" rel="noreferrer" className="btn-secondary" style={{ background: '#ffffff' }}>
              View Official Directory
              <ExternalLink size={14} />
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {(labsList.length > 0 ? labsList : [
              { name: 'National Test House (NR)', city: 'New Delhi', state: 'Delhi', categories: 'electronics, toys' },
              { name: 'BIS Western Regional Laboratory', city: 'Mumbai', state: 'Maharashtra', categories: 'gold, electronics' },
              { name: 'Central Power Research Institute (CPRI)', city: 'Bangalore', state: 'Karnataka', categories: 'electronics, electrical' }
            ]).map((lab, i) => (
              <div key={i} style={{ background: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#181d26', fontWeight: 600, fontSize: '14.5px', marginBottom: '6px' }}>
                  <MapPin size={16} color="#2563eb" />
                  {lab.name}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                  {lab.city}, {lab.state}
                </div>
                <div style={{ fontSize: '12px', color: '#15803d', background: '#f0fdf4', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                  Testing: {lab.categories}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8. SIGNATURE FOREST CARD (Scheme Decision Tree & Certification Roadmap) */}
      <div className="container">
        <div className="signature-card-forest">
          <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '4px', marginBottom: '16px' }}>
            STEP-BY-STEP COMPLIANCE JOURNEY
          </div>
          <h2 className="display-md">Transparent Scheme Timelines & Indicative Fees.</h2>
          <p>
            No hidden costs, no middleman ambiguity. Every scheme timeline is mapped deterministically from official regulations.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '24px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <h3 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '12px' }}>CRS (Electronics & IT)</h3>
              <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6 }}>
                1. Lab Testing (15–30 days)<br/>
                2. Online Application (1–2 days)<br/>
                3. BIS Registration (15–20 days)<br/>
                <strong>Fee: ₹1,000 + GST</strong>
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <h3 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '12px' }}>ISI Mark (Scheme-I)</h3>
              <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6 }}>
                1. Sample Testing (30–60 days)<br/>
                2. Factory Inspection (10–15 days)<br/>
                3. Licence Grant (20–30 days)<br/>
                <strong>Fee: ₹1,000 + Testing</strong>
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <h3 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '12px' }}>Hallmarking (Gold)</h3>
              <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6 }}>
                1. Assaying at A&H Center (1–2 days)<br/>
                2. Laser Marking of HUID (1–2 days)<br/>
                3. Portal Synchronization (Instant)<br/>
                <strong>Fee: ₹2,000 / batch</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 9. SIGNATURE DARK CARD (Ministry of Consumer Affairs Regulatory Dashboard) */}
      <div className="container" id="dashboard-section">
        <div className="signature-card-dark">
          <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255, 255, 255, 0.15)', padding: '4px 10px', borderRadius: '4px', marginBottom: '16px' }}>
            DEMO BEAT 6 · REGULATORY INTELLIGENCE
          </div>
          <h2 className="display-md">Ministry Dashboard: Real-time Compliance Demand & Gap Analytics.</h2>
          <p>
            "And here is what this gives you." Total transparency into what manufacturers and citizens are asking, regional language splits, and the exact questions where regulations need clearer publication.
          </p>

          {/* Stats Metrics 4-across */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>TOTAL INQUIRIES</div>
              <div style={{ fontSize: '28px', fontWeight: 500, color: '#ffffff', marginTop: '4px' }}>148</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>VERIFIED MATCHES</div>
              <div style={{ fontSize: '28px', fontWeight: 500, color: '#4ade80', marginTop: '4px' }}>93.2%</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>ABSTAINED / REFUSED</div>
              <div style={{ fontSize: '28px', fontWeight: 500, color: '#f87171', marginTop: '4px' }}>6.8%</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>HINDI / VERNACULAR</div>
              <div style={{ fontSize: '28px', fontWeight: 500, color: '#60a5fa', marginTop: '4px' }}>41.5%</div>
            </div>
          </div>

          {/* High Priority Unanswered Questions Log */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '20px' }}>
            <h4 style={{ color: '#f87171', fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} />
              High Priority Regulatory Gaps Log (Unaddressed Queries)
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>
              The system protected compliance integrity by refusing to guess. These queries represent high citizen interest with pending QCO publication:
            </p>
            <div style={{ fontSize: '13.5px', color: '#e2e8f0', lineHeight: 1.8 }}>
              • <em>"Are imported lithium cells under mandatory certification for agricultural drones?"</em> (Score 0.49 - Abstained)<br/>
              • <em>"Does recycled corrugated paper packaging require compulsory eco-mark?"</em> (Score 0.51 - Abstained)<br/>
              • <em>"What is the airspeed of an unladen swallow?"</em> (Trap query - Refused, helpline provided)
            </div>
          </div>
        </div>
      </div>

      {/* 10. LIGHT GRAY CTA BANNER (from design.md: cta-band-light) */}
      <div className="container">
        <div className="cta-band-light">
          <div>
            <h2 className="title-lg">Verify your product against Indian Standards today.</h2>
            <p className="body-md" style={{ color: 'var(--color-muted)' }}>
              Accurate, legally grounded, and multi-channel. Accessible via Web, Voice, and WhatsApp.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-primary" onClick={() => scrollTo('assistant-section')}>
              Start Inquiry
            </button>
            <a href="tel:1800114000" className="btn-secondary">
              BIS Helpline: 1800-11-4000
            </a>
          </div>
        </div>
      </div>

      {/* 11. FOOTER (Light surface, 4-column editorial list) */}
      <footer className="editorial-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div className="nav-logo-mark">M</div>
                <strong style={{ fontSize: '16px', color: '#181d26' }}>Manak Mitra</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, maxWidth: '320px' }}>
                Built with pride for the Smart India Hackathon 2026 (PS 26107). Dedicated to Indian MSMEs, manufacturers, and consumer safety.
              </p>
            </div>

            <div className="footer-col">
              <h4>Certification Schemes</h4>
              <ul className="footer-links">
                <li><a href="#benchmarks-section">Compulsory Registration (CRS)</a></li>
                <li><a href="#benchmarks-section">ISI Certification (Scheme-I)</a></li>
                <li><a href="#benchmarks-section">Hallmarking & HUID</a></li>
                <li><a href="#benchmarks-section">Foreign Manufacturers (FMCS)</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Official Resources</h4>
              <ul className="footer-links">
                <li><a href="https://bis.gov.in" target="_blank" rel="noreferrer">BIS Portal</a></li>
                <li><a href="https://crsbis.in" target="_blank" rel="noreferrer">CRS Portal</a></li>
                <li><a href="https://egazette.gov.in" target="_blank" rel="noreferrer">e-Gazette of India</a></li>
                <li><a href="https://bhashini.gov.in" target="_blank" rel="noreferrer">Bhashini Mission</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>National Helpline</h4>
              <ul className="footer-links">
                <li><a href="tel:1800114000">Toll-Free: 1800-11-4000</a></li>
                <li><a href="mailto:complaints@bis.gov.in">complaints@bis.gov.in</a></li>
                <li><a href="#">BIS CARE Mobile App</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <div>
              © 2026 Manak Mitra · Team CodingYodha · Ministry of Consumer Affairs, Food & Public Distribution
            </div>
            <div>
              Authoritative Zero-Hallucination Standards Assistant
            </div>
          </div>
        </div>
      </footer>

      {/* COMPLIANCE PASSPORT MODAL (1-page printable dossier) */}
      {showPassportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowPassportModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '780px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '36px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dossier Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #181d26', paddingBottom: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 600 }}>
                  GOVERNMENT OF INDIA · BUREAU OF INDIAN STANDARDS
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>
                  Product Compliance Passport
                </h2>
                <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                  STATUS: MANDATORY QUALITY CONTROL ORDER NOTIFIED
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  Print / Save PDF
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  onClick={() => setShowPassportModal(false)}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Dossier Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>TARGET PRODUCT</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>
                  {activePassportProduct || '9W LED Bulb (Self-Ballasted)'}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>HSN Code: 8539 | General Lighting Services</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>APPLICABLE STANDARD</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>
                  IS 16102 (Part 1): 2012
                </div>
                <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 500, marginTop: '2px' }}>Active · Safety Requirements</div>
              </div>
            </div>

            {/* Governing QCO Order */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>GOVERNING GAZETTE NOTIFICATION</div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: '#181d26', marginTop: '4px' }}>
                Electronics and Information Technology Goods (Requirement for Compulsory Registration) Order
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Notified by: Ministry of Electronics and Information Technology (MeitY) · e-Gazette S.O. 2357(E)
              </div>
            </div>

            {/* Testing Requirements & Labs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>TEST DURATION</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>15–30 Days</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Accredited Lab Sample</div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>INDICATIVE BIS FEE</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>₹1,000 + GST</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Portal Application</div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>REQUIRED MARK</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>CRS R-Number</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>R-XXXXXXXX Format</div>
              </div>
            </div>

            {/* Nearest Testing Labs */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}>
                ACCREDITED TESTING LABORATORIES
              </div>
              <div style={{ fontSize: '13px', color: '#181d26', lineHeight: 1.6 }}>
                1. <strong>National Test House (NR)</strong>, New Delhi — Scope: Electronics & Lighting Safety<br/>
                2. <strong>BIS Western Regional Laboratory</strong>, Mumbai — Scope: CRS Safety Tests<br/>
                3. <strong>Central Power Research Institute (CPRI)</strong>, Bangalore — Scope: Lamp Ballast Testing
              </div>
            </div>

            {/* Footer verification note */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
              <div>Generated by Manak Mitra AI · Bureau of Indian Standards Verified Citation Engine</div>
              <div>Official Helpline: <strong>1800-11-4000</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
