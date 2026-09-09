import React, { useState } from 'react';
import {
  MessageSquare,
  Share2,
  MapPin,
  Clock,
  FileCheck,
  BarChart3,
  ShieldCheck,
  Award
} from 'lucide-react';
import ChatPanel from './components/Chat/ChatPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [activePassportProduct, setActivePassportProduct] = useState(null);

  const handleSelectNode = (nodeId) => {
    setSelectedStandard(nodeId);
  };

  const handleViewPassport = (product) => {
    setActivePassportProduct(product);
    setActiveTab('passport');
  };

  return (
    <div className="app-layout">
      {/* Executive Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-section">
            <div className="emblem-icon">
              <ShieldCheck size={26} color="#60a5fa" />
            </div>
            <div>
              <div className="brand-title">
                MANAK MITRA <span className="hindi">मानक मित्र</span>
              </div>
              <div className="brand-subtitle">
                Bureau of Indian Standards · AI Compliance Assistant
              </div>
            </div>
          </div>

          <div className="header-badges">
            <div className="badge-sih">
              <Award size={13} />
              SIH 2026 · PS 26107
            </div>
            <div className="badge-status">
              <span className="status-dot"></span>
              23,573 Standards Active
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <nav className="nav-tabs-bar">
        <div className="tabs-list">
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={16} />
            Chat Assistant
          </button>
          <button
            className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveTab('graph')}
          >
            <Share2 size={16} />
            Standards Graph
          </button>
          <button
            className={`tab-btn ${activeTab === 'labs' ? 'active' : ''}`}
            onClick={() => setActiveTab('labs')}
          >
            <MapPin size={16} />
            Lab Locator
          </button>
          <button
            className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <Clock size={16} />
            Scheme Journey
          </button>
          <button
            className={`tab-btn ${activeTab === 'passport' ? 'active' : ''}`}
            onClick={() => setActiveTab('passport')}
          >
            <FileCheck size={16} />
            Compliance Passport
          </button>
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={16} />
            Ministry Dashboard
          </button>
        </div>
      </nav>

      {/* Tab Panels */}
      <main className="main-content container">
        {activeTab === 'chat' && (
          <ChatPanel
            onSelectNode={handleSelectNode}
            onViewPassport={handleViewPassport}
          />
        )}

        {activeTab === 'graph' && (
          <div className="chat-container" style={{ padding: '2rem', textAlign: 'center' }}>
            <Share2 size={48} color="#3b82f6" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Interactive Standards Knowledge Graph</h2>
            <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
              Visualizing semantic clusters across 23,573 Indian Standards categorized by ICS codes.
            </p>
            {selectedStandard ? (
              <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '10px', display: 'inline-block' }}>
                <span style={{ color: '#6ee7b7', fontWeight: 600 }}>Active Focused Standard: </span>
                <span>{selectedStandard}</span>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Ask a question in the chat to auto-center the graph on the applicable standard.</p>
            )}
          </div>
        )}

        {activeTab === 'labs' && (
          <div className="chat-container" style={{ padding: '2rem', textAlign: 'center' }}>
            <MapPin size={48} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Recognised BIS Testing Laboratories</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Locate nearby accredited testing laboratories for electronics, toys, gold hallmarking, and civil engineering.
            </p>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="chat-container" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Certification Scheme Timelines</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px' }}>
                <h3 style={{ color: '#60a5fa', marginBottom: '0.5rem' }}>Compulsory Registration Scheme (CRS)</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Applies to Electronics & IT Goods (e.g. LED lamps, mobile phones).</p>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  • Step 1: Testing at lab (15–30 days)<br/>
                  • Step 2: Apply on CRS portal (1–2 days)<br/>
                  • Step 3: Grant of R-number (15–20 days)
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px' }}>
                <h3 style={{ color: '#34d399', marginBottom: '0.5rem' }}>ISI Mark Scheme (Scheme-I)</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Mandatory product certification (e.g. toys, helmets, cement).</p>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  • Step 1: Testing of samples (30–60 days)<br/>
                  • Step 2: Factory inspection (10–15 days)<br/>
                  • Step 3: Grant of CM/L licence (20–30 days)
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px' }}>
                <h3 style={{ color: '#fbbf24', marginBottom: '0.5rem' }}>Hallmarking Scheme</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Mandatory for gold jewellery & artefacts.</p>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  • Step 1: Assaying at A&H center (1–2 days)<br/>
                  • Step 2: Laser marking of HUID + purity (1–2 days)
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'passport' && (
          <div className="chat-container" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', color: '#f8fafc' }}>Compliance Passport Dossier</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Official summary generated for: {activePassportProduct || '9W LED Bulb'}</p>
              </div>
              <button
                onClick={() => window.print()}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                🖨️ Print / Save PDF
              </button>
            </div>

            <div className="passport-dossier" style={{ background: '#162032', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#60a5fa' }}>Product: {activePassportProduct || '9W LED Bulb (Self-Ballasted)'}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>HSN Code: 8539 | Scheme: Compulsory Registration Scheme (CRS)</p>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '0.35rem 0.75rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', height: 'fit-content' }}>
                  MANDATORY CERTIFICATION
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Applicable Standard</div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9' }}>IS 16102 (Part 1): 2012</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Self-Ballasted LED Lamps for General Lighting Services - Safety</div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Governing QCO Order</div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9' }}>Electronics and IT Goods (Requirement for Compulsory Registration) Order</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Ministry of Electronics & Information Technology (MeitY)</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <span>Indicative Lab Test Duration: <strong>15–30 days</strong></span>
                <span>Indicative Application Fee: <strong>₹1,000 + GST</strong></span>
                <span>Helpline: <strong>1800-11-4000</strong></span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="chat-container" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Ministry of Consumer Affairs — Regulatory Intelligence</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Real-time monitoring of citizen and manufacturer compliance queries, language demand, and regulatory gaps.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>TOTAL INQUIRIES</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.25rem' }}>148</div>
              </div>
              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>VERIFIED MATCHES</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>93.2%</div>
              </div>
              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>ABSTENTION / REFUSALS</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>6.8%</div>
              </div>
              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>VERNACULAR QUERIES (HINDI)</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f97316', marginTop: '0.25rem' }}>41.5%</div>
              </div>
            </div>

            <div style={{ background: '#162032', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', color: '#f87171', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ High Priority Unaddressed Queries (Regulatory Gaps Log)
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                Queries where the AI correctly abstained due to lack of gazette notification:
              </p>
              <ul style={{ paddingLeft: '1.25rem', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.8 }}>
                <li><em>"Are imported lithium cells under mandatory certification for drones?"</em> (Abstained: score 0.49)</li>
                <li><em>"Does recycled paper packaging need eco-mark certificate?"</em> (Abstained: score 0.51)</li>
                <li><em>"What is the airspeed of an unladen swallow?"</em> (Refused: Out-of-domain)</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
