from typing import Optional
"""
Manak Mitra — Answer Functions
Ownership split:
  recommend()          ← Shivaprasad
  mandate()            ← Rudra
  scheme()             ← Rudra (walks Jay's schemes.yaml)
  labs()               ← Rudra (queries Jay's lab data)
  passport()           ← Rudra (composes the others)
  graph()              ← Rudra
  phrase()             ← Rudra (Ollama/Qwen phrasing)

All functions return a dict compatible with the /chat response contract.
The _top_score key is internal — guard.py reads it, the API response omits it.
"""
import pathlib
import sys
import os
import httpx
import yaml

# ── Shivaprasad: recommend() ───────────────────────────────────────────────
# search.py is in the same api/ package; adjust path for both direct and uvicorn runs
_ROOT = pathlib.Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT / "api"))

try:
    import search
    import store
except ImportError:
    search = None  # type: ignore[assignment]
    store = None


def recommend(description: str) -> dict:
    """
    Standard recommendation / semantic search.

    Given a natural-language product description (any language),
    returns the top matching IS standards with citations.

    Returns
    -------
    dict with keys:
        hits        list[dict]  — full search results from search.find()
        citations   list[dict]  — citation objects for the API response
        _top_score  float       — best cosine score; guard.py uses this for abstention

    Abstention:
        If _top_score < guard.FLOOR (0.35), main.py will refuse to answer.
        This function always returns a dict — the abstention decision lives in guard.py.
    """
    if search is None:
        return {"hits": [], "citations": [], "_top_score": 0.0}

    hits = search.find(description, k=5)

    if not hits:
        return {"hits": [], "citations": [], "_top_score": 0.0}

    citations = [
        {
            "kind":         "standard",
            "ref":          h["is_number"],
            "status":       h.get("status", ""),
            "is_free":      h.get("is_free", False),
            "purchase_url": h.get("purchase_url", ""),
        }
        for h in hits
    ]

    return {
        "hits":       hits,
        "citations":  citations,
        "_top_score": hits[0].get("dense_score", hits[0]["score"]),
    }


# ── Rudra: mandate() ──────────────────────────────────────────────────────
def mandate(term: str) -> dict:
    """
    QCO mandate lookup. NO MODEL — pure SQL. Must never be wrong.
    Owner: Rudra. Do not edit this function.
    """
    if not store:
        return {"mandatory": None, "citations": []}
        
    rows = store.mandate_for(term)
    if not rows:
        return {"mandatory": None, "citations": []}
    
    r = rows[0]
    return {
        "mandatory": True, 
        "scheme": r["scheme"], 
        "is_number": r["is_number"],
        "effective_on": r["effective_on"],
        "citations": [{
            "kind": "qco", 
            "ref": r["qco_title"],
            "url": r["gazette_url"], 
            "retrieved_on": r["retrieved_on"]
        }]
    }


# ── Rudra: scheme() ───────────────────────────────────────────────────────
def scheme(name: str) -> Optional[dict]:
    """
    Deterministic walk of Jay's schemes.yaml decision tree.
    Owner: Rudra. Do not edit this function.
    """
    path = _ROOT / "data" / "curated" / "schemes.yaml"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        schemes_data = yaml.safe_load(f)
    if not schemes_data:
        return None
    return schemes_data.get(name.upper())


# ── Rudra: labs() ─────────────────────────────────────────────────────────
def labs(city: Optional[str] = None, category: Optional[str] = None) -> dict:
    """
    Lab lookup: nearest recognised BIS lab filtered by category.
    Owner: Rudra. Do not edit this function.
    """
    if not store:
        return {"labs": []}
    results = store.get_nearest_labs(city or "", category or "", limit=3)
    return {"labs": results}


# ── Rudra: passport() ────────────────────────────────────────────────────
def passport(product: str) -> dict:
    """
    Compliance Passport: composes mandate() + recommend() + labs() + scheme().
    Owner: Rudra. Build this LAST once the other four work.
    """
    m = mandate(product)
    r = recommend(product)
    
    sch = None
    if m.get("scheme"):
        sch = scheme(m["scheme"])
    
    l = labs(category=product)
    
    return {
        "product": product,
        "mandate": m,
        "recommendation": r,
        "scheme": sch,
        "labs": l["labs"]
    }


# ── Rudra: graph() ───────────────────────────────────────────────────────
def graph(highlight: Optional[list[str]] = None) -> dict:
    """
    Returns graph.json data plus highlight_nodes for the current answer.
    Owner: Rudra.
    """
    if not store:
        return {"nodes": [], "links": [], "highlight_nodes": highlight or []}
        
    standards = store.get_all_standards()
    nodes = []
    for s in standards:
        group = s.get("ics_code", "").split(".")[0] if s.get("ics_code") else "0"
        nodes.append({"id": s["is_number"], "group": group, "label": s["title"]})
        
    return {"nodes": nodes, "links": [], "highlight_nodes": highlight or []}


# ── Rudra: phrase() ──────────────────────────────────────────────────────
def phrase(facts: dict, question: str) -> str:
    """
    Turns retrieved facts into a 1-2 sentence answer via Ollama/Qwen.
    It adds NO new facts — only rephrases what retrieval returned.
    Owner: Rudra.
    """
    p = (f"Answer using ONLY these facts: {facts}\n"
         f"Question: {question}\n"
         "Two sentences max. Never state an IS number that is not in the facts.")
    
    azure_key = os.environ.get("AZURE_OPENAI_API_KEY")
    if azure_key:
        endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
        deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
        api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
        url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
        
        try:
            r = httpx.post(url, headers={"api-key": azure_key}, json={
                "messages": [{"role": "user", "content": p}],
                "max_tokens": 150,
                "temperature": 0.0
            }, timeout=10.0)
            if r.status_code == 200:
                return r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"LLM Error: {e}")
            pass
            
    # Deterministic fallback
    is_numbers = [c["ref"] for c in facts.get("citations", [])]
    is_str = ", ".join(is_numbers) if is_numbers else "No standard found"
    return f"Based on official sources, the applicable standard is {is_str}. Please verify with the official BIS portal."


# ── Quick self-test for recommend() ──────────────────────────────────────
if __name__ == "__main__":
    if store: store.init()
    print("Testing recommend()…")
    r = recommend("LED bulb")
    print(f"  _top_score: {r['_top_score']:.3f}")
    print(f"  citations:  {r['citations'][:2]}")
    if r["citations"]:
        print("  ✅ recommend() OK")
    else:
        print("  ⚠ No citations returned — run embed_job.py first")
