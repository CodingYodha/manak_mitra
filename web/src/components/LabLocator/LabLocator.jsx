import React, { useEffect, useState } from 'react';
import { ExternalLink, LoaderCircle, MapPin, Search, ShieldAlert } from 'lucide-react';
import { apiUrl } from '../../config';

export default function LabLocator() {
  const [labs, setLabs] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ query: '', city: '', category: '' });
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState('loading'); setError('');
      try {
        const params = new URLSearchParams({ limit: '24' });
        Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
        const response = await fetch(apiUrl(`/api/labs?${params}`), { signal: controller.signal });
        if (!response.ok) throw new Error(`Laboratory service returned HTTP ${response.status}.`);
        const data = await response.json();
        setLabs(data.labs || []); setCities(data.cities || []); setCategories(data.categories || []); setTotal(data.total_indexed || 0); setState('ready');
      } catch (requestError) {
        if (requestError.name !== 'AbortError') { setError(requestError.message || 'Unable to load the laboratory directory.'); setState('error'); }
      }
    }, filters.query ? 250 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [filters]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  return <div className="container section-rhythm" style={{ paddingTop: '40px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '28px' }}>
      <div><span className="caption" style={{ color: '#0a2e0e', fontWeight: 600 }}>CURATED BIS LIMS DIRECTORY</span><h2 className="display-md" style={{ marginTop: '4px', marginBottom: '8px' }}>Recognised BIS Testing Laboratories</h2><p className="body-md" style={{ color: 'var(--color-muted)' }}>Search the backend-served directory of {total || '…'} indexed laboratories. Cards only show details present in the curated data.</p></div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <label style={{ position: 'relative' }}><Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} /><input value={filters.query} onChange={(event) => setFilter('query', event.target.value)} placeholder="Lab, city, or scope…" className="editorial-input" style={{ paddingLeft: '30px', width: '190px' }} /></label>
        <select value={filters.city} onChange={(event) => setFilter('city', event.target.value)}><option value="">All cities</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select>
        <select value={filters.category} onChange={(event) => setFilter('category', event.target.value)}><option value="">All scopes</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
      </div>
    </div>
    {state === 'loading' && <div style={{ padding: '18px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}><LoaderCircle size={17} /> Updating laboratory results…</div>}
    {state === 'error' && <div style={{ padding: '16px', borderRadius: '8px', color: '#991b1b', background: '#fef2f2', display: 'flex', gap: '8px' }}><ShieldAlert size={18} /> {error} No static contact cards are shown as a fallback.</div>}
    {state === 'ready' && !labs.length && <div className="editorial-chat-box" style={{ padding: '24px' }}>No indexed laboratory matches these filters. Try a broader city, scope, or lab name.</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
      {labs.map((lab) => <div key={lab.lab_id} className="editorial-chat-box" style={{ padding: '24px' }}>
        <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#166534', fontWeight: 600, padding: '3px 8px', borderRadius: '4px' }}>CURATED BIS LIMS LISTING</span>
        <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#181d26', margin: '12px 0 6px' }}>{lab.name}</h3>
        <div style={{ display: 'flex', gap: '6px', color: '#64748b', fontSize: '13px', marginBottom: '16px' }}><MapPin size={14} color="#2563eb" /> {lab.city}, {lab.state}</div>
        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>INDEXED SCOPE</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{(lab.categories || '').split(/[;,]/).filter(Boolean).map((category) => <span key={category} style={{ fontSize: '12px', background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px' }}>{category.trim()}</span>)}</div>
        <a href="https://lims.bis.gov.in/" target="_blank" rel="noreferrer" style={{ marginTop: '18px', color: '#2563eb', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'inline-flex', gap: '4px', alignItems: 'center' }}>Check current scope in BIS LIMS <ExternalLink size={13} /></a>
      </div>)}
    </div>
  </div>;
}
