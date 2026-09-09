import React from 'react';
import { PhoneCall, FileText, ShieldCheck } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenPassport }) {
  const navItems = [
    { id: 'assistant', label: 'AI Assistant' },
    { id: 'graph', label: 'Standards Graph' },
    { id: 'passport', label: 'Compliance Passport' },
    { id: 'verifier', label: 'Mark Verifier' },
    { id: 'schemes', label: 'Certification Schemes' },
    { id: 'labs', label: 'Testing Labs' },
    { id: 'dashboard', label: 'Ministry Analytics' }
  ];

  return (
    <header className="airtable-nav">
      <div className="container nav-container">
        <div className="nav-left">
          <a href="#" className="nav-brand" onClick={(e) => { e.preventDefault(); setActiveTab('assistant'); }}>
            <div className="nav-logo-mark">M</div>
            <div>
              <span className="nav-title">Manak Mitra</span>
              <span className="hindi">मानक मित्र</span>
            </div>
          </a>

          <ul className="nav-links">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`nav-link-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="nav-right">
          <a href="tel:1800114000" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <PhoneCall size={14} />
            Helpline 1800-11-4000
          </a>
          <button
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
            onClick={onOpenPassport}
          >
            <FileText size={14} />
            Passport
          </button>
        </div>
      </div>
    </header>
  );
}
