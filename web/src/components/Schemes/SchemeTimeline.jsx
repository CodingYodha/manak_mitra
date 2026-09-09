import React, { useEffect, useMemo, useState } from 'react';
import { Clock, ExternalLink, LoaderCircle, ShieldAlert } from 'lucide-react';

const apiUrl = (path) => `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')}${path}`;

function durationLabel(duration) {
  if (!Array.isArray(duration) || duration.length !== 2) return 'Not published';
  const [minimum, maximum] = duration;
  return minimum === maximum ? `${minimum} day${minimum === 1 ? '' : 's'}` : `${minimum}–${maximum} days`;
}

function cycleLabel(steps) {
  const durations = steps?.map((step) => step.duration_days).filter((duration) => Array.isArray(duration) && duration.length === 2) || [];
  if (!durations.length || durations.length !== steps.length) return 'See published step timings';
  const minimum = durations.reduce((total, [value]) => total + value, 0);
  const maximum = durations.reduce((total, [, value]) => total + value, 0);
  return `${minimum}–${maximum} documented days`;
}

export default function SchemeTimeline() {
  const [schemes, setSchemes] = useState({});
  const [selectedSchemeKey, setSelectedSchemeKey] = useState('');
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadSchemes() {
      try {
        const response = await fetch(apiUrl('/api/schemes'), { signal: controller.signal });
        if (!response.ok) throw new Error(`Scheme service returned HTTP ${response.status}.`);
        const data = await response.json();
        const catalog = data.schemes || {};
        const firstKey = Object.keys(catalog)[0] || '';
        setSchemes(catalog);
        setSelectedSchemeKey((current) => catalog[current] ? current : firstKey);
        setState('ready');
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Unable to load certification schemes.');
          setState('error');
        }
      }
    }
    loadSchemes();
    return () => controller.abort();
  }, []);

  const scheme = schemes[selectedSchemeKey];
  const totalCycle = useMemo(() => cycleLabel(scheme?.steps), [scheme]);

  return <div className="container section-rhythm" style={{ paddingTop: '40px' }}>
    <div style={{ marginBottom: '28px' }}>
      <span className="caption" style={{ color: '#0a2e0e', fontWeight: 600 }}>COMPLIANCE WORKFLOW GUIDE</span>
      <h2 className="display-md" style={{ marginTop: '4px', marginBottom: '8px' }}>Certification Scheme Decision Trees & Timelines</h2>
      <p className="body-md" style={{ color: 'var(--color-muted)' }}>Backend-served scheme steps, applicability, and source links. Timelines show the documented durations for each step, not a guarantee of approval.</p>
    </div>

    {state === 'loading' && <div className="editorial-chat-box" style={{ padding: '28px', display: 'flex', gap: '10px', alignItems: 'center', color: '#64748b' }}><LoaderCircle size={18} /> Loading curated certification schemes…</div>}
    {state === 'error' && <div style={{ padding: '18px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}><ShieldAlert size={18} /> {error} The page intentionally does not substitute unverified static scheme data.</div>}

    {scheme && <>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {Object.keys(schemes).map((key) => <button key={key} className={`btn-pill ${selectedSchemeKey === key ? 'active' : ''}`} style={selectedSchemeKey === key ? { background: '#181d26', color: '#ffffff', border: 'none' } : {}} onClick={() => setSelectedSchemeKey(key)}>{key} Scheme</button>)}
      </div>

      <div className="editorial-chat-box" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '24px' }}>
          <div><span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>{selectedSchemeKey} · CURATED SCHEME</span><h3 style={{ fontSize: '22px', fontWeight: 600, color: '#181d26', marginTop: '6px' }}>{scheme.name}</h3></div>
          {scheme.fees?.source_url && <a href={scheme.fees.source_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px' }}>Official Scheme Portal <ExternalLink size={13} /></a>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>APPLIES WHEN</div><div style={{ fontSize: '13.5px', color: '#181d26', fontWeight: 500, marginTop: '4px' }}>{scheme.applies_when || 'Not published'}</div></div>
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>PUBLISHED APPLICATION FEE</div><div style={{ fontSize: '13.5px', color: '#181d26', fontWeight: 600, marginTop: '4px' }}>{scheme.fees?.application || 'Not published'}</div>{scheme.fees?.retrieved_on && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Curated {scheme.fees.retrieved_on}</div>}</div>
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>DOCUMENTED STEP CYCLE</div><div style={{ fontSize: '13.5px', color: '#15803d', fontWeight: 600, marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}><Clock size={14} /> {totalCycle}</div></div>
        </div>

        <div><h4 style={{ fontSize: '15px', fontWeight: 600, color: '#181d26', marginBottom: '16px' }}>Published certification steps</h4><div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {(scheme.steps || []).map((step, index) => <div key={step.id || index} style={{ display: 'flex', gap: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#181d26', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>{index + 1}</div>
            <div style={{ flex: 1 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}><strong style={{ fontSize: '15px', color: '#181d26' }}>{step.title}</strong><span style={{ fontSize: '12px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{durationLabel(step.duration_days)}</span></div>{step.detail && <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>{step.detail}</p>}</div>
          </div>)}
        </div></div>
      </div>
    </>}
  </div>;
}
