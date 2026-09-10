import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Camera, Check, CheckCircle2, ExternalLink, FileSearch,
  ImageUp, LoaderCircle, ScanLine, ShieldAlert, ShieldCheck, Sparkles,
  UploadCloud, XCircle
} from 'lucide-react';
import { apiUrl } from '../../config';

const MARK_TYPES = {
  huid: { label: 'Gold HUID', description: '6-character hallmark identifier', placeholder: '9A2F8K', example: '9A2F8K', standard: 'IS 1417', portal: 'BIS CARE' },
  isi: { label: 'ISI Licence', description: '7-digit CM/L manufacturer licence', placeholder: 'CM/L-1234567', example: 'CM/L-1234567', standard: 'Scheme-I', portal: 'MANAK Online' },
  crs: { label: 'CRS Registration', description: '8-digit electronics R-number', placeholder: 'R-41001234', example: 'R-41001234', standard: 'Scheme-II', portal: 'CRS portal' }
};

function AnalysisCheck({ pass, label, detail }) {
  return <div className={`analysis-check ${pass ? 'pass' : 'fail'}`}>{pass ? <CheckCircle2 size={17} /> : <XCircle size={17} />}<div><strong>{label}</strong><span>{detail}</span></div></div>;
}

export default function MarkVerifier() {
  const [markType, setMarkType] = useState('huid');
  const [code, setCode] = useState('');
  const [purity, setPurity] = useState('916');
  const [result, setResult] = useState(null);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const active = MARK_TYPES[markType];

  const verify = async ({ nextCode = code, file = null } = {}) => {
    if (!file && !nextCode.trim()) return;
    setState('loading'); setError(''); setResult(null);
    try {
      const form = new FormData();
      form.append('mark_type', markType);
      if (markType === 'huid') form.append('purity', purity);
      if (file) form.append('file', file);
      else form.append('code', nextCode.trim());
      const response = await fetch(apiUrl('/verify/mark'), { method: 'POST', body: form });
      if (!response.ok) throw new Error(`Verification service returned HTTP ${response.status}.`);
      const data = await response.json();
      setResult(data); setState('ready');
      if (data.code && data.code !== 'Not detected') setCode(data.code);
    } catch (verifyError) {
      setError(verifyError.message || 'Unable to verify this mark.'); setState('error');
    }
  };

  const score = Math.round((result?.confidence || 0) * 100);
  const isPlausible = result?.status === 'structurally_plausible';
  const isSuspicious = result?.status === 'suspicious';
  const isIncomplete = result?.status === 'incomplete';
  const displayScore = isIncomplete ? Math.round(result?.ocr_confidence || 0) : score;
  const evidenceChecks = useMemo(() => {
    if (!result) return [];
    if (isIncomplete) return [
      [result.evidence?.purity_mark_detected, 'Purity mark extracted', result.purity_mark || 'No fineness mark detected'],
      [result.evidence?.huid_detected, 'Separate HUID detected', 'A distinct 6-character identifier is required'],
      [result.evidence?.hallmark_context, 'Hallmark context', 'BIS hallmark labels were recognised'],
      [result.verified, 'Registry authenticity', 'Requires confirmation through BIS CARE']
    ];
    if (markType === 'huid') return [
      [result.evidence?.length_valid, 'Length rule', 'Exactly 6 characters required'],
      [result.evidence?.mixed_alphanumeric, 'Character mix', 'Contains both letters and numbers'],
      [!result.evidence?.dictionary_word, 'OCR sanity check', 'Not a known false-positive word'],
      [Boolean(purity), 'Fineness selected', `${purity} purity · ${purity === '916' ? '22 karat' : 'recognised grade'}`]
    ];
    return [
      [isPlausible, 'Official number grammar', markType === 'isi' ? 'CM/L followed by 7 digits' : 'R followed by 8 digits'],
      [score >= 60, 'Extraction confidence', `${score}% structural confidence`],
      [Boolean(result.code), 'Normalised identifier', result.code || 'No code extracted']
    ];
  }, [result, markType, purity, isPlausible, isIncomplete, score]);

  return <div className="container section-rhythm verifier-page">
    <header className="feature-page-hero">
      <div><span className="feature-kicker"><ScanLine size={14} /> CONSUMER AUTHENTICITY CHECKPOINT</span><h1>BIS Mark Intelligence</h1><p>Scan a label or enter its identifier. The local engine performs OCR, mark-type detection and structural checks, then hands off to the correct official registry.</p></div>
      <div className="feature-proof-row"><span><Check size={13} /> Local OCR</span><span><Check size={13} /> 3 mark grammars</span><span><Check size={13} /> Official handoff</span></div>
    </header>

    <div className="verifier-layout">
      <section className="verifier-workbench">
        <div className="mark-type-grid">{Object.entries(MARK_TYPES).map(([key, item]) => <button key={key} className={markType === key ? 'active' : ''} onClick={() => { setMarkType(key); setCode(''); setResult(null); setError(''); }}><span className="mark-type-icon">{key === 'huid' ? 'Au' : key === 'isi' ? 'ISI' : 'R'}</span><span><strong>{item.label}</strong><small>{item.description}</small></span>{markType === key && <CheckCircle2 size={16} />}</button>)}</div>

        <div className="verification-input-panel">
          <div className="verification-panel-heading"><div><span>STEP 1</span><h2>Provide the mark identifier</h2></div><button onClick={() => { setCode(active.example); setTimeout(() => verify({ nextCode: active.example }), 0); }}><Sparkles size={13} /> Run demo: {active.example}</button></div>
          <form onSubmit={(event) => { event.preventDefault(); verify(); }}>
            <label><span>{active.label} code</span><div className="scan-input"><FileSearch size={19} /><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={active.placeholder} autoComplete="off" /><span>{active.standard}</span></div></label>
            {markType === 'huid' && <label><span>Purity / fineness</span><select value={purity} onChange={(event) => setPurity(event.target.value)}>{[['916','22K'],['750','18K'],['585','14K'],['999','24K'],['958','23K'],['375','9K']].map(([value, label]) => <option key={value} value={value}>{value} · {label}</option>)}</select></label>}
            <button className="btn-primary" disabled={!code.trim() || state === 'loading'}>{state === 'loading' ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}{state === 'loading' ? 'Analysing' : 'Analyse mark'}</button>
          </form>
          <div className="upload-zone"><div><UploadCloud size={22} /><span><strong>Or scan the physical mark</strong><small>JPG/PNG · OCR runs locally through the backend</small></span></div><label className="btn-secondary"><Camera size={15} /> Choose image<input type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) verify({ file }); event.target.value = ''; }} /></label></div>
        </div>

        {state === 'idle' && <div className="verification-placeholder"><ImageUp size={28} /><strong>Ready to inspect a mark</strong><span>Use the demo button for a predictable judge walkthrough.</span></div>}
        {state === 'loading' && <div className="verification-placeholder active"><div className="scanner-animation"><ScanLine size={30} /></div><strong>Running the validation pipeline</strong><span>OCR extraction → normalisation → grammar rules → official handoff</span></div>}
        {error && <div className="feature-alert error"><ShieldAlert size={19} />{error}</div>}

        {result && <section className={`mark-result-card ${isPlausible ? 'pass' : isSuspicious || isIncomplete ? 'warn' : 'fail'}`}>
          <div className="mark-result-header">
            <div className="confidence-ring" style={{ '--score': `${displayScore * 3.6}deg` }}><span><strong>{displayScore}%</strong><small>{isIncomplete ? 'OCR confidence' : 'format score'}</small></span></div>
            <div><span className="result-eyebrow">STRUCTURAL ANALYSIS COMPLETE</span><h2>{isPlausible ? 'Format is structurally plausible' : isIncomplete ? 'Purity mark found — HUID missing' : isSuspicious ? 'Review recommended' : 'Format check failed'}</h2><p>{result.purity_mark || result.code || result.candidate} · {result.mark_type}</p></div>
            <span className="result-status-pill">{isPlausible ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}{isPlausible ? 'Passed rules' : isIncomplete ? 'Incomplete mark' : isSuspicious ? 'Suspicious' : 'Invalid'}</span>
          </div>
          <div className="mark-result-body"><div><h3>Machine checks</h3><div className="analysis-checks">{evidenceChecks.map(([pass, label, detail]) => <AnalysisCheck key={label} pass={pass} label={label} detail={detail} />)}</div></div><div className="reason-card"><span>ENGINE EXPLANATION</span><p>{result.reason}</p>{result.ocr_text && <div><strong>Extracted OCR text</strong><code>{result.ocr_text}</code></div>}</div></div>
          <div className="official-handoff"><div><ShieldAlert size={19} /><span><strong>Final authenticity check required</strong><small>{result.official_handoff || result.handoff}</small></span></div>{result.citations?.find((item) => item.url) && <a href={result.citations.find((item) => item.url).url} target="_blank" rel="noreferrer">Continue to {active.portal} <ExternalLink size={14} /></a>}</div>
          {result.citations?.length > 0 && <div className="mark-source-row">{result.citations.map((citation, index) => citation.url ? <a key={index} href={citation.url} target="_blank" rel="noreferrer">{citation.ref}<ExternalLink size={11} /></a> : <span key={index}>{citation.ref}</span>)}</div>}
        </section>}
      </section>

      <aside className="verifier-explainer"><span className="feature-kicker">WHAT THIS PROVES</span><h2>Transparent verification, not a fake “verified” badge</h2><div className="verifier-pipeline">{[['01','Extract','OCR reads candidate text from the uploaded label'],['02','Classify','Engine detects HUID, CM/L or CRS grammar'],['03','Validate','Length, charset, purity and confidence rules run'],['04','Confirm','User is routed to the authoritative BIS registry']].map(([number, title, detail]) => <div key={number}><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div></div>)}</div><div className="truth-card"><ShieldCheck size={21} /><div><strong>Honest system boundary</strong><p>“Structurally plausible” means the printed code follows BIS grammar. Only BIS CARE, MANAK Online or the CRS registry can confirm a live licence holder.</p></div></div></aside>
    </div>
  </div>;
}
