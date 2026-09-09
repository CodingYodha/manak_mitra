import React from 'react';
import { PhoneCall, Mail, ShieldCheck } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="editorial-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div className="nav-logo-mark">M</div>
              <strong style={{ fontSize: '16px', color: '#181d26' }}>Manak Mitra (मानक मित्र)</strong>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, maxWidth: '320px' }}>
              AI-Powered Compliance Assistant engineered for the Ministry of Consumer Affairs, Food & Public Distribution (Bureau of Indian Standards). Built for Indian MSMEs, manufacturers, and citizens.
            </p>
            <div style={{ marginTop: '16px', fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
              ● Zero-Hallucination Architecture Active
            </div>
          </div>

          <div className="footer-col">
            <h4>Certification Schemes</h4>
            <ul className="footer-links">
              <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate('schemes'); }}>Compulsory Registration (CRS)</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate('schemes'); }}>ISI Mark Scheme (Scheme-I)</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate('schemes'); }}>Hallmarking & HUID (Gold)</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate('schemes'); }}>Foreign Manufacturers (FMCS)</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Official Portals</h4>
            <ul className="footer-links">
              <li><a href="https://bis.gov.in" target="_blank" rel="noreferrer">Bureau of Indian Standards</a></li>
              <li><a href="https://crsbis.in" target="_blank" rel="noreferrer">CRS Online Portal</a></li>
              <li><a href="https://egazette.gov.in" target="_blank" rel="noreferrer">e-Gazette of India (QCOs)</a></li>
              <li><a href="https://bhashini.gov.in" target="_blank" rel="noreferrer">Bhashini Language Mission</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>National Helplines</h4>
            <ul className="footer-links">
              <li><a href="tel:1800114000" style={{ fontWeight: 600, color: '#181d26' }}>Toll-Free: 1800-11-4000</a></li>
              <li><a href="mailto:complaints@bis.gov.in">complaints@bis.gov.in</a></li>
              <li><a href="https://bis.gov.in" target="_blank" rel="noreferrer">Download BIS CARE App</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © 2026 Manak Mitra · Smart India Hackathon (SIH 2026) · Problem Statement ID: <strong>PS 26107</strong> · Team CodingYodha
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>No Authentication Required</span>
            <span>Open Deployment</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
