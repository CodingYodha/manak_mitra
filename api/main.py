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
def api_passport(product: str):
    return answers.passport(product)

@app.get("/passport/{product:path}")
def view_passport(product: str):
    data = answers.passport(product)
    html = f"""
    <html>
    <head><title>Compliance Passport: {product}</title></head>
    <body style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1>Compliance Passport: {product}</h1>
        <button onclick="window.print()" style="margin-bottom: 20px; padding: 10px; cursor: pointer;">Print Dossier</button>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
            <pre style="white-space: pre-wrap;">{data}</pre>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(html)

@app.get("/stats")
def stats():
    return store.get_stats()
