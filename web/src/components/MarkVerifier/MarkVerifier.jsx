import React, { useState } from 'react';
import { CheckCircle2, ImageUp, LoaderCircle, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

const apiUrl = (path) => `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')}${path}`;

const MARK_TYPES = {
  huid: { label: 'Hallmark HUID', placeholder: 'e.g. 9A2F8K' },
  isi: { label: 'ISI licence (CM/L)', placeholder: 'e.g. CM/L-1234567' },
  crs: { label: 'CRS R-number', placeholder: 'e.g. R-41001234' }
};

export default function MarkVerifier() {
  const [markType, setMarkType] = useState('huid');
  const [code, setCode] = useState('');
  const [purity, setPurity] = useState('916');
  const [result, setResult] = useState(null);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setState('loading'); setError(''); setResult(null);
    try {
      const form = new FormData();
      form.append('code', code.trim()); form.append('mark_type', markType); form.append('purity', purity);
      const response = await fetch(apiUrl('/verify/mark'), { method: 'POST', body: form });
      if (!response.ok) throw new Error(`Verification service returned HTTP ${response.status}.`);
      setResult(await response.json()); setState('ready');
    } catch (verifyError) { setError(verifyError.message || 'Unable to verify this mark.'); setState('error'); }
  };

  const scanImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setState('loading'); setError(''); setResult(null);
    try {
      const form = new FormData(); form.append('file', file);
      const response = await fetch(apiUrl('/verify/mark'), { method: 'POST', body: form });
      if (!response.ok) throw new Error(`Image scan returned HTTP ${response.status}.`);
      const data = await response.json(); setResult(data); setState('ready');
      if (data.code && data.code !== 'Not detected') setCode(data.code);
    } catch (scanError) { setError(scanError.message || 'Unable to scan this image.'); setState('error'); }
    finally { event.target.value = ''; }
  };

  return <div className="container section-rhythm" style={{ paddingTop: '40px' }}>
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <span className="caption" style={{ color: '#aa2d00', fontWeight: 600 }}>AUTHENTICITY CHECKPOINT</span>
      <h1 className="display-md" style={{ marginTop: '4px', marginBottom: '8px' }}>Mark verifier</h1>
      <p className="body-md" style={{ color: 'var(--color-muted)', marginBottom: '24px' }}>Checks code structure through the backend and shows official sources. A structurally valid code is not proof of live registry validity.</p>

      <div className="editorial-chat-box" style={{ padding: '26px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>{Object.entries(MARK_TYPES).map(([key, type]) => <button key={key} className={`btn-pill ${markType === key ? 'active' : ''}`} style={markType === key ? { background: '#181d26', color: '#fff', border: 'none' } : {}} onClick={() => { setMarkType(key); setResult(null); setError(''); }}><span>{type.label}</span></button>)}</div>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: markType === 'huid' ? 'minmax(0,2fr) minmax(150px,1fr) auto' : 'minmax(0,3fr) auto', gap: '12px', alignItems: 'end' }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Code<input value={code} onChange={(event) => setCode(event.target.value)} placeholder={MARK_TYPES[markType].placeholder} className="editorial-input" style={{ display: 'block', width: '100%', marginTop: '6px', padding: '11px', letterSpacing: '.04em' }} /></label>
          {markType === 'huid' && <label style={{ fontSize: '12px', fontWeight: 600 }}>Fineness<select value={purity} onChange={(event) => setPurity(event.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px', padding: '11px', border: '1px solid #ddd', borderRadius: '6px' }}>{['916','750','585','999','958','375'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
          <button className="btn-primary" disabled={!code.trim() || state === 'loading'}>{state === 'loading' ? <LoaderCircle size={16} /> : <ShieldCheck size={16} />} Verify</button>
        </form>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}><span style={{ fontSize: '12px', color: '#64748b' }}>Or scan a clear label image using the local OCR service.</span><label className="btn-secondary" style={{ cursor: 'pointer' }}><ImageUp size={16} /> Upload image<input type="file" accept="image/*" capture="environment" onChange={scanImage} style={{ display: 'none' }} /></label></div>
      </div>

      {state === 'loading' && <div style={{ padding: '18px', textAlign: 'center', color: '#64748b' }}>Verifying through the local mark-validation service…</div>}
      {error && <div style={{ marginTop: '18px', padding: '14px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px' }}>{error}</div>}
      {result && <div className={`verification-result ${result.status === 'structurally_plausible' ? 'valid' : result.status === 'suspicious' ? 'suspicious' : 'invalid'}`} style={{ 
        marginTop: '18px', padding: '20px', borderRadius: '8px', 
        background: result.status === 'structurally_plausible' ? '#f0fdf4' : result.status === 'suspicious' ? '#fffbeb' : '#fef2f2', 
        border: `1px solid ${result.status === 'structurally_plausible' ? '#bbf7d0' : result.status === 'suspicious' ? '#fde68a' : '#fecaca'}` 
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {result.status === 'structurally_plausible' ? <CheckCircle2 color="#16a34a" /> : result.status === 'suspicious' ? <AlertTriangle color="#d97706" /> : <ShieldAlert color="#dc2626" />}
          <strong style={{ color: result.status === 'structurally_plausible' ? '#166534' : result.status === 'suspicious' ? '#92400e' : '#991b1b' }}>
            {result.status === 'structurally_plausible' ? 'Structurally plausible' : result.status === 'suspicious' ? 'Suspicious / low-confidence OCR' : 'Invalid format'}
          </strong>
          <span style={{ fontSize: '12px', color: '#475569', marginLeft: 'auto' }}>{result.mark_type}</span>
        </div>
        <p style={{ margin: '12px 0', lineHeight: 1.5, color: '#334155' }}>{result.reason}</p>
        
        {result.evidence && (
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {result.evidence.dictionary_word && <span style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', color: '#991b1b' }}>Dictionary word detected</span>}
            {result.evidence.all_letters && !result.evidence.dictionary_word && <span style={{ background: '#ffedd5', padding: '2px 6px', borderRadius: '4px', color: '#9a3412' }}>Missing digits</span>}
            {result.evidence.all_digits && <span style={{ background: '#ffedd5', padding: '2px 6px', borderRadius: '4px', color: '#9a3412' }}>Missing letters</span>}
            {result.evidence.hallmark_context && <span style={{ background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', color: '#075985' }}>Context found</span>}
          </div>
        )}

        {result.ocr_text && <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px', background: '#f1f5f9', padding: '8px', borderRadius: '4px' }}><strong>OCR text:</strong> {result.ocr_text}</div>}
        <div style={{ fontSize: '13px', color: '#475569' }}><strong>Official next check:</strong> {result.official_handoff || result.handoff}</div>
        
        {result.citations?.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {result.citations.map((citation, index) => citation.url ? <a key={index} href={citation.url} target="_blank" rel="noreferrer" style={{ color: '#1b61c9', fontSize: '13px' }}>{citation.ref}</a> : <span key={index} style={{ fontSize: '13px' }}>{citation.ref}</span>)}
          </div>
        )}
      </div>}
      <p style={{ marginTop: '18px', padding: '12px 14px', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '6px', color: '#64748b', fontSize: '12px' }}><strong>Disclaimer:</strong> {result?.disclaimer || "This tool validates format and, when available, OCR extraction. It cannot access closed government databases, so always use the linked official portal or BIS CARE to confirm a licence, HUID, brand, or manufacturer."}</p>
    </div>
  </div>;
}
