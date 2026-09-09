import React, { useState, useEffect } from 'react';
import { FileText, Printer, CheckCircle2, ShieldCheck, MapPin, Clock, ArrowRight, Building2, QrCode, Loader2 } from 'lucide-react';

const PRESET_PRODUCTS = [
  { id: 'led', name: '9W LED Bulb (Self-Ballasted)' },
  { id: 'toy', name: "Children's Plastic Toy (Under 14 Years)" },
  { id: 'gold', name: '22K Gold Jewellery / Artefacts' }
];

export default function CompliancePassport() {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_PRODUCTS[0]);
  const [customProduct, setCustomProduct] = useState('');
  const [passportData, setPassportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPassport = async (productName) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/passport/${encodeURIComponent(productName)}`);
      const data = await res.json();
      setPassportData(data);
    } catch (err) {
      console.error(err);
      setPassportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassport(selectedPreset.name);
  }, [selectedPreset]);

  const handleCustomSearch = (e) => {
    e.preventDefault();
    if (customProduct.trim()) {
      setSelectedPreset({ id: 'custom', name: customProduct });
    }
  };

  return (
    <div className="container section-rhythm" style={{ paddingTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
        <div>
          <span className="caption" style={{ color: '#aa2d00', fontWeight: 600 }}>DEMO BEAT 3 · THE MONEY SHOT</span>
          <h1 className="display-md" style={{ marginTop: '4px', marginBottom: '8px' }}>
            Product Compliance Passport
          </h1>
          <p className="body-md" style={{ color: 'var(--color-muted)', maxWidth: '640px' }}>
            A legally grounded, single-page compliance dossier ready to print or present to customs, retailers, and certification auditors.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={() => window.print()}
            disabled={loading || !passportData}
          >
            <Printer size={16} />
            Print Dossier (PDF)
          </button>
        </div>
      </div>

      {/* Preset Product Pills & Search */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#181d26', marginRight: '6px' }}>
          Select Product:
        </span>
        {PRESET_PRODUCTS.map((p) => (
          <button
            key={p.id}
            className={`btn-pill ${selectedPreset.id === p.id ? 'active' : ''}`}
            style={selectedPreset.id === p.id ? { background: '#181d26', color: '#ffffff', border: 'none' } : {}}
            onClick={() => setSelectedPreset(p)}
          >
            {p.name}
          </button>
        ))}
        <form onSubmit={handleCustomSearch} style={{ display: 'inline-flex', marginLeft: 'auto' }}>
          <input 
            type="text" 
            placeholder="Search custom product..." 
            value={customProduct}
            onChange={e => setCustomProduct(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }}
          />
          <button type="submit" className="btn-secondary" style={{ marginLeft: '8px', padding: '6px 12px', fontSize: '13px' }}>Analyze</button>
        </form>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '2px solid #181d26' }}>
          <Loader2 className="spinner" size={32} style={{ margin: '0 auto', color: '#181d26' }} />
          <div style={{ marginTop: '16px', fontWeight: 600 }}>Analyzing compliance requirements...</div>
        </div>
      ) : passportData ? (
        <div
          className="passport-dossier"
          style={{
            background: '#ffffff',
            border: '2px solid #181d26',
            borderRadius: '12px',
            padding: '36px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
            maxWidth: '920px',
            margin: '0 auto'
          }}
        >
          {/* Dossier Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #181d26', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
                GOVERNMENT OF INDIA · COMPLIANCE SUMMARY
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#181d26', marginTop: '4px' }}>
                Official Compliance Passport
              </h2>
              <div style={{ fontSize: '13px', color: passportData.mandate_verdict?.includes('MANDATORY') ? '#15803d' : '#ca8a04', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} />
                {passportData.mandate_verdict}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', background: '#181d26', color: '#ffffff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                {passportData.scheme || 'N/A'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Dossier ID: MM-{passportData.product.substring(0,6).toUpperCase()}-2026
              </div>
            </div>
          </div>

          {/* 2-Column Product & Standard Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>PRODUCT SPECIFICATION</div>
              <div style={{ fontSize: '17px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>
                {passportData.product}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>INDIAN STANDARD (IS) REQUIREMENT</div>
              <div style={{ fontSize: '17px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>
                {passportData.is_number || 'Standard Not Identified'}
              </div>
            </div>
          </div>

          {/* Governing Order & Legal Gazette */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '24px', background: '#ffffff' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>GOVERNING QUALITY CONTROL ORDER (LEGAL CITATION)</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>
              {passportData.governing_qco?.title || 'Check latest QCO notifications'}
            </div>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>Effective: <strong>{passportData.effective_on || 'Refer to QCO'}</strong></span>
              {passportData.governing_qco?.url && (
                <a href={passportData.governing_qco.url} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8' }}>View Gazette</a>
              )}
            </div>
          </div>

          {/* 3-Box Technical Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>ESTIMATED TOTAL CYCLE</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#181d26', marginTop: '4px' }}>{passportData.timeline || 'Variable'}</div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>INDICATIVE FEE</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#181d26', marginTop: '4px' }}>{passportData.indicative_fee?.split(':')[1] || 'See Scheme'}</div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>MANDATORY PRODUCT MARK</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#181d26', marginTop: '6px' }}>{passportData.markings?.primary || 'Required'}</div>
            </div>
          </div>

          {/* Accredited Testing Laboratories */}
          {passportData.nearest_labs && passportData.nearest_labs.length > 0 && (
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '10px' }}>
                NEAREST ACCREDITED TESTING LABORATORIES
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {passportData.nearest_labs.slice(0, 3).map((lab, i) => (
                  <div key={i} style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#181d26' }}>{lab.name || lab.label || lab.lab_id || 'BIS Lab'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>📍 {lab.city || 'India'}, {lab.state}</div>
                    <div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '4px' }}>{lab.distance_km ? `Dist: ${lab.distance_km}km` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clear Actionable Next Step */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: '4px' }}>
              OFFICIAL NEXT STEP FOR MANUFACTURER / IMPORTER
            </div>
            <div style={{ fontSize: '13.5px', color: '#1e3a8a', lineHeight: 1.5 }}>
              {passportData.next_step}
            </div>
          </div>

          {/* Dossier Footer */}
          <div style={{ borderTop: '2px solid #181d26', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', flexWrap: 'wrap', gap: '10px' }}>
            <div>Generated by <strong>Manak Mitra Intelligence Engine</strong> · PS 26107 · Team CodingYodha</div>
            <div>National Toll-Free Helpline: <strong>1800-11-4000</strong> (bis.gov.in)</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '2px solid #181d26' }}>
          <div>Could not load passport data.</div>
        </div>
      )}
    </div>
  );
}
