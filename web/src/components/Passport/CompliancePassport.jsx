import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Building2, Check, CheckCircle2, Download, ExternalLink,
  FileCheck2, FlaskConical, LoaderCircle, MapPin, Printer, Search,
  ShieldAlert, ShieldCheck, Stamp
} from 'lucide-react';
import { apiUrl } from '../../config';

const missing = (item) => item || 'Not listed in the verified catalogue';
const DEMOS = [
  ['9W LED bulb', 'CRS · IS 16102'],
  ["children's plastic toy", 'ISI · IS 9873'],
  ['22K gold ring', 'Hallmarking · IS 1417']
];

function SourceLink({ citation }) {
  const label = citation.ref || citation.title || 'Official source';
  return citation.url ? <a href={citation.url} target="_blank" rel="noreferrer" className="passport-source"><FileCheck2 size={14} /><span>{label}</span><ExternalLink size={12} /></a> : <span className="passport-source"><FileCheck2 size={14} /><span>{label}</span></span>;
}

export default function CompliancePassport({ initialProduct = '' }) {
  const [input, setInput] = useState(initialProduct);
  const [city, setCity] = useState('');
  const [result, setResult] = useState(null);
  const [state, setState] = useState(initialProduct ? 'loading' : 'idle');
  const [error, setError] = useState('');

  const lookup = useCallback(async (product, candidateId = null) => {
    const query = product.trim();
    if (!query) return;
    setInput(query); setState('loading'); setError(''); setResult(null);
    try {
      const params = new URLSearchParams();
      if (candidateId) params.set('candidate_id', String(candidateId));
      if (city.trim()) params.set('city', city.trim());
      const response = await fetch(apiUrl(`/api/passport/${encodeURIComponent(query)}${params.toString() ? `?${params}` : ''}`));
      if (!response.ok) throw new Error(`The compliance service returned HTTP ${response.status}.`);
      setResult(await response.json()); setState('ready');
    } catch (lookupError) {
      setError(lookupError.message || 'Unable to retrieve this passport.'); setState('error');
    }
  }, [city]);

  useEffect(() => {
    setInput(initialProduct);
    if (initialProduct) lookup(initialProduct);
    else { setResult(null); setState('idle'); }
  }, [initialProduct]);

  const candidate = result?.selected_candidate;
  const standard = result?.standard;
  const scheme = result?.scheme;
  const verified = result?.status === 'verified';
  const citations = result?.citations || [];
  const dossierId = verified ? `MM-${String(candidate.id).padStart(5, '0')}-${String(result.matched_standard || '').replace(/\D/g, '').slice(0, 6)}` : '';
  const steps = scheme?.steps || [];
  const mark = scheme?.required_marks;
  const evidenceText = useMemo(() => !verified ? '' : [
    'MANAK MITRA — EVIDENCE-GATED COMPLIANCE PASSPORT', `Local dossier reference: ${dossierId}`, '',
    `Product: ${result.product}`, `Applicable Indian Standard: ${result.matched_standard}`,
    `Certification route: ${scheme?.name || candidate.scheme}`, `Governing QCO: ${candidate.qco_title}`,
    `Effective date: ${candidate.effective_on || 'Not supplied in source record'}`, '',
    'COMPLIANCE WORKFLOW', ...steps.map((step, index) => `${index + 1}. ${step.title} — ${step.duration_label || 'Timing varies'}`), '',
    'VERIFIED LAB-SCOPE MAPPINGS', ...(result.labs || []).map((lab) => `- ${lab.name} | ${lab.city || ''}, ${lab.state || ''} | ${lab.is_number}`), '',
    'OFFICIAL SOURCES', ...citations.map((citation) => `- ${citation.ref}${citation.url ? `: ${citation.url}` : ''}`), '',
    `Generated locally ${new Date().toLocaleString()}. Verify current amendments, exemptions, and enforcement notices before filing.`
  ].join('\n'), [verified, result, candidate, scheme, citations, steps, dossierId]);

  const download = () => {
    if (!evidenceText) return;
    const url = URL.createObjectURL(new Blob([evidenceText], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `manak-mitra-${result.product.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}-passport.txt`;
    link.click(); URL.revokeObjectURL(url);
  };

  return <div className="container section-rhythm passport-page">
    <header className="feature-page-hero">
      <div>
        <span className="feature-kicker"><ShieldCheck size={14} /> EVIDENCE-GATED COMPLIANCE DOSSIER</span>
        <h1>Product Compliance Passport</h1>
        <p>Turn one product description into a defensible QCO → standard → scheme → testing pathway, backed by the local regulatory catalogue.</p>
      </div>
      <div className="feature-proof-row"><span><Check size={13} /> QCO anchored</span><span><Check size={13} /> Lab-scope mapped</span><span><Check size={13} /> Print ready</span></div>
    </header>

    <section className="passport-search-card">
      <div className="demo-selector"><span>Judge-ready examples</span>{DEMOS.map(([query, label]) => <button key={query} onClick={() => lookup(query)}><strong>{query}</strong><small>{label}</small></button>)}</div>
      <form onSubmit={(event) => { event.preventDefault(); lookup(input); }}>
        <label><span>Product, HSN or IS number</span><div className="input-with-icon"><Search size={17} /><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Try: 9W LED bulb" /></div></label>
        <label><span>Preferred testing city <em>optional</em></span><div className="input-with-icon"><MapPin size={17} /><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Delhi" /></div></label>
        <button className="btn-primary" disabled={!input.trim() || state === 'loading'}>{state === 'loading' ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}{state === 'loading' ? 'Building passport' : 'Generate passport'}</button>
      </form>
    </section>

    {state === 'idle' && <div className="feature-empty-state"><Stamp size={30} /><strong>No passport generated yet</strong><span>Choose a demo product or search the full curated catalogue.</span></div>}
    {state === 'loading' && <div className="feature-empty-state loading"><LoaderCircle className="spin" size={30} /><strong>Assembling verified evidence</strong><span>Matching QCO, Indian Standard, certification route and lab scopes…</span></div>}
    {state === 'error' && <div className="feature-alert error"><ShieldAlert size={20} />{error}</div>}

    {result?.status === 'needs_disambiguation' && <section className="passport-choice-panel"><h2>Confirm the regulated product</h2><p>{result.reason}</p><div className="candidate-grid">{result.candidates?.map((item) => <button className="passport-choice" key={item.id} onClick={() => lookup(input, item.id)}><span className="candidate-standard">{item.is_number}</span><strong>{item.product_desc}</strong><small>{item.scheme || 'Scheme not listed'} · Effective {item.effective_on || 'date not listed'}</small><span className="candidate-qco">{item.qco_title}</span><ArrowRight size={16} /></button>)}</div></section>}
    {result?.status === 'no_verified_match' && <section className="passport-no-match-panel">
      <div className="no-match-verdict"><ShieldAlert size={23} /><div><span>SAFE ABSTENTION</span><h2>No catalogue decision issued</h2><p>{result.reason}</p></div></div>
      <div className="no-match-metrics"><div><strong>{result.search_diagnostics?.catalogue?.mandatory_products?.toLocaleString?.() || 0}</strong><span>mandatory products checked</span></div><div><strong>{result.search_diagnostics?.catalogue?.standards?.toLocaleString?.() || 0}</strong><span>standards searchable</span></div><div><strong>0</strong><span>unsupported claims made</span></div></div>
      {result.suggestions?.length > 0 && <div className="no-match-suggestions"><span>CLOSE CATALOGUE TERMS — CONFIRM BEFORE USE</span><div>{result.suggestions.map((item) => <button key={`${item.id}-${item.is_number}`} onClick={() => lookup(item.product_desc, item.id)}><strong>{item.product_desc}</strong><small>{item.is_number} · {Math.round(item.suggestion_score * 100)}% lexical similarity</small><ArrowRight size={14} /></button>)}</div></div>}
      <div className="no-match-guidance"><div><strong>Try a recognised identifier</strong><span>{result.search_diagnostics?.accepted_inputs?.join(' · ')}</span></div><ol>{result.next_actions?.map((action) => <li key={action}>{action}</li>)}</ol></div>
    </section>}
    {result?.status === 'research_only' && <div className="feature-alert info"><FileCheck2 size={20} /><div><strong>Standard found—QCO link not confirmed</strong><span>{result.reason} {result.standard?.is_number} — {result.standard?.title}</span></div></div>}

    {verified && <article className="passport-dossier">
      <div className="passport-cover">
        <div><span className="verified-seal"><CheckCircle2 size={18} /> VERIFIED CATALOGUE MATCH</span><h2>{result.product}</h2><p>Local dossier reference <strong>{dossierId}</strong> · Generated {new Date().toLocaleDateString('en-IN')}</p></div>
        <div className="passport-actions"><button className="btn-secondary" onClick={download}><Download size={16} /> Evidence file</button><button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</button></div>
      </div>

      <div className="passport-verdict-grid">
        <section className="verdict mandatory"><span>LEGAL APPLICABILITY</span><strong>Mandatory</strong><small>QCO catalogue confidence {Math.round((result.applicability?.confidence || 1) * 100)}%</small></section>
        <section><span>APPLICABLE STANDARD</span><strong>{result.matched_standard}</strong><small>{missing(standard?.status)} · {missing(standard?.year)}</small></section>
        <section><span>CERTIFICATION ROUTE</span><strong>{scheme?.name || candidate.scheme}</strong><small>{scheme?.total_timeline || 'Timeline depends on assessment'}</small></section>
      </div>

      <section className="compliance-chain-section"><div className="section-heading"><div><span>DECISION TRACE</span><h3>How the catalogue reached this result</h3></div><small>Every step maps to a stored entity or relationship</small></div><div className="compliance-chain"><div><Building2 /><span>Product</span><strong>{candidate.product_desc}</strong></div><ArrowRight /><div><FileCheck2 /><span>Governing QCO</span><strong>{candidate.qco_title}</strong></div><ArrowRight /><div><ShieldCheck /><span>Indian Standard</span><strong>{result.matched_standard}</strong></div><ArrowRight /><div><Stamp /><span>Certification</span><strong>{candidate.scheme}</strong></div><ArrowRight /><div><FlaskConical /><span>Testing scope</span><strong>{result.labs?.length || 0} verified matches</strong></div></div></section>

      <div className="passport-detail-grid">
        <section className="passport-section"><div className="section-heading"><div><span>EXECUTION PLAN</span><h3>Certification workflow</h3></div><small>{steps.length} documented steps</small></div><div className="passport-timeline">{steps.map((step, index) => <div key={step.id || index}><span>{index + 1}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div><small>{step.duration_label || 'Timing varies'}</small></div>)}</div></section>
        <aside className="passport-side-stack">
          <section className="passport-section mark-card"><div className="section-heading"><div><span>MARKING REQUIREMENT</span><h3>{mark?.primary || 'Applicable BIS mark'}</h3></div></div><ul>{mark?.identifiers?.map((item) => <li key={item}><CheckCircle2 size={14} />{item}</li>)}</ul><div className="fee-note"><span>Application fee</span><strong>{missing(scheme?.fees?.application || scheme?.fees?.hallmarking_per_article_gold)}</strong></div></section>
          <section className="passport-section qco-card"><span>GOVERNING NOTIFICATION</span><strong>{candidate.qco_title}</strong><p>Effective {candidate.effective_on || 'date not listed'} · {candidate.ministry || 'Issuing ministry in source record'}</p>{candidate.gazette_url && <a href={candidate.gazette_url} target="_blank" rel="noreferrer">Open gazette source <ExternalLink size={13} /></a>}</section>
        </aside>
      </div>

      <section className="passport-section lab-scope-section"><div className="section-heading"><div><span>VERIFIED TESTING OPTIONS</span><h3>BIS lab-scope matches for {result.matched_standard}</h3></div><small>{result.labs?.length || 0} returned</small></div>{result.labs?.length ? <div className="passport-lab-table">{result.labs.map((lab, index) => <div key={`${lab.lab_code}-${index}`}><span className="lab-rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{lab.name}</strong><small><MapPin size={11} /> {[lab.city, lab.state].filter(Boolean).join(', ') || 'Location not listed'}</small></div><span className="scope-badge"><Check size={12} /> {lab.is_number}</span></div>)}</div> : <div className="feature-alert warning"><ShieldAlert size={18} />No explicit lab-scope mapping was returned for this standard and city. Use BIS LIMS before sample submission.</div>}</section>

      <section className="passport-section source-register"><div className="section-heading"><div><span>AUDIT TRAIL</span><h3>Official source register</h3></div><small>{citations.length} evidence records</small></div><div>{citations.map((citation, index) => <SourceLink key={`${citation.ref}-${index}`} citation={citation} />)}</div></section>
      <footer className="passport-disclaimer"><ShieldAlert size={15} /><span>This is a decision-support dossier generated from curated records, not a licence or legal certificate. Verify current amendments and exemptions from the linked official source before filing.</span></footer>
    </article>}
  </div>;
}
