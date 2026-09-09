"""
Manak Mitra — Answer & Context Synthesis Engine
Ownership:
  recommend()          ← Shivaprasad (semantic retrieval over 23k+ standards)
  mandate()            ← Rudra (exact SQL QCO lookups)
  scheme()             ← Rudra & Jay (dynamic walk of schemes.yaml decision trees & fees)
  labs()               ← Rudra (lab scope and nearest lab lookup)
  passport()           ← Rudra (Compliance Passport dossier generator)
  graph()              ← Rudra (Knowledge Graph generator)
  phrase()             ← Rudra (Multi-LLM Grounded Phrasing Engine: Gemini/Groq/Azure/Ollama/Fallback)
  web_augment()        ← Rudra (Exa neural web search — live BIS/gazette results)
"""
import json
import logging
import os
import pathlib
import re
import sys
from typing import Optional, Dict, Any, List
import httpx
import yaml

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

logger = logging.getLogger("manak.answers")

_ROOT = pathlib.Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT / "api"))

# Automatically load .env if present
_env_file = _ROOT / ".env"
if _env_file.exists():
    with open(_env_file, encoding="utf-8") as _ef:
        for _l in _ef:
            _l = _l.strip()
            if _l and not _l.startswith("#") and "=" in _l:
                _k, _v = _l.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())


try:
    from api import search, store
except ImportError:
    try:
        import search
        import store
    except ImportError:
        search = None  # type: ignore[assignment]
        store = None

try:
    from api import web_search as _ws
except ImportError:
    try:
        import web_search as _ws  # type: ignore[assignment]
    except ImportError:
        _ws = None  # type: ignore[assignment]


# ── Web Search Augmentation ───────────────────────────────────────────────────
def web_augment(query: str, num_results: int = 3) -> Dict[str, Any]:
    """
    Calls Exa neural web search scoped to BIS-authoritative domains.
    Returns web hits and their citations in Manak Mitra citation format.
    Silently returns empty results if EXA_API_KEY is not set.
    """
    if _ws is None:
        return {"web_hits": [], "citations": []}

    hits = _ws.exa_search(query, num_results=num_results)
    citations = _ws.web_citations(hits)
    return {"web_hits": hits, "citations": citations}


def recommend(description: str) -> Dict[str, Any]:
    """
    Standard recommendation / semantic search.
    Given a natural-language product description (any language),
    returns the top matching IS standards with citations.
    Augments results with live Exa web search from BIS-authoritative sources.
    """
    rag_hits: list = []
    citations: list = []
    top_score = 0.0

    if search is not None:
        rag_hits = search.find(description, k=5)
        citations = [
            {
                "kind": "standard",
                "ref": h["is_number"],
                "title": h.get("title", ""),
                "status": h.get("status", "ACTIVE"),
                "is_free": h.get("is_free", False),
                "purchase_url": h.get("purchase_url", ""),
                "year": h.get("year", "")
            }
            for h in rag_hits
        ]
        if rag_hits:
            top_score = rag_hits[0].get("dense_score", rag_hits[0]["score"])

    # Augment with live Exa web search
    web = web_augment(description)
    citations.extend(web["citations"])

    return {
        "hits": rag_hits,
        "web_hits": web["web_hits"],
        "citations": citations,
        "_top_score": top_score if top_score > 0 else (1.0 if web["web_hits"] else 0.0),
    }


def mandate(term: str) -> Dict[str, Any]:
    """
    QCO mandate lookup via SQL. Must never hallucinate.
    Augmented with Exa web search for latest gazette notifications.
    """
    citations: list = []
    result: Dict[str, Any] = {"mandatory": None, "citations": []}

    if store:
        rows = store.mandate_for(term)
        if rows:
            r = rows[0]
            for row in rows[:3]:
                citations.append({
                    "kind": "qco",
                    "ref": row.get("is_number") or row.get("qco_title", "QCO Order"),
                    "product": row.get("product_desc", ""),
                    "scheme": row.get("scheme", "ISI"),
                    "title": row.get("qco_title", ""),
                    "url": row.get("gazette_url") or row.get("source_url", "https://egazette.gov.in/"),
                    "retrieved_on": row.get("retrieved_on", "2026-09-09")
                })
            result = {
                "mandatory": True,
                "scheme": r.get("scheme", "ISI"),
                "is_number": r.get("is_number"),
                "product_desc": r.get("product_desc"),
                "effective_on": r.get("effective_on"),
                "qco_title": r.get("qco_title"),
                "citations": citations,
                "_top_score": 1.0
            }

    # Augment with live Exa web search for QCO / gazette updates
    web = web_augment(f"QCO mandatory certification {term}")
    result["web_hits"] = web["web_hits"]
    result.setdefault("citations", [])
    result["citations"].extend(web["citations"])
    if not result.get("_top_score") and web["web_hits"]:
        result["_top_score"] = 0.8

    return result


def scheme(query_or_name: str) -> Dict[str, Any]:
    """
    Dynamic walk of Jay's schemes.yaml decision tree.
    Extracts scheme type (CRS, ISI, HALLMARKING, FMCS) from query.
    Augmented with Exa web search for latest BIS scheme fee/process updates.
    """
    path = _ROOT / "data" / "curated" / "schemes.yaml"
    if not path.exists():
        return {"scheme": None, "citations": []}

    with open(path, encoding="utf-8") as f:
        schemes_data = yaml.safe_load(f) or {}

    ql = query_or_name.strip().upper()

    # Detect target scheme from query
    target_key = "CRS"
    if "HALLMARK" in ql or "GOLD" in ql or "SILVER" in ql or "JEWELLERY" in ql or "HUID" in ql:
        target_key = "HALLMARKING"
    elif "FMCS" in ql or "FOREIGN" in ql or "IMPORT" in ql:
        target_key = "FMCS"
    elif "ISI" in ql or "SCHEME 1" in ql or "SCHEME I" in ql or "PRODUCT CERTIFICATION" in ql or "TOY" in ql or "CEMENT" in ql or "STEEL" in ql:
        target_key = "ISI"
    elif "CRS" in ql or "ELECTRONIC" in ql or "IT GOODS" in ql or "LED" in ql or "LAPTOP" in ql:
        target_key = "CRS"
    elif target_key not in schemes_data and schemes_data:
        target_key = list(schemes_data.keys())[0]

    sch = schemes_data.get(target_key, {})
    citations: list = []
    if sch:
        citations.append({
            "kind": "scheme",
            "ref": sch.get("name", target_key),
            "fees": sch.get("fees", {}).get("application", ""),
            "url": sch.get("fees", {}).get("source_url", "https://bis.gov.in/"),
            "retrieved_on": str(sch.get("fees", {}).get("retrieved_on", "2026-09-08"))
        })

    # Augment with live Exa web search for scheme updates
    web = web_augment(f"BIS {target_key} certification scheme fees process steps")
    citations.extend(web["citations"])

    return {
        "scheme_code": target_key,
        "scheme": sch,
        "web_hits": web["web_hits"],
        "citations": citations,
        "_top_score": 1.0
    }


def scheme_catalog() -> Dict[str, Any]:
    """Expose the curated scheme decision trees without frontend duplication."""
    path = _ROOT / "data" / "curated" / "schemes.yaml"
    if not path.exists():
        return {"schemes": {}, "retrieved": False}
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return {"schemes": data, "retrieved": True}



def labs(city: Optional[str] = None, category: Optional[str] = None,
         is_number: Optional[str] = None,
         product: Optional[str] = None,
         limit: int = 24) -> Dict[str, Any]:
    """
    Lab lookup: finds nearest accredited BIS lab, matching by specific standard IS number,
    product, or category. Uses graph_queries for real graph traversal when available.
    """
    # Try graph-based lab lookup first
    try:
        try:
            from api import graph_queries as gq
        except ImportError:
            import graph_queries as gq  # type: ignore
        effective_product = product or category
        if effective_product and city:
            graph_labs = gq.labs_near_for_product(effective_product, city, k=min(limit, 10))
            if graph_labs:
                return {"labs": graph_labs, "citations": []}
        elif effective_product:
            graph_labs = gq.labs_for_product(effective_product)[:limit]
            if graph_labs:
                return {"labs": graph_labs, "citations": []}
        elif city:
            return {"labs": gq.labs_by_city(city)[:limit], "citations": []}
    except (ImportError, FileNotFoundError, AttributeError):
        pass

    # Fallback: plain DB lookup
    if not store:
        return {"labs": [], "citations": []}

    results = []
    if is_number:
        results = store.get_labs_for_standard(is_number, city or "", limit=limit)

    if not results and (category or city or product):
        results = store.get_nearest_labs(city or "", category or product or "", limit=limit)

    if not results:
        # General fall-back anchor labs
        results = store.get_nearest_labs("", "", limit=min(limit, 10))

    citations = [
        {
            "kind": "lab",
            "ref": lab["name"],
            "city": lab.get("city", ""),
            "state": lab.get("state", ""),
            "is_number": lab.get("is_number", ""),
            "url": lab.get("source_url", "https://lims.bis.gov.in/")
        }
        for lab in results
    ]

    return {"labs": results, "citations": citations, "_top_score": 1.0}


def passport(product: str, candidate_id: Optional[int] = None, city: str = "") -> Dict[str, Any]:
    """Build an evidence-gated compliance passport.

    A semantic standard match is useful for discovery but not enough to claim a
    QCO, scheme, or eligible lab. This endpoint therefore requires an explicit
    curated QCO item (direct IS/HSN match or user-selected candidate) before it
    produces a verified passport. Everything else is a disambiguation or
    research-only result.
    """
    if not store:
        return {"status": "unavailable", "product": product, "reason": "Structured catalogue is unavailable."}

    candidates = store.passport_candidates(product)
    selected = None
    if candidate_id is not None:
        selected = next((item for item in candidates if item["id"] == candidate_id), None)
        if not selected:
            return {"status": "needs_disambiguation", "product": product, "reason": "Select one of the current catalogue matches.", "candidates": candidates}
    elif len(candidates) == 1 and candidates[0].get("exact_match"):
        selected = candidates[0]

    if not selected:
        explicit_standard = store.get_standard_by_number(product)
        if explicit_standard:
            return {
                "status": "research_only",
                "product": product,
                "reason": "The Indian Standard was found, but no linked mandatory-product/QCO record was confirmed.",
                "standard": explicit_standard,
                "candidates": candidates,
                "citations": [{"kind": "standard", "ref": explicit_standard["is_number"], "title": explicit_standard["title"], "url": explicit_standard.get("purchase_url", ""), "status": explicit_standard.get("status", "")}]
            }
        return {
            "status": "needs_disambiguation" if candidates else "no_verified_match",
            "product": product,
            "reason": "Select a matching regulated product before generating a compliance decision." if candidates else "No exact regulated-product match was found. Refine the product name, HSN, or IS number.",
            "candidates": candidates,
            "citations": []
        }

    standard = store.get_standard_by_number(selected.get("is_number") or "")
    scheme_result = scheme(selected.get("scheme") or "")
    labs = store.get_verified_labs_for_standard(selected.get("is_number") or "", city=city, limit=5)
    qco_citation = {
        "kind": "qco", "ref": selected.get("qco_title") or selected.get("is_number"),
        "title": selected.get("qco_title"), "url": selected.get("gazette_url") or selected.get("source_url", ""),
        "retrieved_on": selected.get("retrieved_on"), "effective_on": selected.get("effective_on"),
        "ministry": selected.get("ministry", "")
    }
    citations = [qco_citation]
    if standard:
        citations.append({"kind": "standard", "ref": standard["is_number"], "title": standard["title"], "status": standard.get("status", ""), "url": standard.get("purchase_url", "")})
    citations.extend(scheme_result.get("citations", []))
    citations.extend({"kind": "lab", "ref": lab["name"], "url": lab.get("source_url", ""), "is_number": lab.get("is_number", "")} for lab in labs)

    return {
        "status": "verified", "product": selected.get("product_desc") or product,
        "selected_candidate": selected, "matched_standard": selected.get("is_number"),
        "standard": standard, "scheme": scheme_result.get("scheme"), "labs": labs,
        "citations": citations,
        "applicability": {"mandatory": True, "effective_on": selected.get("effective_on"), "confidence": selected.get("confidence", 1.0)},
        "limitations": ["Verify amendments, exemptions, and current enforcement notices from the linked official source before filing."]
    }


def graph(highlight: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Returns graph data for Knowledge Graph visualization.
    Uses graph_queries.subgraph_json when available; falls back to standards list.
    """
    try:
        try:
            from api import graph_queries as gq
        except ImportError:
            import graph_queries as gq  # type: ignore
        center = f"std:{highlight[0]}" if highlight else None
        data = gq.subgraph_json(center_node=center, hops=2)
        data["highlight_nodes"] = highlight or []
        return data
    except (ImportError, FileNotFoundError, AttributeError):
        pass

    # Fallback: flat standards list
    if not store:
        return {"nodes": [], "links": [], "highlight_nodes": highlight or []}

    standards = store.get_all_standards(limit=300)
    nodes = []
    seen = set()
    for s in standards:
        is_num = s["is_number"]
        seen.add(is_num)
        group = s.get("ics_code", "").split(".")[0] if s.get("ics_code") else "General"
        nodes.append({"id": is_num, "group": group, "label": s.get("title", is_num)})

    if highlight:
        for h in highlight:
            if h and h not in seen:
                nodes.append({"id": h, "group": "highlight", "label": h})

    return {"nodes": nodes, "links": [], "highlight_nodes": highlight or []}


def _call_gemini_llm(prompt: str, api_key: str) -> Optional[str]:
    """Calls Google Gemini API for grounded generation."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 800}
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        logger.warning(f"Gemini LLM Call failed: {e}")
    return None


def _stream_gemini_llm(prompt: str, api_key: str):
    """Streams tokens from Google Gemini API."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 800}
        }
        with httpx.Client(timeout=25.0) as client:
            with client.stream("POST", url, json=payload) as resp:
                if resp.status_code == 200:
                    for line in resp.iter_lines():
                        if line.startswith("data: "):
                            try:
                                data = json.loads(line[6:])
                                text = data["candidates"][0]["content"]["parts"][0].get("text", "")
                                if text:
                                    yield text
                            except Exception:
                                continue
    except Exception as e:
        logger.warning(f"Gemini streaming failed: {e}")


def _call_groq_llm(prompt: str, api_key: str) -> Optional[str]:
    """Calls Groq API with robust model fallback."""
    models = [
        os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b"),
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile"
    ]
    seen = set()
    models = [m for m in models if m and not (m in seen or seen.add(m))]

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    for model in models:
        try:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 800
            }
            with httpx.Client(timeout=12.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    msg = data["choices"][0]["message"]
                    return (msg.get("content") or "").strip()
        except Exception as e:
            logger.warning(f"Groq LLM model {model} failed: {e}")
    return None


def _stream_groq_llm(prompt: str, api_key: str):
    """Streams tokens from Groq API."""
    models = [
        os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b"),
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile"
    ]
    seen = set()
    models = [m for m in models if m and not (m in seen or seen.add(m))]

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    for model in models:
        try:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 800,
                "stream": True
            }
            with httpx.Client(timeout=25.0) as client:
                with client.stream("POST", url, headers=headers, json=payload) as resp:
                    if resp.status_code != 200:
                        continue
                    has_yielded = False
                    for line in resp.iter_lines():
                        if line.startswith("data: ") and line.strip() != "data: [DONE]":
                            try:
                                chunk = json.loads(line[6:])
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content") or ""
                                if content:
                                    has_yielded = True
                                    yield content
                            except Exception:
                                continue
                    if has_yielded:
                        return
        except Exception as e:
            logger.warning(f"Groq streaming model {model} failed: {e}")


def _call_azure_llm(prompt: str, api_key: str) -> Optional[str]:
    """Calls Azure OpenAI GPT-4o-mini."""
    try:
        endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
        deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
        api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
        url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"

        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers={"api-key": api_key}, json={
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 800,
                "temperature": 0.1
            })
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"Azure OpenAI Call failed: {e}")
    return None


def _call_ollama_llm(prompt: str, host: str = "http://localhost:11434") -> Optional[str]:
    """Calls Local Ollama (e.g. Qwen2.5 or Llama3)."""
    try:
        url = f"{host.rstrip('/')}/api/generate"
        payload = {"model": "qwen2.5:3b", "prompt": prompt, "stream": False}
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                return resp.json().get("response", "").strip()
    except Exception as e:
        logger.debug(f"Ollama local not active: {e}")
    return None


def _build_prompt(facts: Dict[str, Any], question: str, lang: str = "en") -> str:
    """Builds the grounded system prompt."""
    web_hits = facts.get("web_hits", [])
    web_context = ""
    if web_hits:
        lines = []
        for h in web_hits[:4]:
            title = h.get("title", "")
            snippet = h.get("snippet", "")
            url = h.get("url", "")
            date = h.get("published_date", "")
            lines.append(f"- Title: {title} ({date})\n  Snippet: {snippet}\n  URL: {url}")
        web_context = "\n\n### Official Live Web & Gazette Findings:\n" + "\n".join(lines)

    lang_instr = ""
    if lang == "hi":
        lang_instr = (
            "\n5. LANGUAGE REQUIREMENT: You MUST write your entire answer in fluent Hindi (Devanagari script / हिंदी भाषा). "
            "Use authentic Hindi technical terms while keeping IS numbers (e.g. IS 16102) in English letters.\n"
        )

    return (
        f"You are Manak Mitra, the official AI Compliance Assistant for the Bureau of Indian Standards (BIS).\n\n"
        f"USER QUESTION: {question}\n\n"
        f"### VERIFIED DATABASE FACTS:\n{facts}\n"
        f"{web_context}\n\n"
        f"INSTRUCTIONS FOR YOUR RESPONSE:\n"
        f"1. Provide a detailed, clear, and well-structured response directly answering the user's question.\n"
        f"2. Clearly cover all relevant aspects found in the facts:\n"
        f"   - **Mandatory Status & Regulation**: State clearly whether certification is mandatory, referencing the specific Quality Control Order (QCO) title or ministry order if available.\n"
        f"   - **Applicable Indian Standard(s)**: Mention the exact IS number(s) (e.g., IS 16102 (Part 1)) and product title from the facts.\n"
        f"   - **Certification Scheme**: Detail the applicable BIS scheme (e.g., Compulsory Registration Scheme (CRS), ISI Mark Scheme I, FMCS, Hallmarking) and the compliance pathway.\n"
        f"   - **Recent Notifications & Sources**: Integrate relevant facts from the live web/gazette findings with official references.\n"
        f"3. STRICT GROUNDING: Never hallucinate or invent standard numbers, dates, or requirements not present in the verified facts or web sources.\n"
        f"4. FORMATTING RULES:\n"
        f"   - Do NOT use markdown hash symbols (#, ##, ###) for headers.\n"
        f"   - Use bold titles (e.g., **1. Mandatory Status:**) and clean bullet points or numbered lists.\n"
        f"   - Keep URLs clean and readable.{lang_instr}"
    )


def _deterministic_fallback(facts: Dict[str, Any]) -> str:
    citations = facts.get("citations", [])
    standards = [c["ref"] for c in citations if c.get("kind") == "standard"]
    qcos = [c for c in citations if c.get("kind") == "qco"]
    schemes_list = [c for c in citations if c.get("kind") == "scheme"]
    labs_list = [c for c in citations if c.get("kind") == "lab"]

    if facts.get("mandatory") and qcos:
        q = qcos[0]
        sch = facts.get("scheme", "BIS Scheme")
        is_ref = facts.get("is_number") or (standards[0] if standards else "")
        is_phrase = f" under standard {is_ref}" if is_ref else ""
        return (
            f"Under the official Quality Control Order ({q.get('title', 'QCO Order')}), this product is under "
            f"mandatory certification under {sch}{is_phrase}."
        )

    if schemes_list:
        sch_obj = schemes_list[0]
        sch_name = sch_obj.get("ref", "BIS Scheme")
        fees = sch_obj.get("fees", "")
        fee_str = f" with an application fee of {fees}" if fees else ""
        return f"The applicable certification procedure is the {sch_name}{fee_str}. You can apply online via the official BIS portal."

    if labs_list:
        lab_names = ", ".join([l["ref"] for l in labs_list[:2]])
        return f"Testing can be conducted at BIS-recognized facilities including {lab_names}. Please check BIS LIMS for test sample submission."

    if standards:
        std_list = ", ".join(standards[:2])
        return f"Based on official BIS publications, the applicable Indian Standard is {std_list}. Please verify the latest amendments on standardsbis.in."

    return "Based on official BIS records, please verify with the official BIS portal or contact the helpline on 1800-11-4000."


def phrase(facts: Dict[str, Any], question: str, lang: str = "en") -> str:
    """
    Turns retrieved facts and live web search snippets into a comprehensive,
    detailed, and strictly grounded answer via LLM.
    Strictly forbids hallucinations while providing structured, complete context.
    """
    p = _build_prompt(facts, question, lang=lang)

    # 1. Google Gemini
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        res = _call_gemini_llm(p, gemini_key)
        if res: return res

    # 2. Groq
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        res = _call_groq_llm(p, groq_key)
        if res: return res

    # 3. Azure OpenAI
    azure_key = os.environ.get("AZURE_OPENAI_API_KEY")
    if azure_key:
        res = _call_azure_llm(p, azure_key)
        if res: return res

    # 4. Ollama
    ollama_host = os.environ.get("OLLAMA_HOST")
    if ollama_host:
        res = _call_ollama_llm(p, ollama_host)
        if res: return res

    # 5. Deterministic High-Quality Fallback
    return _deterministic_fallback(facts)


def phrase_stream(facts: Dict[str, Any], question: str, lang: str = "en"):
    """
    Yields chunks of text in real-time for streaming clients.
    """
    import time
    p = _build_prompt(facts, question, lang=lang)

    # 1. Groq (Fastest & highly reliable)
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        has_tokens = False
        for chunk in _stream_groq_llm(p, groq_key):
            has_tokens = True
            yield chunk
        if has_tokens:
            return

    # 2. Google Gemini
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        has_tokens = False
        for chunk in _stream_gemini_llm(p, gemini_key):
            has_tokens = True
            yield chunk
        if has_tokens:
            return

    # Fallback to phrase() and stream words
    fallback_text = phrase(facts, question, lang=lang)
    words = fallback_text.split(" ")
    for i, w in enumerate(words):
        chunk = w if i == len(words) - 1 else w + " "
        yield chunk
        time.sleep(0.015)


if __name__ == "__main__":
    if store: store.init()
    print("Testing api/answers.py...")
    
    # Test 1: recommend
    rec = recommend("LED bulb")
    print(f"Recommend LED bulb -> Top Score: {rec['_top_score']:.3f}, Citations: {len(rec['citations'])}")
    assert len(rec["citations"]) > 0

    # Test 2: mandate
    man = mandate("cement")
    print(f"Mandate Cement -> Mandatory: {man['mandatory']}, Citations: {len(man['citations'])}")
    assert man["mandatory"] == True

    # Test 3: scheme
    sch = scheme("tell me about FMCS certification")
    print(f"Scheme FMCS -> Code: {sch['scheme_code']}, Name: {sch['scheme'].get('name')}")
    assert sch["scheme_code"] == "FMCS"

    # Test 4: labs
    lab_res = labs(city="Delhi", is_number="IS 16102")
    print(f"Labs for IS 16102 in Delhi -> Count: {len(lab_res['labs'])}")
    assert len(lab_res["labs"]) > 0

    print("api/answers.py self-test passed successfully!")
