from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from api import answers, guard, store, marks
from typing import Optional
import datetime
import re

app = FastAPI(title="Manak Mitra API", description="AI Assistant for Bureau of Indian Standards (BIS)", version="2.0")

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
    if re.search(r"\b(verify|huid|hallmark|fake|counterfeit|cml|cm/l|r-number|जांच|सत्यापन|हॉलमार्क)\b", ql):
        return "consumer"
    if re.search(r"\b(scheme|crs|isi|fmcs|process|fees|steps|application|how to apply|लाइसेंस|प्रक्रिया|शुल्क)\b", ql):
        return "scheme"
    if re.search(r"\b(lab|testing|test house|where to test|sample|प्रयोगशाला|टेस्टिंग)\b", ql):
        return "labs"
    if re.search(r"\b(mandatory|compulsory|do i need|require|qco|order|अनिवार्य|ज़रूरी)\b", ql):
        return "mandate"
    return "recommend"


def extract_city(q: str) -> str:
    """Extracts major Indian cities from user query if present."""
    cities = [
        "delhi", "new delhi", "mumbai", "bangalore", "bengaluru", "chennai", "kolkata",
        "hyderabad", "ahmedabad", "pune", "jaipur", "lucknow", "kanpur", "nagpur",
        "patna", "indore", "bhopal", "vadodara", "surat", "visakhapatnam", "tirupati",
        "guwahati", "raipur", "daman", "noida", "gurugram", "ghaziabad", "faridabad"
    ]
    ql = q.lower()
    for c in cities:
        if re.search(rf"\b{c}\b", ql):
            return c.title()
    return ""


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
    city = extract_city(q)

    # ── 1. Consumer / Mark Verification ──────────────────────────────────────
    if intent == "consumer":
        # Extract potential code if present in query
        code_match = re.search(r"\b([0-9A-Z]{6}|CM/L[- ]?\d{7}|R[- ]?\d{8})\b", q, re.I)
        code = code_match.group(1) if code_match else q
        mark_res = marks.verify_mark(code)

        citations = mark_res.get("citations", [])
        facts = {
            "mark_verification": mark_res,
            "citations": citations
        }
        answer_text = mark_res.get("reason", "Mark verification complete.")
        refs = [c["ref"] for c in citations]

        store.log(ts=datetime.datetime.now().isoformat(), channel=channel, language=lang,
                  intent=intent, matched_is=refs[0] if refs else None,
                  top_score=1.0, abstained=0)

        return {
            "answer": answer_text,
            "intent": intent,
            "abstained": False,
            "citations": citations,
            "highlight_nodes": refs,
            "verification": mark_res,
            "passport_url": ""
        }

    # ── 2. Scheme & Process Guidance ─────────────────────────────────────────
    elif intent == "scheme":
        facts = answers.scheme(q)

    # ── 3. Laboratory Lookup ────────────────────────────────────────────────
    elif intent == "labs":
        # Check if query references a specific standard or product
        rec = answers.recommend(q)
        top_is = rec["hits"][0]["is_number"] if rec.get("hits") else None
        facts = answers.labs(city=city, category=q, is_number=top_is)

    # ── 4. Compliance Passport ──────────────────────────────────────────────
    elif intent == "passport":
        facts = answers.passport(q)

    # ── 5. Mandate & Standards Search ───────────────────────────────────────
    elif intent == "mandate":
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
                        "effective_on": r.get("effective_on"),
                        "qco_title": r.get("qco_title"),
                        "hits": hits,
                        "citations": [{
                            "kind": "qco",
                            "ref": r.get("is_number") or r.get("qco_title"),
                            "title": r.get("qco_title"),
                            "url": r.get("gazette_url"),
                            "retrieved_on": r.get("retrieved_on", "2026-09-09")
                        }] + rec.get("citations", [])
                    }
                else:
                    facts = rec
            else:
                facts = rec

    else:
        facts = answers.recommend(q)

    # ── Abstention & Confidence Check ───────────────────────────────────────
    hits = facts.get("hits", [])
    if hits:
        top = hits[0].get("dense_score", hits[0].get("score", 0.0))
    elif facts.get("citations"):
        top = 1.0
    else:
        top = facts.get("_top_score", 0.0)

    if guard.should_abstain(top):
        store.log(ts=datetime.datetime.now().isoformat(), channel=channel, language=lang,
                  intent=intent, matched_is=None, top_score=top, abstained=1)
        return {
            "answer": guard.REFUSAL,
            "intent": intent,
            "abstained": True,
            "citations": []
        }

    citations = facts.get("citations", [])
    refs = [c["ref"] for c in citations if "ref" in c]

    # Grounded Phrasing + Hallucination Enforcer
    raw_answer = answers.phrase(facts, q)
    text = guard.enforce(raw_answer, refs)

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


@app.post("/verify/mark")
async def verify_mark_endpoint(
    code: Optional[str] = Form(None),
    mark_type: Optional[str] = Form("auto"),
    purity: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Dedicated endpoint for validating HUID, ISI, and CRS marks from text or uploaded image.
    """
    if file:
        content = await file.read()
        return marks.extract_mark_from_image(content)

    if code:
        return marks.verify_mark(code=code, mark_type=mark_type or "auto", purity=purity)

    return {
        "valid": False,
        "reason": "Please provide either a mark code string or an image file to verify.",
        "citations": []
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
def get_labs_near(product: str = "", city: str = "", category: str = "", is_number: str = ""):
    return answers.labs(
        product=product or None,
        city=city or None,
        category=category or None,
        is_number=is_number or None
    )


# ── Passport endpoints ────────────────────────────────────────────────────────
@app.get("/api/passport/{product:path}")
def api_passport(product: str, candidate_id: Optional[int] = None, city: str = ""):
    return answers.passport(product, candidate_id=candidate_id, city=city)


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


@app.get("/api/analytics")
def analytics():
    return store.analytics()
