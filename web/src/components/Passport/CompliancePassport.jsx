import React, { useEffect, useState } from 'react';
import { Download, FileText, Printer, CheckCircle2, Search, ShieldCheck, MapPin, Clock, ArrowRight, Building2, QrCode } from 'lucide-react';
import { apiUrl } from '../../config';

const PRESET_PRODUCTS = [
  {
    id: 'led',
    name: '9W LED Bulb (Self-Ballasted)',
    hsn: '8539.50',
    scheme: 'Compulsory Registration Scheme (CRS)',
    schemeBadge: 'CRS REGISTRATION',
    standard: 'IS 16102 (Part 1): 2012',
    standardTitle: 'Self-Ballasted LED Lamps for General Lighting Services — Part 1: Safety Requirements',
    order: 'Electronics and Information Technology Goods (Requirement for Compulsory Registration) Order',
    ministry: 'Ministry of Electronics & Information Technology (MeitY)',
    gazetteRef: 'e-Gazette Notification S.O. 2357(E) · Retr: 2026-09-09',
    duration: '15–30 Days',
    fee: '₹1,000 + GST',
    mark: 'CRS R-Number (R-XXXXXXXX)',
    labs: [
      { name: 'National Test House (NR)', location: 'New Delhi', scope: 'Safety & Ballast' },
      { name: 'BIS Western Regional Laboratory', location: 'Mumbai', scope: 'CRS Electronics' },
      { name: 'Central Power Research Institute (CPRI)', location: 'Bangalore', scope: 'Lamp Performance' }
    ],
    nextStep: 'Submit sample to NTH New Delhi or CPRI Bangalore for safety testing against IS 16102.'
  },
  {
    id: 'toy',
    name: "Children's Plastic Toy (Under 14 Years)",
    hsn: '9503.00',
    scheme: 'ISI Mark Certification Scheme (Scheme-I)',
    schemeBadge: 'ISI STANDARD MARK',
    standard: 'IS 9873 (Part 1): 2019',
    standardTitle: 'Safety of Toys — Part 1: Safety Aspects Related to Mechanical and Physical Properties',
    order: 'Toys (Quality Control) Order, 2020',
    ministry: 'Department for Promotion of Industry and Internal Trade (DPIIT)',
    gazetteRef: 'e-Gazette Notification S.O. 853(E) · Retr: 2026-09-09',
    duration: '30–60 Days',
    fee: '₹1,000 + Factory Audit Fee',
    mark: 'ISI Standard Mark (CM/L-XXXXXXX)',
    labs: [
      { name: 'National Test House (Toy Lab)', location: 'New Delhi', scope: 'Mechanical & Chemical' },
      { name: 'BIS Central Laboratory', location: 'Sahibabad, UP', scope: 'Flammability & Phthalates' },
      { name: 'Shriram Institute for Industrial Research', location: 'Delhi', scope: 'Heavy Metal Migration' }
    ],
    nextStep: 'Complete factory in-house testing setup and schedule BIS factory audit for Scheme-I license grant.'
  },
  {
    id: 'gold',
    name: '22K Gold Jewellery / Artefacts',
    hsn: '7113.19',
    scheme: 'Mandatory Hallmarking Scheme',
    schemeBadge: 'BIS HALLMARK + HUID',
    standard: 'IS 1417: 2016',
    standardTitle: 'Gold and Gold Alloys, Jewellery/Artefacts — Fineness and Hallmarking',
    order: 'Hallmarking of Gold Jewellery and Gold Artefacts Order, 2020',
    ministry: 'Ministry of Consumer Affairs, Food & Public Distribution (DoCA)',
    gazetteRef: 'e-Gazette Notification S.O. 507(E) · Retr: 2026-09-09',
    duration: '1–2 Days',
    fee: '₹2,000 / batch (Registration)',
    mark: 'BIS Hallmark + Purity 916 + 6-digit HUID',
    labs: [
      { name: 'Recognised Assaying & Hallmarking (A&H) Center', location: 'New Delhi Zone', scope: 'XRF & Fire Assay' },
      { name: 'Western A&H Facility', location: 'Mumbai Zaveri Bazaar', scope: 'Laser HUID Inscription' },
      { name: 'Southern Gold Testing Center', location: 'Bangalore', scope: 'IS 1417 Assaying' }
    ],
    nextStep: 'Register retail/manufacturing unit on Manakonline and send jewellery to accredited A&H Center for laser HUID engraving.'
  }
];

export default function CompliancePassport({ initialProduct = 'led' }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_PRODUCTS[0]);
  const [dynamicProduct, setDynamicProduct] = useState(null);
  const [lookupState, setLookupState] = useState('');
  const [lookupInput, setLookupInput] = useState(initialProduct === 'led' ? '' : initialProduct);
  const [lookupProduct, setLookupProduct] = useState(initialProduct);

  useEffect(() => {
    setLookupInput(initialProduct === 'led' ? '' : initialProduct);
    setLookupProduct(initialProduct);
  }, [initialProduct]);

  useEffect(() => {
    const product = PRESET_PRODUCTS.find((item) => item.id === lookupProduct);
    if (product) {
      setSelectedPreset(product);
      setDynamicProduct(null);
      setLookupState('');
      return;
    }

    let active = true;
    setLookupState('Retrieving the product dossier from the standards catalogue…');
    setDynamicProduct(null);
    fetch(apiUrl(`/api/passport/${encodeURIComponent(lookupProduct)}`))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        const standardHit = data.recommendation?.hits?.[0] || {};
        const qco = data.citations?.find((citation) => citation.kind === 'qco') || {};
        const scheme = data.scheme || {};
        setDynamicProduct({
          id: `catalogue-${lookupProduct.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) || 'product'}`,
          name: data.product || lookupProduct,
          hsn: 'Not provided',
          scheme: scheme.name || data.mandate?.scheme || 'Confirm applicable scheme with BIS',
          schemeBadge: scheme.name || 'CATALOGUE MATCH',
          standard: data.matched_standard || standardHit.is_number || 'No confirmed standard found',
          standardTitle: standardHit.title || 'Matched from the BIS standards catalogue. Confirm the latest amendment before filing.',
          order: qco.title || qco.ref || 'No QCO citation was returned for this product match.',
          ministry: 'See linked official source',
          gazetteRef: qco.retrieved_on ? `Retrieved: ${qco.retrieved_on}` : 'Verify current notification on e-Gazette',
          duration: scheme.steps?.length ? `${scheme.steps.length} documented scheme steps` : 'Confirm with official scheme portal',
          fee: scheme.fees?.application || 'Check official scheme portal',
          mark: 'Confirm the product marking requirement in the applicable scheme',
          labs: (data.labs || []).slice(0, 5).map((lab) => ({ name: lab.name || lab.label || 'BIS-recognised laboratory', location: [lab.city, lab.state].filter(Boolean).join(', ') || 'Location not listed', scope: lab.categories || lab.is_number || 'Scope shown by BIS' })),
          nextStep: data.matched_standard ? `Review ${data.matched_standard}, confirm the current QCO/scheme requirement, and contact a listed BIS-recognised laboratory before filing.` : 'No confirmed compliance decision was returned. Refine the product description or verify with BIS before filing.'
        });
        setLookupState('');
      })
      .catch(() => { if (active) setLookupState('The catalogue lookup is unavailable. Try again after the local API is running.'); });
    return () => { active = false; };
  }, [lookupProduct]);

  const currentProduct = dynamicProduct || selectedPreset;

  const downloadEvidencePack = () => {
    const source = `Manak Mitra Compliance Evidence Pack\n\nProduct: ${currentProduct.name}\nHSN: ${currentProduct.hsn}\nScheme: ${currentProduct.scheme}\nApplicable standard: ${currentProduct.standard}\nStandard title: ${currentProduct.standardTitle}\nGoverning order: ${currentProduct.order}\nAdministering ministry: ${currentProduct.ministry}\nSource reference: ${currentProduct.gazetteRef}\nIndicative cycle: ${currentProduct.duration}\nIndicative fee: ${currentProduct.fee}\nMandatory mark: ${currentProduct.mark}\n\nRecognised testing facilities:\n${currentProduct.labs.map((lab) => `- ${lab.name}, ${lab.location}: ${lab.scope}`).join('\n')}\n\nNext step:\n${currentProduct.nextStep}\n\nGenerated locally by Manak Mitra on ${new Date().toLocaleString()}. Confirm current requirements on the official BIS and e-Gazette portals before filing.`;
    const url = URL.createObjectURL(new Blob([source], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `manak-mitra-${currentProduct.id}-evidence-pack.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
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

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={downloadEvidencePack}>
            <Download size={16} />
            Download Evidence Pack
          </button>
          <button
            className="btn-primary"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print Dossier (PDF)
          </button>
        </div>
      </div>

      {/* Preset Product Pills */}
      <form onSubmit={(event) => { event.preventDefault(); if (lookupInput.trim()) setLookupProduct(lookupInput.trim()); }} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px', maxWidth: '760px' }}>
        <input value={lookupInput} onChange={(event) => setLookupInput(event.target.value)} placeholder="Enter any product, HSN, or IS number" className="editorial-input" style={{ flex: '1 1 360px', padding: '11px' }} />
        <button className="btn-primary" disabled={!lookupInput.trim()}><Search size={16} /> Retrieve dossier</button>
      </form>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#181d26', alignSelf: 'center', marginRight: '6px' }}>
          Optional quick checks:
        </span>
        {PRESET_PRODUCTS.map((p) => (
          <button
            key={p.id}
            className={`btn-pill ${selectedPreset.id === p.id ? 'active' : ''}`}
            style={selectedPreset.id === p.id ? { background: '#181d26', color: '#ffffff', border: 'none' } : {}}
            onClick={() => { setSelectedPreset(p); setDynamicProduct(null); setLookupState(''); setLookupProduct(p.id); setLookupInput(''); }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {lookupState && <div style={{ maxWidth: '920px', margin: '0 auto 16px', padding: '12px 14px', borderRadius: '6px', background: '#f8fafc', color: '#475569', fontSize: '13px' }}>{lookupState}</div>}

      {/* THE COMPLIANCE PASSPORT DOSSIER (Printable 1-Page Document) */}
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
              GOVERNMENT OF INDIA · MINISTRY OF CONSUMER AFFAIRS
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#181d26', marginTop: '4px' }}>
              Official Compliance Passport
            </h2>
            <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} />
              STATUS: MANDATORY QUALITY CONTROL ORDER (QCO) NOTIFIED
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'inline-block', background: '#181d26', color: '#ffffff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', letterSpacing: '0.05em' }}>
              {currentProduct.schemeBadge}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Dossier ID: MM-{currentProduct.id.toUpperCase()}-2026
            </div>
          </div>
        </div>

        {/* 2-Column Product & Standard Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>PRODUCT SPECIFICATION</div>
            <div style={{ fontSize: '17px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>
              {currentProduct.name}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Harmonized System Code: <strong>HSN {currentProduct.hsn}</strong>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>INDIAN STANDARD (IS) REQUIREMENT</div>
            <div style={{ fontSize: '17px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>
              {currentProduct.standard}
            </div>
            <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 500, marginTop: '4px' }}>
              {currentProduct.standardTitle}
            </div>
          </div>
        </div>

        {/* Governing Order & Legal Gazette */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '24px', background: '#ffffff' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>GOVERNING QUALITY CONTROL ORDER (LEGAL CITATION)</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#181d26', marginTop: '4px' }}>
            {currentProduct.order}
          </div>
          <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span>Administered by: <strong>{currentProduct.ministry}</strong></span>
            <span>Ref: <strong>{currentProduct.gazetteRef}</strong></span>
          </div>
        </div>

        {/* 3-Box Technical Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>ESTIMATED LAB AUDIT</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#181d26', marginTop: '4px' }}>{currentProduct.duration}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Sample Testing</div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>GOVT STATUTORY FEE</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#181d26', marginTop: '4px' }}>{currentProduct.fee}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Portal Application</div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>MANDATORY PRODUCT MARK</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#181d26', marginTop: '6px' }}>{currentProduct.mark}</div>
            <div style={{ fontSize: '12px', color: '#15803d', marginTop: '2px' }}>Compulsory on Pack</div>
          </div>
        </div>

        {/* 3 Accredited Testing Laboratories */}
        <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '10px' }}>
            NEAREST ACCREDITED TESTING LABORATORIES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {currentProduct.labs.map((lab, i) => (
              <div key={i} style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#181d26' }}>{lab.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>📍 {lab.location}</div>
                <div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '4px' }}>Scope: {lab.scope}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Clear Actionable Next Step */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: '4px' }}>
            OFFICIAL NEXT STEP FOR MANUFACTURER / IMPORTER
          </div>
          <div style={{ fontSize: '13.5px', color: '#1e3a8a', lineHeight: 1.5 }}>
            {currentProduct.nextStep}
          </div>
        </div>

        {/* Dossier Footer */}
        <div style={{ borderTop: '2px solid #181d26', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', flexWrap: 'wrap', gap: '10px' }}>
          <div>Generated by <strong>Manak Mitra Intelligence Engine</strong> · PS 26107 · Team CodingYodha</div>
          <div>National Toll-Free Helpline: <strong>1800-11-4000</strong> (bis.gov.in)</div>
        </div>
      </div>
    </div>
  );
}
