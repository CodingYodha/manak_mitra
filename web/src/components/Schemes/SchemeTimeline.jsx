import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Building2, Check, ChevronRight, Clock, ExternalLink,
  FileCheck2, Globe2, Landmark, LoaderCircle, ShieldAlert, Stamp
} from 'lucide-react';
import { apiUrl } from '../../config';

const SCHEME_META = {
  CRS: { short: 'Electronics registration', icon: FileCheck2, tone: 'blue' },
  ISI: { short: 'Domestic product licence', icon: Stamp, tone: 'orange' },
  HALLMARKING: { short: 'Gold & silver assurance', icon: Landmark, tone: 'gold' },
  FMCS: { short: 'Foreign manufacturers', icon: Globe2, tone: 'purple' }
};

function durationLabel(duration) {
  if (!Array.isArray(duration) || duration.length !== 2) return 'Timing varies';
  const [minimum, maximum] = duration;
  return minimum === maximum ? `${minimum} day${minimum === 1 ? '' : 's'}` : `${minimum}–${maximum} days`;
}

const readableFee = (key) => key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function SchemeTimeline() {
  const [schemes, setSchemes] = useState({});
  const [selectedSchemeKey, setSelectedSchemeKey] = useState('CRS');
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl('/api/schemes'), { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(`Scheme service returned HTTP ${response.status}.`); return response.json(); })
      .then((data) => {
        const fourSchemes = Object.fromEntries(Object.entries(data.schemes || {}).filter(([key]) => SCHEME_META[key]));
        setSchemes(fourSchemes); setSelectedSchemeKey((current) => fourSchemes[current] ? current : Object.keys(fourSchemes)[0] || ''); setState('ready');
      })
      .catch((loadError) => { if (loadError.name !== 'AbortError') { setError(loadError.message || 'Unable to load certification schemes.'); setState('error'); } });
    return () => controller.abort();
  }, []);

  const scheme = schemes[selectedSchemeKey];
  const meta = SCHEME_META[selectedSchemeKey] || SCHEME_META.CRS;
  const SchemeIcon = meta.icon;
  const fees = useMemo(() => Object.entries(scheme?.fees || {}).filter(([key]) => !['source_url', 'retrieved_on', 'note'].includes(key)), [scheme]);

  return <div className="container section-rhythm schemes-page">
    <header className="feature-page-hero">
      <div><span className="feature-kicker"><Landmark size={14} /> FOUR ROUTES · ONE DECISION WORKSPACE</span><h1>BIS Certification Schemes</h1><p>Compare applicability, evidence gates, cost heads and the complete application journey—all served dynamically from the curated backend.</p></div>
      <div className="feature-proof-row"><span><Check size={13} /> 4 schemes</span><span><Check size={13} /> Decision gates</span><span><Check size={13} /> Source-linked fees</span></div>
    </header>

    {state === 'loading' && <div className="feature-empty-state loading"><LoaderCircle className="spin" size={30} /><strong>Loading scheme decision trees</strong><span>Reading applicability, workflow, fees and mark requirements…</span></div>}
    {state === 'error' && <div className="feature-alert error"><ShieldAlert size={20} />{error}</div>}

    {scheme && <>
      <div className="scheme-selector-grid">{Object.entries(schemes).map(([key, item]) => { const itemMeta = SCHEME_META[key]; const Icon = itemMeta.icon; return <button key={key} className={`${itemMeta.tone} ${selectedSchemeKey === key ? 'active' : ''}`} onClick={() => setSelectedSchemeKey(key)}><span className="scheme-icon"><Icon size={20} /></span><span><small>{key}</small><strong>{itemMeta.short}</strong><em>{item.total_timeline}</em></span>{selectedSchemeKey === key && <Check size={16} />}</button>; })}</div>

      <article className={`scheme-workspace ${meta.tone}`}>
        <div className="scheme-workspace-header"><div className="scheme-title-lockup"><span><SchemeIcon size={25} /></span><div><small>{selectedSchemeKey} · CURATED CERTIFICATION ROUTE</small><h2>{scheme.name}</h2><p>{scheme.full_name}</p></div></div>{scheme.fees?.source_url && <a href={scheme.fees.source_url} target="_blank" rel="noreferrer" className="btn-secondary">Open official portal <ExternalLink size={14} /></a>}</div>

        <div className="scheme-kpi-grid">
          <section><span>WHO SHOULD USE IT</span><strong>{scheme.product_examples?.[0] || 'Not specified'}</strong><small>+{Math.max(0, (scheme.product_examples?.length || 1) - 1)} additional example categories</small></section>
          <section><span>DOCUMENTED CYCLE</span><strong>{scheme.total_timeline || 'Varies by application'}</strong><small>{scheme.steps?.length || 0} operational stages</small></section>
          <section><span>ENTRY FEE</span><strong>{scheme.fees?.application || scheme.fees?.hallmarking_per_article_gold || 'See fee schedule'}</strong><small>Testing, marking and inspection may be separate</small></section>
          <section><span>OUTPUT MARK</span><strong>{scheme.required_marks?.primary || 'Scheme-specific mark'}</strong><small>{scheme.required_marks?.validity || 'Validity is scheme specific'}</small></section>
        </div>

        <section className="scheme-applies"><Building2 size={20} /><div><span>APPLICABILITY RULE</span><p>{scheme.applies_when}</p></div></section>

        <div className="scheme-main-grid">
          <section className="scheme-panel"><div className="section-heading"><div><span>OPERATIONAL WORKFLOW</span><h3>From preparation to approval</h3></div><small>{scheme.steps?.length || 0} stages</small></div><div className="scheme-stepper">{(scheme.steps || []).map((step, index) => <div key={step.id || index} className="scheme-step"><div className="step-rail"><span>{index + 1}</span>{index < scheme.steps.length - 1 && <i />}</div><div><div className="step-heading"><strong>{step.title}</strong><span><Clock size={12} /> {durationLabel(step.duration_days)}</span></div><p>{step.detail}</p></div></div>)}</div></section>

          <aside className="scheme-side-stack">
            <section className="scheme-panel"><div className="section-heading"><div><span>DECISION GATES</span><h3>Eligibility checkpoint</h3></div></div><div className="decision-gates">{(scheme.decision_tree || []).map((gate, index) => <div key={gate.key || index}><span>{index + 1}</span><p>{gate.question}</p><ChevronRight size={15} /></div>)}</div></section>
            <section className="scheme-panel"><div className="section-heading"><div><span>MARK OUTPUT</span><h3>What appears on the product</h3></div></div><strong className="mark-primary">{scheme.required_marks?.primary}</strong><ul className="mark-identifiers">{scheme.required_marks?.identifiers?.map((item) => <li key={item}><Check size={13} />{item}</li>)}</ul></section>
          </aside>
        </div>

        <section className="scheme-panel fee-register"><div className="section-heading"><div><span>COST TRANSPARENCY</span><h3>Published fee heads</h3></div><small>Curated {scheme.fees?.retrieved_on || 'date not listed'}</small></div><div className="fee-grid">{fees.map(([key, value]) => <div key={key}><span>{readableFee(key)}</span><strong>{value}</strong></div>)}</div>{scheme.fees?.note && <p className="fee-disclaimer"><ShieldAlert size={14} />{scheme.fees.note}</p>}</section>

        <footer className="scheme-source-footer"><div><FileCheck2 size={17} /><span><strong>Backend-served evidence</strong><small>This page does not duplicate scheme data in the frontend.</small></span></div>{scheme.fees?.source_url && <a href={scheme.fees.source_url} target="_blank" rel="noreferrer">Verify latest fees at source <ArrowRight size={14} /></a>}</footer>
      </article>
    </>}
  </div>;
}
