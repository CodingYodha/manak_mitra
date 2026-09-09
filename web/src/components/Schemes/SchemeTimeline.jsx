import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, CheckCircle2, ArrowRight, ExternalLink, Calendar, DollarSign, Loader2 } from 'lucide-react';

export default function SchemeTimeline() {
  const [selectedSchemeKey, setSelectedSchemeKey] = useState('CRS');
  const [schemesData, setSchemesData] = useState([]);
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all schemes list
    fetch('http://localhost:8000/schemes')
      .then(res => res.json())
      .then(data => {
        setSchemesData(data);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/schemes/${selectedSchemeKey}`)
      .then(res => res.json())
      .then(data => {
        setScheme(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedSchemeKey]);

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
        {['CRS', 'ISI', 'HALLMARKING', 'FMCS'].map((key) => (
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

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Loader2 className="spinner" size={24} style={{ margin: '0 auto', color: '#181d26' }} />
        </div>
      ) : scheme ? (
        <div className="editorial-chat-box" style={{ padding: '32px' }}>
          {/* Scheme Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                {selectedSchemeKey} · {scheme.ministry?.split(' ')[0] || 'BIS'}
              </span>
              <h3 style={{ fontSize: '22px', fontWeight: 600, color: '#181d26', marginTop: '6px' }}>
                {scheme.full_name || scheme.name}
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                {scheme.applies_when}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <a
                href={scheme.fees?.source_url || 'https://bis.gov.in'}
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
              <div style={{ fontSize: '13.5px', color: '#181d26', fontWeight: 500, marginTop: '4px' }}>{scheme.product_examples?.[0] || 'Various Notified Goods'}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>INDICATIVE STATUTORY FEE</div>
              <div style={{ fontSize: '13.5px', color: '#181d26', fontWeight: 600, marginTop: '4px' }}>{scheme.fees?.application || 'Variable'}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>ESTIMATED TOTAL CYCLE</div>
              <div style={{ fontSize: '13.5px', color: '#15803d', fontWeight: 600, marginTop: '4px' }}>⏱️ {scheme.total_timeline}</div>
            </div>
          </div>

          {/* Step-by-Step Flow */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#181d26', marginBottom: '16px' }}>
              Sequential Audit & Certification Steps:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {scheme.steps?.map((s, index) => (
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
                        {s.duration_label || 'Variable'}
                      </span>
                    </div>
                    <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
                      {s.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
