import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Check, CheckCircle2, ClipboardCheck, FileCheck2, FileText,
  FlaskConical, LoaderCircle, MapPin, Network, Save, Search, ShieldAlert,
  ShieldCheck, Sparkles, Stamp, Trash2
} from 'lucide-react';
import { apiUrl } from '../config';

const STORAGE_KEY = 'manak-compliance-workspace-v3';
const DEMOS = ['9W LED bulb', "children's plastic toy", '22K gold ring'];
const GENERIC_TASKS = [
  'Confirm current QCO amendments and exemptions',
  'Select a BIS-recognised laboratory with the required scope',
  'Prepare application, factory and product documentation'
];

export default function ComplianceJourney({ onOpenPassport, onOpenLabs }) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [result, setResult] = useState(null);
  const [complete, setComplete] = useState([]);
  const [saved, setSaved] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch { setSaved([]); } }, []);
  const tasks = useMemo(() => [...new Set([...(result?.scheme?.steps?.map((step) => step.title) || []), ...GENERIC_TASKS])], [result]);
  const standard = result?.matched_standard || 'Pending verified match';
  const scheme = result?.scheme?.name || result?.selected_candidate?.scheme || 'Pending route';
  const progress = tasks.length ? Math.round((complete.length / tasks.length) * 100) : 0;
  const persist = (items) => { setSaved(items); localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); };

  const findPath = async (event, candidateId = null, nextQuery = query) => {
    event?.preventDefault();
    const value = nextQuery.trim();
    if (!value) return;
    setQuery(value); setLoading(true); setError(''); setResult(null); setComplete([]);
    try {
      const params = new URLSearchParams();
      if (candidateId !== null) params.set('candidate_id', String(candidateId));
      if (city.trim()) params.set('city', city.trim());
      const response = await fetch(apiUrl(`/api/passport/${encodeURIComponent(value)}${params.size ? `?${params}` : ''}`));
      if (!response.ok) throw new Error(`The compliance service returned ${response.status}`);
      setResult(await response.json());
    } catch (err) { setError(err.message || 'Unable to retrieve the compliance path.'); }
    finally { setLoading(false); }
  };

  const toggleTask = (task) => setComplete((current) => current.includes(task) ? current.filter((item) => item !== task) : [...current, task]);
  const saveWorkspace = () => {
    if (!result) return;
    const entry = { id: `${query}-${Date.now()}`, query, city, standard, scheme, complete, progress, savedAt: new Date().toISOString() };
    persist([entry, ...saved.filter((item) => item.query.toLowerCase() !== query.toLowerCase())].slice(0, 8));
  };

  return <div className="container section-rhythm journey-page">
    <header className="feature-page-hero">
      <div><span className="feature-kicker"><Sparkles size={14} /> START HERE · PRODUCT-TO-LICENCE NAVIGATOR</span><h1>Your Compliance Journey</h1><p>Describe the product once. Manak Mitra resolves the legal basis, Indian Standard, certification route, testing options and a trackable readiness plan.</p></div>
      <div className="feature-proof-row"><span><Check size={13} /> Dynamic catalogue</span><span><Check size={13} /> Action checklist</span><span><Check size={13} /> Saved locally</span></div>
    </header>

    <section className="journey-intake">
      <div className="journey-demo-row"><span>Demo journeys</span>{DEMOS.map((item) => <button key={item} onClick={() => findPath(null, null, item)}>{item}<ArrowRight size={12} /></button>)}</div>
      <form onSubmit={findPath}><label><span>What do you manufacture or import?</span><div className="input-with-icon"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Product name, HSN or IS number" /></div></label><label><span>Testing preference <em>optional</em></span><div className="input-with-icon"><MapPin size={17} /><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Your city" /></div></label><button className="btn-primary" disabled={loading || !query.trim()}>{loading ? <LoaderCircle className="spin" size={17} /> : <Network size={17} />}{loading ? 'Mapping journey' : 'Build my path'}</button></form>
    </section>

    {error && <div className="feature-alert error"><ShieldAlert size={19} />{error}</div>}
    {!result && !loading && <div className="journey-zero-state"><div className="journey-map-preview">{[['01',FileCheck2,'QCO'],['02',ShieldCheck,'Standard'],['03',Stamp,'Scheme'],['04',FlaskConical,'Testing'],['05',CheckCircle2,'Licence']].map(([number, Icon, label], index) => <React.Fragment key={number}><div><span>{number}</span><Icon size={20} /><strong>{label}</strong></div>{index < 4 && <ArrowRight size={17} />}</React.Fragment>)}</div><strong>One query becomes an auditable action plan</strong><span>No static example logic—the same backend flow runs for every catalogue product.</span></div>}
    {loading && <div className="feature-empty-state loading"><LoaderCircle className="spin" size={30} /><strong>Traversing compliance evidence</strong><span>Product → QCO → IS standard → scheme → lab scope</span></div>}

    {result?.status === 'needs_disambiguation' && <section className="journey-match-panel"><span className="feature-kicker">EVIDENCE GATE</span><h2>Confirm the exact regulated product</h2><p>{result.reason}</p><div>{result.candidates?.map((candidate) => <button key={candidate.id} onClick={() => findPath(null, candidate.id)}><span><strong>{candidate.product_desc}</strong><small>{candidate.is_number} · {candidate.scheme || 'Scheme not listed'} · Effective {candidate.effective_on || 'not listed'}</small></span><ArrowRight size={16} /></button>)}</div></section>}
    {result?.status === 'no_verified_match' && <div className="feature-alert warning"><ShieldAlert size={20} /><div><strong>No verified QCO-product match</strong><span>{result.reason}</span></div></div>}
    {result?.status === 'research_only' && <div className="feature-alert info"><FileCheck2 size={20} /><div><strong>Research result only</strong><span>{result.reason}</span></div></div>}

    {result?.status === 'verified' && <article className="journey-workspace">
      <div className="journey-verdict"><div><span><CheckCircle2 size={17} /> VERIFIED PATH</span><h2>{result.product}</h2><p>{result.selected_candidate?.qco_title}</p></div><div className="journey-progress" style={{ '--progress': `${progress * 3.6}deg` }}><span><strong>{progress}%</strong><small>ready</small></span></div></div>
      <div className="journey-result-chain">{[[FileCheck2,'QCO','Mandatory'],[ShieldCheck,'Standard',standard],[Stamp,'Route',scheme],[FlaskConical,'Scoped labs',`${result.labs?.length || 0} matches`]].map(([Icon,label,value], index) => <React.Fragment key={label}><section><Icon size={18} /><span>{label}</span><strong>{value}</strong></section>{index < 3 && <ArrowRight size={16} />}</React.Fragment>)}</div>
      <div className="journey-content-grid">
        <section className="journey-checklist"><div className="section-heading"><div><span>PERSONALISED READINESS PLAN</span><h3>Complete these actions before filing</h3></div><small>{complete.length}/{tasks.length} done</small></div>{tasks.map((task, index) => <label key={task} className={complete.includes(task) ? 'complete' : ''}><input type="checkbox" checked={complete.includes(task)} onChange={() => toggleTask(task)} /><span>{complete.includes(task) ? <CheckCircle2 size={17} /> : <span>{index + 1}</span>}</span><strong>{task}</strong></label>)}</section>
        <aside className="journey-actions"><span className="feature-kicker">NEXT BEST ACTIONS</span><button className="primary" onClick={() => onOpenPassport(query)}><FileText size={18} /><span><strong>Open compliance passport</strong><small>Full QCO and evidence dossier</small></span><ArrowRight size={15} /></button><button onClick={() => onOpenLabs(query, city)}><MapPin size={18} /><span><strong>Inspect testing options</strong><small>{result.labs?.length || 0} scope matches returned</small></span><ArrowRight size={15} /></button><button onClick={saveWorkspace}><Save size={18} /><span><strong>Save this workspace</strong><small>Private to this browser</small></span><ArrowRight size={15} /></button><div className="journey-source-note"><ShieldCheck size={17} /><span><strong>{result.citations?.length || 0} evidence records attached</strong><small>{result.citations?.slice(0, 3).map((item) => item.ref).join(' · ')}</small></span></div></aside>
      </div>
    </article>}

    {saved.length > 0 && <section className="saved-journeys"><div className="section-heading"><div><span>LOCAL WORKSPACE</span><h3>Saved compliance journeys</h3></div><small>{saved.length} on this device</small></div><div>{saved.map((item) => <article key={item.id}><span className="saved-progress">{item.progress || 0}%</span><div><strong>{item.query}</strong><small>{item.standard} · {item.city || 'All India'} · {item.complete.length} tasks completed</small></div><button onClick={() => onOpenPassport(item.query)}>Open</button><button aria-label="Remove saved journey" onClick={() => persist(saved.filter((entry) => entry.id !== item.id))}><Trash2 size={14} /></button></article>)}</div></section>}
  </div>;
}
