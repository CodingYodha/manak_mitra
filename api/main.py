from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from api import answers, guard, store
import datetime
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def route(q: str) -> str:
    ql = q.lower()
    if re.search(r"\b(passport|dossier|compliance report|पासपोर्ट)\b", ql):
        return "passport"
    if re.search(r"\b(mandatory|compulsory|do i need|require|अनिवार्य|ज़रूरी|qco)\b", ql):
        return "mandate"
    if re.search(r"\b(scheme|crs|isi|hallmark|fmcs|process|fees|steps|प्रक्रिया|शुल्क)\b", ql):
        return "scheme"
    if re.search(r"\b(lab|testing|where to test|प्रयोगशाला|टेस्टिंग)\b", ql):
        return "labs"
    if re.search(r"\b(fake|huid|verify mark|हॉलमार्क|जांच)\b", ql):
        return "consumer"
    return "recommend"

@app.on_event("startup")
def on_startup():
    store.init()
    # Pre-load graph into memory on startup (non-fatal if not built yet)
    try:
        from api import graph_store
        if graph_store.is_ready():
            graph_store.get()
            print("[main] Knowledge graph loaded into memory")
        else:
            print("[main] graph.gpickle not found — run: python api/graph_build.py")
    except Exception as e:
        print(f"[main] Graph load skipped: {e}")

@app.post("/chat")
def chat(q: str, lang: str = "en", channel: str = "web"):
    intent = route(q)

    if intent == "mandate":
        facts = answers.mandate(q)
        if not facts.get("mandatory"):
            rec = answers.recommend(q)
            hits = rec.get("hits", [])
            if hits:
                top_hit = hits[0]
                qco_rows = store.mandate_for(top_hit["is_number"])
                if qco_rows:
                    r = qco_rows[0]
                    facts = {
                        "mandatory": True,
                        "scheme": r["scheme"],
                        "is_number": r["is_number"],
                        "effective_on": r["effective_on"],
                        "hits": hits,
                        "citations": [{"kind": "qco", "ref": r["qco_title"],
                                       "url": r["gazette_url"], "retrieved_on": r["retrieved_on"]}
                                      ] + rec.get("citations", [])
                    }
                else:
                    facts = rec
            else:
                facts = rec
    elif intent == "scheme":
        facts = {"data": answers.scheme("CRS"), "citations": []}
    elif intent == "labs":
        facts = {"data": answers.labs(product=q), "citations": []}
    elif intent == "passport":
        facts = {"data": answers.passport(q), "citations": []}
    else:
        facts = answers.recommend(q)

    hits = facts.get("hits", [])
    top = hits[0]["score"] if hits else (1.0 if facts.get("citations") else 0.0)

    if guard.should_abstain(top):
        store.log(ts=datetime.datetime.now().isoformat(), channel=channel, language=lang,
                  intent=intent, matched_is=None, top_score=top, abstained=1)
        return {"answer": guard.REFUSAL, "abstained": True, "citations": []}

    citations = facts.get("citations", [])
    refs = [c["ref"] for c in citations]

    text = guard.enforce(answers.phrase(facts, q), refs)
    store.log(ts=datetime.datetime.now().isoformat(), channel=channel, language=lang,
              intent=intent, matched_is=refs[0] if refs else None,
              top_score=top, abstained=0)

    return {
        "answer": text,
        "intent": intent,
        "abstained": False,
        "citations": citations,
        "highlight_nodes": refs,
        "passport_url": f"/passport/{q}" if intent in ["mandate", "recommend", "passport"] else ""
    }

# ── Graph endpoints ───────────────────────────────────────────────────────────
@app.get("/graph")
def get_graph(highlight: str = "", full: bool = False):
    try:
        from api import graph_queries
        center = f"std:{highlight}" if highlight else None
        data = graph_queries.subgraph_json(center_node=center, full=full, connected_only=not full)
        data["highlight_nodes"] = [highlight] if highlight else []
        return data
    except Exception:
        nodes = [highlight] if highlight else None
        return answers.graph(highlight=nodes)

@app.get("/graph/lab/{lab_id}")
def lab_detail(lab_id: str):
    try:
        from api import graph_queries
        return graph_queries.lab_scope(lab_id)
    except FileNotFoundError:
        return {"error": "Graph not built yet. Run: python api/graph_build.py"}

@app.get("/graph/related/{is_number:path}")
def related(is_number: str):
    try:
        from api import graph_queries
        return {"related": graph_queries.related_standards(is_number)}
    except FileNotFoundError:
        return {"error": "Graph not built yet."}

@app.get("/graph/ics/{ics_code}")
def ics_chain(ics_code: str):
    try:
        from api import graph_queries
        return {"chain": graph_queries.ics_ancestors(ics_code)}
    except FileNotFoundError:
        return {"error": "Graph not built yet."}

@app.get("/graph/product/{product:path}")
def product_path(product: str):
    try:
        from api import graph_queries
        return {"paths": graph_queries.product_to_lab_path(product)}
    except FileNotFoundError:
        return {"error": "Graph not built yet."}

# ── Lab endpoints ─────────────────────────────────────────────────────────────
@app.get("/labs/near")
def get_labs_near(product: str = "", city: str = "", category: str = ""):
    return answers.labs(product=product or None, city=city or None, category=category or None)

# ── Passport endpoints ────────────────────────────────────────────────────────
@app.get("/api/passport/{product:path}")
def api_passport(product: str, city: str = ""):
    return answers.passport(product, city=city or None)

@app.get("/passport/{product:path}")
def view_passport(product: str, city: str = ""):
    data = answers.passport(product, city=city or None)
    # Build printable one-page dossier
    import html as _html
    def esc(v): return _html.escape(str(v) if v is not None else "")
    verdict = esc(data.get("mandate_verdict", ""))
    is_number = esc(data.get("is_number", ""))
    scheme_name = esc(data.get("scheme", ""))
    timeline = esc(data.get("timeline", ""))
    fee = esc(data.get("indicative_fee", ""))
    next_step = esc(data.get("next_step", ""))
    qco = data.get("governing_qco", {}) or {}
    qco_title = esc(qco.get("title", ""))
    qco_url = esc(qco.get("url", ""))
    effective = esc(qco.get("effective_on") or data.get("effective_on", ""))
    markings = data.get("markings", {}) or {}
    marks_primary = esc(markings.get("primary", ""))
    marks_ids = markings.get("identifiers", []) or []
    marks_html = "".join(f"<li>{esc(m)}</li>" for m in marks_ids) or "<li>See scheme details</li>"
    labs = data.get("nearest_labs") or data.get("labs") or []
    labs_rows = ""
    for lab in labs[:3]:
        name = esc(lab.get("name") or lab.get("label") or lab.get("lab_id") or (lab.get("node","").split(":",1)[-1] if lab.get("node") else "") or "")
        city_l = esc(lab.get("city", ""))
        state = esc(lab.get("state", ""))
        cats = esc(lab.get("categories", "") or (", ".join([s.get("label","") for s in lab.get("sectors", [])[:2]]) if isinstance(lab.get("sectors"), list) else ""))
        dist = lab.get("distance_km")
        dist_s = f"{dist} km" if dist is not None else ""
        labs_rows += f"<tr><td>{name}</td><td>{city_l}, {state}</td><td>{cats}</td><td>{dist_s}</td></tr>"
    if not labs_rows:
        labs_rows = "<tr><td colspan='4'>No labs found — contact BIS helpline 1800-11-4000</td></tr>"
    fees = data.get("fees", {}) or {}
    fees_rows = ""
    for k, v in list(fees.items())[:6]:
        if k in ("source_url", "retrieved_on", "note"):
            continue
        fees_rows += f"<tr><td style='text-transform:capitalize'>{esc(k.replace('_',' '))}</td><td>{esc(v)}</td></tr>"
    source_url = esc(fees.get("source_url", "") or qco.get("url", ""))
    retrieved_on = esc(fees.get("retrieved_on", "") or qco.get("retrieved_on", ""))
    citations = data.get("citations", []) or []
    cites_html = ""
    for c in citations[:4]:
        kind = esc(c.get("kind", ""))
        ref = esc(c.get("ref", ""))
        url = esc(c.get("url", "") or c.get("purchase_url", ""))
        link = f" — <a href=\"{url}\">{url}</a>" if url else ""
        cites_html += f"<li><b>{kind}</b>: {ref}{link}</li>"
    steps = data.get("steps", []) or []
    steps_html = ""
    for s in steps:
        steps_html += f"<li><b>{esc(s.get('title',''))}</b> <span style='color:#555'>({esc(s.get('duration_label',''))})</span><br/><span style='font-size:13px'>{esc(s.get('detail','')[:160])}</span></li>"
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Compliance Passport: {esc(product)}</title>
<style>
  @media print {{ .no-print {{ display:none }} body {{ margin:0 }} }}
  body {{ font-family: -apple-system, Inter, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color:#181d26; line-height:1.4 }}
  h1 {{ font-size:22px; margin:0 0 4px 0 }} .sub {{ color:#555; font-size:13px; margin-bottom:16px }}
  .grid {{ display:grid; grid-template-columns:1fr 1fr; gap:12px }}
  .card {{ border:1px solid #ddd; border-radius:10px; padding:12px; background:#fff }}
  .card h3 {{ font-size:13px; letter-spacing:0.5px; text-transform:uppercase; color:#333; margin:0 0 6px 0 }}
  .badge {{ display:inline-block; background:#111; color:#fff; padding:4px 8px; border-radius:6px; font-size:12px }}
  table {{ width:100%; border-collapse:collapse; font-size:13px }}
  th, td {{ border:1px solid #e5e5e5; padding:6px 8px; text-align:left }}
  th {{ background:#f8fafc }}
  .footer {{ margin-top:16px; font-size:11px; color:#666; border-top:1px solid #ddd; padding-top:8px }}
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div><h1>Compliance Passport</h1><div class="sub">Manak Mitra · One-page dossier for <b>{esc(product)}</b></div></div>
    <button class="no-print" onclick="window.print()" style="padding:10px 16px;background:#181d26;color:#fff;border:none;border-radius:8px;cursor:pointer">Print / Save PDF</button>
  </div>

  <div class="card" style="margin-bottom:12px;background:#f8fafc">
    <span class="badge">{verdict}</span>
    <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
      <div><b>IS Number:</b> {is_number or '—'}<br/><b>Scheme:</b> {scheme_name or '—'}<br/><b>Timeline:</b> {timeline or '—'}</div>
      <div><b>Indicative Fee:</b> {fee or '—'}<br/><b>Effective:</b> {effective or '—'}<br/><b>Governing QCO:</b> {qco_title} {"<a href='"+qco_url+"'>link</a>" if qco_url else ""}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card"><h3>Required markings</h3><div style="font-size:13px"><b>{marks_primary}</b><ul style="margin:6px 0 0 16px;padding:0">{marks_html}</ul></div></div>
    <div class="card"><h3>Fees (source-verified)</h3><table><tr><th>Item</th><th>Amount</th></tr>{fees_rows}</table><div style="font-size:11px;color:#555;margin-top:4px">Source: {source_url or '—'} · Retrieved: {retrieved_on or '—'}</div></div>
  </div>

  <div class="card" style="margin-top:12px"><h3>Certification steps</h3><ol style="margin:6px 0 0 18px;font-size:13px">{steps_html or "<li>See scheme decision tree — contact BIS helpline 1800-11-4000</li>"}</ol></div>

  <div class="card" style="margin-top:12px"><h3>Nearest BIS-recognised labs</h3><table><tr><th>Lab</th><th>City</th><th>Category</th><th>Distance</th></tr>{labs_rows}</table></div>

  <div class="card" style="margin-top:12px"><h3>Next step</h3><div style="font-size:13px;background:#fff8e1;padding:8px;border-radius:6px">{next_step}</div></div>

  <div class="card" style="margin-top:12px"><h3>Citations</h3><ul style="font-size:12px;margin:6px 0 0 16px">{cites_html or "<li>—</li>"}</ul></div>

  <div class="footer">Disclaimer: Fees and timelines as per BIS portals listed. Structural mark check only — for authoritative HUID/CML verification use BIS CARE app / manakonline.in / crsbis.in. Helpline: <b>1800-11-4000</b> · bis.gov.in</div>
</body>
</html>"""
    return HTMLResponse(html)

@app.get("/marks/validate")
def marks_validate(code: str, mark_type: str = "auto"):
    from api import marks
    return marks.validate_typed(code, mark_type)

@app.post("/marks/analyze")
def marks_analyze(text: str):
    from api import marks
    return marks.analyze_text(text)

@app.get("/marks/rules")
def marks_rules():
    from api import marks
    return marks.get_supported_marks()

@app.get("/stats")
def stats():
    return store.get_stats()

# ── Schemes endpoints ────────────────────────────────────────────────────────
@app.get("/schemes")
def get_schemes():
    from api import schemes
    return schemes.list_schemes()

@app.get("/schemes/{name}")
def get_scheme_detail(name: str):
    from api import schemes
    return schemes.get_scheme(name)
