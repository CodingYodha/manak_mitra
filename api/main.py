import os
import pathlib

# Automatically load .env file
_ROOT = pathlib.Path(__file__).parent.parent
_env_file = _ROOT / ".env"
if _env_file.exists():
    with open(_env_file, encoding="utf-8") as _ef:
        for _l in _ef:
            _l = _l.strip()
            if _l and not _l.startswith("#") and "=" in _l:
                _k, _v = _l.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())

import json
from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from api import answers, guard, store, marks, lang as lang_utils
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
    ql = q.lower().strip()
    # 0. Friendly greetings, pleasantries, identity queries
    if re.search(r"^\s*(hi|hello|hey|hii+|heyy+|namaste|नमस्ते|नमस्कार|सुप्रभात|who are you|what can you do|help|thanks|thank you|धन्यवाद)\b", ql) or ql in ["hi", "hii", "hello", "hey", "heyy", "namaste", "नमस्ते"]:
        return "greeting"
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
    # Keep the API responsive while the large graph is idle.  Graph routes load
    # the same cached graph on first use; verifier and scheme routes need not
    # wait for that expensive deserialisation.
    try:
        from api import graph_store
        if graph_store.is_ready():
            print("[main] Knowledge graph will load on its first graph request")
        else:
            print("[main] graph.gpickle not found — run: python api/graph_build.py")
    except Exception as e:
        print(f"[main] Graph load skipped: {e}")


def _evaluate_query(q: str, lang: str = "en", channel: str = "web"):
    is_hi = lang_utils.is_hindi(q) or lang == "hi"
    user_lang = "hi" if is_hi else lang

    # Translate Hindi input query to English for intent routing & standards vector search
    query_en = lang_utils.translate(q, src="hi", tgt="en") if is_hi else q

    intent = route(query_en)
    city = extract_city(query_en) or extract_city(q)

    # ── 0. Greeting / Conversational Intent ──────────────────────────────────
    if intent == "greeting":
        if is_hi:
            greeting_text = (
                "नमस्ते! 🙏 मैं *मानक मित्र (Manak Mitra)* हूँ — भारतीय मानक ब्यूरो (BIS), उपभोक्ता मामले मंत्रालय का आधिकारिक AI अनुपालन सहायक।\n\n"
                "आप मुझसे निम्न के बारे में पूछ सकते हैं:\n"
                "• अनिवार्य गुणवत्ता नियंत्रण आदेश (QCOs)\n"
                "• भारतीय मानक (IS Numbers जैसे LED के लिए IS 16102)\n"
                "• देश भर की 340+ मान्यता प्राप्त परीक्षण प्रयोगशालाएं\n"
                "• प्रमाणीकरण प्रक्रियाएं एवं शुल्क (ISI, CRS, FMCS, हॉलमार्किंग)\n"
                "• 6-अंकीय HUID हॉलमार्क एवं CM/L लाइसेंस जांच\n\n"
                "आज मैं आपकी क्या सहायता कर सकता हूँ?"
            )
        else:
            greeting_text = (
                "Namaste! 🙏 I am Manak Mitra, your official AI Compliance Assistant for the Bureau of Indian Standards (BIS), Government of India.\n\n"
                "Here is what I can assist you with:\n"
                "• Mandatory Quality Control Orders (QCOs)\n"
                "• Indian Standards (IS Numbers, e.g. IS 16102 for LED bulbs)\n"
                "• Finding nearest accredited testing laboratories across 340+ facilities\n"
                "• Certification schemes & fees (ISI Mark, CRS, FMCS, Hallmarking)\n"
                "• Validating 6-digit HUID gold hallmarks & CM/L licenses\n\n"
                "How can I help with your compliance today?"
            )

        return {
            "intent": intent,
            "is_hi": is_hi,
            "user_lang": user_lang,
            "query_en": query_en,
            "facts": {},
            "top": 1.0,
            "abstained": False,
            "citations": [],
            "refs": [],
            "direct_answer": greeting_text,
            "verification": None,
            "passport_url": ""
        }

    # ── 1. Consumer / Mark Verification ──────────────────────────────────────
    elif intent == "consumer":
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
        if is_hi:
            answer_text = lang_utils.translate(answer_text, src="en", tgt="hi")
        refs = list(dict.fromkeys([c["ref"] for c in citations if "ref" in c]))

        return {
            "intent": intent,
            "is_hi": is_hi,
            "user_lang": user_lang,
            "query_en": query_en,
            "facts": facts,
            "top": 1.0,
            "abstained": False,
            "citations": citations,
            "refs": refs,
            "direct_answer": answer_text,
            "verification": mark_res,
            "passport_url": ""
        }

    # ── 2. Scheme & Process Guidance ─────────────────────────────────────────
    elif intent == "scheme":
        facts = answers.scheme(query_en)

    # ── 3. Laboratory Lookup ────────────────────────────────────────────────
    elif intent == "labs":
        rec = answers.recommend(query_en)
        top_is = rec["hits"][0]["is_number"] if rec.get("hits") else None
        facts = answers.labs(city=city, category=query_en, is_number=top_is)

    # ── 4. Compliance Passport ──────────────────────────────────────────────
    elif intent == "passport":
        facts = answers.passport(query_en)

    # ── 5. Mandate & Standards Search ───────────────────────────────────────
    elif intent == "mandate":
        facts = answers.mandate(query_en)
        if not facts.get("mandatory"):
            rec = answers.recommend(query_en)
            hits = rec.get("hits", [])
            if hits:
                qco_rows = []
                matched_hit = hits[0]
                for h in hits[:5]:
                    rows = store.mandate_for(h["is_number"])
                    if rows:
                        qco_rows = rows
                        matched_hit = h
                        break

                if qco_rows:
                    r = qco_rows[0]
                    web_hits = rec.get("web_hits", []) or facts.get("web_hits", [])
                    web_cits = [c for c in rec.get("citations", []) if c.get("kind") == "web"] or [c for c in facts.get("citations", []) if c.get("kind") == "web"]
                    facts = {
                        "mandatory": True,
                        "scheme": r["scheme"],
                        "is_number": r["is_number"],
                        "effective_on": r.get("effective_on"),
                        "qco_title": r.get("qco_title"),
                        "hits": [matched_hit] + [h for h in hits if h["is_number"] != matched_hit["is_number"]],
                        "web_hits": web_hits,
                        "citations": [{
                            "kind": "qco",
                            "ref": r.get("is_number") or r.get("qco_title"),
                            "title": r.get("qco_title"),
                            "url": r.get("gazette_url"),
                            "retrieved_on": r.get("retrieved_on", "2026-09-09")
                        }] + [c for c in rec.get("citations", []) if c.get("ref") == r.get("is_number")] + [c for c in rec.get("citations", []) if c.get("ref") != r.get("is_number") and c.get("kind") != "web"] + web_cits
                    }
                else:
                    facts = rec
            else:
                facts = rec

    else:
        facts = answers.recommend(query_en)

    # ── Abstention & Confidence Check ───────────────────────────────────────
    hits = facts.get("hits", [])
    if hits:
        top = hits[0].get("dense_score", hits[0].get("score", 0.0))
    elif facts.get("citations"):
        top = 1.0
    else:
        top = facts.get("_top_score", 0.0)

    citations = facts.get("citations", [])
    refs = list(dict.fromkeys([c["ref"] for c in citations if "ref" in c]))
    passport_url = f"/passport/{query_en}" if intent in ["mandate", "recommend", "passport"] else ""

    if guard.should_abstain(top):
        refusal_answer = lang_utils.translate(guard.REFUSAL, src="en", tgt="hi") if is_hi else guard.REFUSAL
        return {
            "intent": intent,
            "is_hi": is_hi,
            "user_lang": user_lang,
            "query_en": query_en,
            "facts": facts,
            "top": top,
            "abstained": True,
            "citations": [],
            "refs": [],
            "direct_answer": refusal_answer,
            "passport_url": ""
        }

    return {
        "intent": intent,
        "is_hi": is_hi,
        "user_lang": user_lang,
        "query_en": query_en,
        "facts": facts,
        "top": top,
        "abstained": False,
        "citations": citations,
        "refs": refs,
        "direct_answer": None,
        "passport_url": passport_url
    }


@app.post("/chat")
def chat(q: str, lang: str = "en", channel: str = "web"):
    res = _evaluate_query(q, lang, channel)
    intent = res["intent"]
    user_lang = res["user_lang"]
    refs = res["refs"]
    top = res["top"]
    abstained = res["abstained"]
    citations = res["citations"]

    store.log(
        ts=datetime.datetime.now().isoformat(),
        channel=channel,
        language=user_lang,
        intent=intent,
        matched_is=refs[0] if refs else None,
        top_score=top,
        abstained=1 if abstained else 0
    )

    if res["direct_answer"] is not None:
        return {
            "answer": res["direct_answer"],
            "intent": intent,
            "abstained": abstained,
            "citations": citations,
            "highlight_nodes": refs,
            "verification": res.get("verification"),
            "passport_url": res["passport_url"]
        }

    # Grounded Phrasing + Hallucination Enforcer
    raw_answer = answers.phrase(res["facts"], res["query_en"])
    text = guard.enforce(raw_answer, refs)

    # Translate response back to Hindi if input was vernacular
    if res["is_hi"]:
        text = lang_utils.translate(text, src="en", tgt="hi")

    return {
        "answer": text,
        "intent": intent,
        "abstained": False,
        "citations": citations,
        "highlight_nodes": refs,
        "passport_url": res["passport_url"]
    }


def _chat_event_generator(q: str, lang: str = "en", channel: str = "web"):
    res = _evaluate_query(q, lang, channel)
    intent = res["intent"]
    user_lang = res["user_lang"]
    refs = res["refs"]
    top = res["top"]
    abstained = res["abstained"]
    citations = res["citations"]
    passport_url = res["passport_url"]

    store.log(
        ts=datetime.datetime.now().isoformat(),
        channel=channel,
        language=user_lang,
        intent=intent,
        matched_is=refs[0] if refs else None,
        top_score=top,
        abstained=1 if abstained else 0
    )

    if res["direct_answer"] is not None:
        for word in res["direct_answer"].split(" "):
            yield f"data: {json.dumps({'t': word + ' '})}\n\n"
    else:
        for chunk in answers.phrase_stream(res["facts"], res["query_en"], lang="hi" if res["is_hi"] else "en"):
            yield f"data: {json.dumps({'t': chunk})}\n\n"

    meta_payload = {
        "citations": citations,
        "abstained": abstained,
        "intent": intent,
        "highlight_nodes": refs,
        "passport_url": passport_url,
        "verification": res.get("verification")
    }
    yield f"event: meta\ndata: {json.dumps(meta_payload)}\n\n"
    yield "event: done\ndata: {}\n\n"


@app.api_route("/chat/stream", methods=["GET", "POST"])
def chat_stream(q: str, lang: str = "en", channel: str = "web"):
    return StreamingResponse(
        _chat_event_generator(q, lang, channel),
        media_type="text/event-stream"
    )


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


@app.get("/api/schemes")
def get_schemes():
    return answers.scheme_catalog()


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
def get_labs_near(product: str = "", city: str = "", category: str = "", is_number: str = "", limit: int = 50):
    return answers.labs(
        product=product or None,
        city=city or None,
        category=category or None,
        is_number=is_number or None,
        limit=limit
    )


@app.get("/api/labs")
def get_lab_catalog(query: str = "", city: str = "", category: str = "", limit: int = 24):
    return store.lab_catalog(query=query, city=city, category=category, limit=limit)


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


# ── Web Search endpoint (Exa) ─────────────────────────────────────────────────
@app.get("/search/web")
def search_web(q: str, n: int = 3):
    """
    Direct Exa neural web search scoped to BIS-authoritative domains.
    Returns live results from bis.gov.in, egazette.gov.in, standardsbis.in, etc.

    Query params:
        q  — search query (any language)
        n  — number of results (default: 3, max: 10)
    """
    try:
        from api import web_search as ws
    except ImportError:
        try:
            import web_search as ws  # type: ignore
        except ImportError:
            return {"results": [], "error": "web_search module not available"}

    import os
    if not os.environ.get("EXA_API_KEY"):
        return {
            "results": [],
            "warning": "EXA_API_KEY not set. Add it to .env to enable web search."
        }

    hits = ws.exa_search(q, num_results=min(n, 10))
    return {
        "query": q,
        "results": hits,
        "count": len(hits),
        "source": "exa.ai"
    }


@app.get("/api/analytics")
def analytics():
    return store.analytics()

