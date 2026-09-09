import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ClipboardCheck, FileText, LoaderCircle, MapPin, Save, Search, Trash2 } from 'lucide-react';
import { apiUrl } from '../config';

const STORAGE_KEY = 'manak-compliance-workspace-v2';
const GENERIC_TASKS = ['Confirm the applicable Indian Standard and its current amendments', 'Choose a BIS-recognised laboratory with the required test scope', 'Prepare the application and product documentation required by the applicable scheme'];

export default function ComplianceJourney({ onOpenPassport, onOpenLabs }) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [result, setResult] = useState(null);
  const [complete, setComplete] = useState([]);
  const [saved, setSaved] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch { setSaved([]); }
  }, []);

  const tasks = useMemo(() => [...new Set([...(result?.scheme?.steps?.map((step) => step.title) || []), ...GENERIC_TASKS])], [result]);
  const standard = result?.matched_standard || result?.recommendation?.hits?.[0]?.is_number || 'No confirmed standard found';
  const scheme = result?.scheme?.name || result?.mandate?.scheme || 'Confirm with official BIS guidance';
  const persist = (items) => { setSaved(items); localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); };

  const findPath = async (event, candidateId = null) => {
    event?.preventDefault();
    const value = query.trim();
    if (!value) return;
    setLoading(true); setError(''); setResult(null); setComplete([]);
    try {
      const params = new URLSearchParams();
      if (candidateId !== null) params.set('candidate_id', String(candidateId));
      if (city.trim()) params.set('city', city.trim());
      const response = await fetch(apiUrl(`/api/passport/${encodeURIComponent(value)}${params.size ? `?${params}` : ''}`));
      if (!response.ok) throw new Error(`The compliance service returned ${response.status}`);
      const data = await response.json();
      setResult(data);
    } catch (err) { setError(err.message || 'Unable to retrieve the compliance path.'); }
    finally { setLoading(false); }
  };

  const toggleTask = (task) => setComplete((current) => current.includes(task) ? current.filter((item) => item !== task) : [...current, task]);
  const saveWorkspace = () => {
    if (!result) return;
    const entry = { id: `${query}-${Date.now()}`, query, city, standard, scheme, complete };
    persist([entry, ...saved.filter((item) => item.query.toLowerCase() !== query.toLowerCase())].slice(0, 8));
  };

  return <div className="container section-rhythm" style={{ paddingTop: '40px' }}>
    <div style={{ marginBottom: '28px' }}>
      <span className="caption" style={{ color: '#0a2e0e', fontWeight: 600 }}>ACTIONABLE COMPLIANCE</span>
      <h1 className="display-md" style={{ marginTop: '4px', marginBottom: '8px' }}>Build a compliance path for any product</h1>
      <p className="body-md" style={{ color: 'var(--color-muted)', maxWidth: '720px' }}>Enter a product name, HSN, or IS number. Manak Mitra searches the full local catalogue and returns the standards, scheme guidance, citations, and labs supported by the backend.</p>
    </div>

    <div className="editorial-chat-box" style={{ padding: '28px', maxWidth: '920px' }}>
      <form onSubmit={findPath} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) auto', gap: '12px', alignItems: 'end' }}>
        <label style={{ fontSize: '13px', fontWeight: 600 }}>Product, HSN, or IS number<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. electric kettle, 8516, IS 302" className="editorial-input" style={{ display: 'block', width: '100%', marginTop: '7px', padding: '11px' }} /></label>
        <label style={{ fontSize: '13px', fontWeight: 600 }}>Your city <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Pune" className="editorial-input" style={{ display: 'block', width: '100%', marginTop: '7px', padding: '11px' }} /></label>
        <button className="btn-primary" disabled={loading || !query.trim()}>{loading ? <LoaderCircle size={16} /> : <Search size={16} />}{loading ? 'Searching' : 'Build path'}</button>
      </form>
      {error && <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '13px' }}>{error}</div>}

      {result?.status === 'needs_disambiguation' && <div style={{ marginTop: '20px' }}><strong>Confirm the regulated product</strong><p style={{ color: '#64748b', fontSize: '13px', margin: '6px 0 12px' }}>{result.reason}</p>{result.candidates?.map((candidate) => <button key={candidate.id} className="btn-secondary" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: '8px' }} onClick={() => findPath(null, candidate.id)}><strong>{candidate.product_desc}</strong><span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{candidate.is_number} · {candidate.scheme || 'Scheme not listed'}</span></button>)}</div>}
      {result?.status === 'no_verified_match' && <div style={{ marginTop: '16px', padding: '12px', background: '#fff7ed', color: '#9a3412', borderRadius: '6px', fontSize: '13px' }}>{result.reason}</div>}
      {result?.status === 'research_only' && <div style={{ marginTop: '16px', padding: '12px', background: '#eff6ff', color: '#1e3a8a', borderRadius: '6px', fontSize: '13px' }}>{result.reason}</div>}
      {result?.status === 'verified' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', margin: '24px 0' }}>
          {[[standard, 'Matched standard'], [scheme, 'Certification path'], [`${result.labs?.length || 0} matching labs`, 'Available testing options']].map(([value, label]) => <div key={label} style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}><div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div><div style={{ fontWeight: 600, color: '#181d26', marginTop: '5px' }}>{value}</div></div>)}
        </div>
        <div style={{ padding: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '18px' }}><strong style={{ fontSize: '13px', color: '#1e3a8a' }}>Source basis</strong><div style={{ fontSize: '13px', color: '#1e40af', marginTop: '5px' }}>{result.citations?.slice(0, 4).map((citation) => citation.ref).filter(Boolean).join(' · ') || 'No citation was returned; verify through BIS before proceeding.'}</div></div>
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}><ClipboardCheck size={18} /><strong>Readiness checklist</strong><span style={{ color: '#64748b', fontSize: '12px' }}>{complete.length}/{tasks.length} complete</span></div>{tasks.map((task) => <label key={task} style={{ display: 'flex', gap: '10px', padding: '9px 0', cursor: 'pointer', color: '#334155' }}><input type="checkbox" checked={complete.includes(task)} onChange={() => toggleTask(task)} /> <span>{task}</span></label>)}</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '24px' }}><button className="btn-primary" onClick={() => onOpenPassport(query)}><FileText size={16} /> Open evidence passport <ArrowRight size={16} /></button><button className="btn-secondary" onClick={() => onOpenLabs(query, city)}><MapPin size={16} /> Find matching labs</button><button className="btn-secondary" onClick={saveWorkspace}><Save size={16} /> Save locally</button></div>
      </>}
    </div>

    {saved.length > 0 && <div style={{ maxWidth: '920px', marginTop: '28px' }}><h2 className="title-md" style={{ marginBottom: '12px' }}>Saved on this device</h2>{saved.map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' }}><div><strong>{item.query}</strong><div style={{ fontSize: '12px', color: '#64748b' }}>{item.standard} · {item.city || 'No city selected'} · {item.complete.length} tasks complete</div></div><div style={{ display: 'flex', gap: '8px' }}><button className="btn-secondary" onClick={() => onOpenPassport(item.query)}>Open</button><button aria-label="Remove saved workspace" className="btn-secondary" onClick={() => persist(saved.filter((entry) => entry.id !== item.id))}><Trash2 size={15} /></button></div></div>)}</div>}
  </div>;
}
