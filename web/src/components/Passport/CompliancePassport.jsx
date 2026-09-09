import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileText, LoaderCircle, MapPin, Printer, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { apiUrl } from '../../config';

const missing = (item) => item || 'Not available from the verified catalogue';

export default function CompliancePassport({ initialProduct = '' }) {
  const [input, setInput] = useState(initialProduct);
  const [city, setCity] = useState('');
  const [result, setResult] = useState(null);
  const [state, setState] = useState(initialProduct ? 'loading' : 'idle');
  const [error, setError] = useState('');

  const lookup = useCallback(async (product, candidateId = null) => {
    const query = product.trim();
    if (!query) return;
    setState('loading'); setError(''); setResult(null);
    try {
      const params = new URLSearchParams();
      if (candidateId) params.set('candidate_id', String(candidateId));
      if (city.trim()) params.set('city', city.trim());
      const response = await fetch(apiUrl(`/api/passport/${encodeURIComponent(query)}${params.toString() ? `?${params}` : ''}`));
      if (!response.ok) throw new Error(`The compliance service returned HTTP ${response.status}.`);
      const data = await response.json();
      setResult(data); setState('ready');
    } catch (lookupError) { setError(lookupError.message || 'Unable to retrieve this passport.'); setState('error'); }
  }, [city]);

  useEffect(() => {
    setInput(initialProduct);
    if (initialProduct) lookup(initialProduct);
    else { setResult(null); setState('idle'); }
  }, [initialProduct]); // Deliberately only navigate on a parent-provided product.

  const submit = (event) => { event.preventDefault(); lookup(input); };
  const candidate = result?.selected_candidate;
  const standard = result?.standard;
  const scheme = result?.scheme;
  const verified = result?.status === 'verified';
  const citations = result?.citations || [];
  const evidenceText = useMemo(() => !verified ? '' : [
    'Manak Mitra — Verified Compliance Passport', '', `Product: ${result.product}`,
    `QCO product record: ${candidate.product_desc}`, `Applicable IS: ${result.matched_standard}`,
    `Scheme: ${scheme?.name || candidate.scheme}`, `QCO: ${candidate.qco_title}`,
    `Effective date: ${candidate.effective_on || 'Not provided in the curated record'}`,
    `Source retrieved: ${candidate.retrieved_on || 'Not provided'}`, '',
    'Verified lab-scope mappings:', ...(result.labs || []).map((lab) => `- ${lab.name} | ${lab.city || ''}, ${lab.state || ''} | ${lab.is_number}`), '',
    'Official citations:', ...citations.map((citation) => `- ${citation.ref}${citation.url ? `: ${citation.url}` : ''}`), '',
    `Generated ${new Date().toLocaleString()}. Confirm current amendments, exemptions, and enforcement notices before filing.`
  ].join('\n'), [verified, result, candidate, scheme, citations]);

  const download = () => {
    if (!evidenceText) return;
    const url = URL.createObjectURL(new Blob([evidenceText], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `manak-mitra-${result.product.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}-passport.txt`;
    link.click(); URL.revokeObjectURL(url);
  };

  return <div className="container section-rhythm" style={{ paddingTop: '40px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '18px', marginBottom: '24px' }}>
      <div><span className="caption" style={{ color: '#aa2d00', fontWeight: 600 }}>EVIDENCE-GATED COMPLIANCE DOSSIER</span><h1 className="display-md" style={{ marginTop: '4px', marginBottom: '8px' }}>Product Compliance Passport</h1><p className="body-md" style={{ color: 'var(--color-muted)', maxWidth: '720px' }}>A passport is generated only after you confirm a specific, curated QCO product record. Similar standards are never treated as a compliance decision.</p></div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}><button className="btn-secondary" disabled={!verified} onClick={download}><Download size={16} /> Download evidence</button><button className="btn-primary" disabled={!verified} onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</button></div>
    </div>

    <form onSubmit={submit} className="editorial-chat-box" style={{ padding: '18px', display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(180px, 1fr) auto', gap: '10px', marginBottom: '24px' }}>
      <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Product name, HSN, or IS number" className="editorial-input" style={{ padding: '11px' }} />
      <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City (optional)" className="editorial-input" style={{ padding: '11px' }} />
      <button className="btn-primary" disabled={!input.trim() || state === 'loading'}>{state === 'loading' ? <LoaderCircle size={16} /> : <Search size={16} />}{state === 'loading' ? 'Checking' : 'Find match'}</button>
    </form>

    {state === 'idle' && <div style={{ maxWidth: '920px', margin: '0 auto', padding: '28px', border: '1px dashed #94a3b8', borderRadius: '10px', color: '#475569', textAlign: 'center' }}>Start with a product, HSN, or IS number.</div>}
    {state === 'loading' && <div style={{ maxWidth: '920px', margin: '0 auto', padding: '28px', color: '#475569', textAlign: 'center' }}>Checking the curated QCO, standard, scheme, and verified lab-scope records…</div>}
    {state === 'error' && <div style={{ maxWidth: '920px', margin: '0 auto', padding: '18px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px' }}><ShieldAlert size={18} style={{ verticalAlign: 'middle', marginRight: '7px' }} />{error}</div>}

    {result?.status === 'needs_disambiguation' && <div className="editorial-chat-box" style={{ maxWidth: '920px', padding: '24px', margin: '0 auto' }}><h2 className="title-md">Confirm the regulated product</h2><p style={{ color: '#64748b', margin: '6px 0 16px' }}>{result.reason}</p>{result.candidates?.map((item) => <button key={item.id} onClick={() => lookup(input, item.id)} style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}><strong>{item.product_desc}</strong><div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{item.is_number} · {item.scheme || 'Scheme not listed'} · Effective: {item.effective_on || 'not listed'}</div><div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{item.qco_title}</div></button>)}</div>}

    {result?.status === 'no_verified_match' && <div style={{ maxWidth: '920px', margin: '0 auto', padding: '20px', background: '#fff7ed', color: '#9a3412', borderRadius: '8px' }}><ShieldAlert size={18} style={{ verticalAlign: 'middle', marginRight: '7px' }} />{result.reason}</div>}
    {result?.status === 'research_only' && <div style={{ maxWidth: '920px', margin: '0 auto', padding: '20px', background: '#eff6ff', color: '#1e3a8a', borderRadius: '8px' }}><strong>Research result only.</strong> {result.reason}<div style={{ marginTop: '8px' }}>{result.standard?.is_number} — {result.standard?.title}</div></div>}

    {verified && <div className="passport-dossier" style={{ background: '#fff', border: '2px solid #181d26', borderRadius: '12px', padding: '34px', boxShadow: '0 8px 30px rgba(0,0,0,.05)', maxWidth: '920px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', borderBottom: '2px solid #181d26', paddingBottom: '18px', marginBottom: '22px' }}><div><div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>MANAK MITRA · VERIFIED CURATED-RECORD PASSPORT</div><h2 style={{ fontSize: '24px', marginTop: '4px' }}>{result.product}</h2></div><div style={{ color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={17} /> VERIFIED QCO ITEM</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}><section style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}><small>APPLICABLE INDIAN STANDARD</small><strong style={{ display: 'block', fontSize: '17px', marginTop: '5px' }}>{result.matched_standard}</strong><p style={{ marginTop: '5px', color: '#475569', fontSize: '13px' }}>{missing(standard?.title)}</p></section><section style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}><small>CERTIFICATION SCHEME</small><strong style={{ display: 'block', fontSize: '17px', marginTop: '5px' }}>{scheme?.name || candidate.scheme}</strong><p style={{ marginTop: '5px', color: '#475569', fontSize: '13px' }}>{missing(scheme?.applies_when)}</p></section></div>
      <section style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '18px' }}><small>QCO AND APPLICABILITY</small><strong style={{ display: 'block', marginTop: '5px' }}>{candidate.qco_title}</strong><div style={{ marginTop: '7px', fontSize: '13px', color: '#475569' }}>Effective date: {candidate.effective_on || 'Not listed'} · Curated confidence: {result.applicability.confidence}</div><div style={{ marginTop: '5px', fontSize: '13px', color: '#475569' }}>Scheme fee: {missing(scheme?.fees?.application)}</div></section>
      <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '18px' }}><small>VERIFIED LAB-SCOPE MAPPINGS {city ? `· ${city}` : ''}</small>{result.labs?.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '10px', marginTop: '10px' }}>{result.labs.map((lab, index) => <div key={`${lab.lab_code}-${index}`} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '11px' }}><strong style={{ fontSize: '13px' }}>{lab.name}</strong><div style={{ fontSize: '12px', color: '#64748b' }}><MapPin size={12} /> {lab.city}, {lab.state}</div><div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '4px' }}>{lab.is_number} · {lab.mapping_status}</div></div>)}</div> : <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>No explicit lab-scope mapping is in the local data for this standard. No generic lab is substituted.</p>}</section>
      <section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}><small>OFFICIAL SOURCES</small>{citations.map((citation, index) => citation.url ? <a key={`${citation.kind}-${index}`} href={citation.url} target="_blank" rel="noreferrer" style={{ display: 'block', color: '#1b61c9', fontSize: '13px', marginTop: '6px' }}>{citation.ref}</a> : <div key={`${citation.kind}-${index}`} style={{ fontSize: '13px', marginTop: '6px' }}>{citation.ref}</div>)}<p style={{ fontSize: '12px', color: '#64748b', marginTop: '14px' }}>Before filing, verify current amendments, exemptions, and enforcement notices through the linked official sources.</p></section>
    </div>}
  </div>;
}
