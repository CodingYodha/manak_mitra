import React, { useState } from 'react';
import { Clock, ShieldCheck, CheckCircle2, ArrowRight, ExternalLink, Calendar, DollarSign } from 'lucide-react';

const SCHEMES_DATA = {
  CRS: {
    name: 'Compulsory Registration Scheme (CRS)',
    tagline: 'Self-declaration of conformity for notified Electronics & Information Technology Goods',
    badge: 'CRS · MeitY Order',
    appliesTo: 'Electronics, IT goods, LED lamps, solar inverters, mobile phones, smart watches',
    fee: '₹1,000 Application Fee + Statutory GST (Excludes Lab Testing)',
    totalTimeline: '30–50 Total Calendar Days',
    sourceUrl: 'https://crsbis.in',
    steps: [
      { id: 1, title: 'Sample Testing at BIS Recognised Lab', duration: '15–30 Days', desc: 'Sample tested strictly against the applicable Indian Standard (e.g. IS 16102 Part 1 for LED lamps). Lab uploads authenticated test report directly to BIS portal.' },
      { id: 2, title: 'Online Application Filing on CRS Portal', duration: '1–2 Days', desc: 'Manufacturer submits online application with verified test report, undertaking, and authorized Indian Representative (AIR) details for foreign entities.' },
      { id: 3, title: 'Scrutiny & Grant of Unique R-Number', duration: '15–20 Days', desc: 'BIS officials scrutinize test results and grant registration with a unique 8-digit R-number (e.g. R-41001234) valid for 2 years.' }
    ]
  },
  ISI: {
    name: 'ISI Mark Certification Scheme (Scheme-I)',
    tagline: 'Third-party conformity mark guaranteeing product quality and safety',
    badge: 'Scheme-I · Mandatory ISI',
    appliesTo: 'Children plastic toys, cement, steel, automotive helmets, domestic electrical cables, drinking water',
    fee: '₹1,000 Application Fee + Annual Licence Fee + Factory Inspection Cost',
    totalTimeline: '60–100 Total Calendar Days',
    sourceUrl: 'https://bis.gov.in/isi',
    steps: [
      { id: 1, title: 'In-House Testing Setup & Pre-Audit Verification', duration: '15–20 Days', desc: 'Factory ensures required quality control laboratory setup and test equipment are available in-house as per the Scheme of Inspection and Testing (SIT).' },
      { id: 2, title: 'Preliminary Factory Audit & Sample Draw', duration: '10–15 Days', desc: 'BIS technical officer inspects manufacturing facility, verifies manufacturing process, and draws independent samples for third-party testing.' },
      { id: 3, title: 'Independent Sample Testing at BIS Lab', duration: '30–60 Days', desc: 'Drawn samples undergo exhaustive mechanical, electrical, and chemical performance testing at BIS National Labs.' },
      { id: 4, title: 'Grant of CM/L Certification Licence', duration: '20–30 Days', desc: 'Following satisfactory test results, BIS issues the Certificate of Manufacture and Licence (CM/L-XXXXXXX) permitting the use of the iconic ISI mark.' }
    ]
  },
  HALLMARKING: {
    name: 'Mandatory Hallmarking Scheme (Gold & Silver)',
    tagline: 'Guaranteed fineness and purity certification for precious metal jewellery',
    badge: 'DoCA Mandatory Order',
    appliesTo: 'Gold jewellery, gold artefacts, and bullion across notified districts in India',
    fee: '₹2,000 / batch Assaying & Laser Inscription statutory rate',
    totalTimeline: '1–2 Calendar Days (Rapid Turnaround)',
    sourceUrl: 'https://bis.gov.in/hallmarking',
    steps: [
      { id: 1, title: 'Registration on Manakonline Portal', duration: '1 Day', desc: 'Jewellers obtain instant online registration with zero government fee for small turnover establishments.' },
      { id: 2, title: 'Assaying at Recognised A&H Center', duration: '1 Day', desc: 'Representative samples assayed via X-Ray Fluorescence (XRF) and fire assay to authenticate exact gold purity (e.g. 916 for 22K).' },
      { id: 3, title: 'Laser Inscription of BIS Logo + Purity + HUID', duration: '1 Day', desc: 'Center engraves 3 mandatory marks: BIS triangular logo, fineness (916), and unique 6-character alphanumeric HUID synchronized to central server.' }
    ]
  },
  FMCS: {
    name: 'Foreign Manufacturers Certification Scheme (FMCS)',
    tagline: 'Certification framework enabling overseas manufacturing units to supply goods with ISI Mark into India',
    badge: 'FMCS · Global Importers',
    appliesTo: 'Overseas manufacturing factories exporting notified products into Indian territory',
    fee: '$1,000 USD Application Fee + Special Inspection and Travel Levy',
    totalTimeline: '90–120 Total Calendar Days',
    sourceUrl: 'https://bis.gov.in/fmcs',
    steps: [
      { id: 1, title: 'Appointment of Authorized Indian Representative (AIR)', duration: '10–15 Days', desc: 'Overseas factory nominates a legally responsible Indian representative resident in India.' },
      { id: 2, title: 'Overseas Factory Physical Audit by BIS Officers', duration: '30–45 Days', desc: 'BIS delegation travels to the overseas factory location to audit production lines and collect duplicate test samples.' },
      { id: 3, title: 'Sample Clearance at Indian BIS Lab & Grant of License', duration: '30–45 Days', desc: 'Samples tested in Indian laboratories. On passing, BIS issues overseas licence and signs performance bond.' }
    ]
  }
};

export default function SchemeTimeline() {
  const [selectedSchemeKey, setSelectedSchemeKey] = useState('CRS');
  const scheme = SCHEMES_DATA[selectedSchemeKey];

  return (
    <div className="container section-rhythm" style={{ paddingTop: '40px' }}>
      <div style={{ marginBottom: '28px' }}>
        <span className="caption" style={{ color: '#0a2e0e', fontWeight: 600 }}>COMPLIANCE WORKFLOW GUIDE</span>
        <h2 className="display-md" style={{ marginTop: '4px', marginBottom: '8px' }}>
          Certification Scheme Decision Trees & Timelines
        </h2>
        <p className="body-md" style={{ color: 'var(--color-muted)' }}>
          Transparent, deterministic workflows for each primary certification scheme. No hidden middlemen, no regulatory guesswork.
        </p>
      </div>

      {/* Scheme Tab Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {Object.keys(SCHEMES_DATA).map((key) => (
          <button
            key={key}
            className={`btn-pill ${selectedSchemeKey === key ? 'active' : ''}`}
            style={selectedSchemeKey === key ? { background: '#181d26', color: '#ffffff', border: 'none' } : {}}
            onClick={() => setSelectedSchemeKey(key)}
          >
            {key} Scheme
          </button>
        ))}
      </div>

      {/* Scheme Card */}
      <div className="editorial-chat-box" style={{ padding: '32px' }}>
        {/* Scheme Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '24px' }}>
          <div>
            <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
              {scheme.badge}
            </span>
            <h3 style={{ fontSize: '22px', fontWeight: 600, color: '#181d26', marginTop: '6px' }}>
              {scheme.name}
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              {scheme.tagline}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <a
              href={scheme.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ fontSize: '13px', padding: '8px 14px' }}
            >
              Official Scheme Portal
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* 3 Metric Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>APPLICABLE PRODUCTS</div>
            <div style={{ fontSize: '13.5px', color: '#181d26', fontWeight: 500, marginTop: '4px' }}>{scheme.appliesTo}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>INDICATIVE STATUTORY FEE</div>
            <div style={{ fontSize: '13.5px', color: '#181d26', fontWeight: 600, marginTop: '4px' }}>{scheme.fee}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>ESTIMATED TOTAL CYCLE</div>
            <div style={{ fontSize: '13.5px', color: '#15803d', fontWeight: 600, marginTop: '4px' }}>⏱️ {scheme.totalTimeline}</div>
          </div>
        </div>

        {/* Step-by-Step Flow */}
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#181d26', marginBottom: '16px' }}>
            Sequential Audit & Certification Steps:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {scheme.steps.map((s, index) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  gap: '16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#181d26',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0
                  }}
                >
                  {index + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '15px', color: '#181d26' }}>{s.title}</strong>
                    <span style={{ fontSize: '12px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {s.duration}
                    </span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
