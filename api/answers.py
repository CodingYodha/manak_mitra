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

# ── Shivaprasad: recommend() ───────────────────────────────────────────────
# search.py is in the same api/ package; adjust path for both direct and uvicorn runs
_ROOT = pathlib.Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT / "api"))

try:
    import search
except ImportError:
    search = None  # type: ignore[assignment]


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
    # TODO: Rudra implements this
    # import store
    # rows = store.mandate_for(term)
    # ...
    raise NotImplementedError("mandate() is implemented by Rudra in api/answers.py")


# ── Rudra: scheme() ───────────────────────────────────────────────────────
def scheme(name: str) -> dict | None:
    """
    Deterministic walk of Jay's schemes.yaml decision tree.
    Owner: Rudra. Do not edit this function.
    """
    raise NotImplementedError("scheme() is implemented by Rudra in api/answers.py")


# ── Rudra: labs() ─────────────────────────────────────────────────────────
def labs(city: str | None = None, category: str | None = None) -> dict:
    """
    Lab lookup: nearest recognised BIS lab filtered by category.
    Owner: Rudra. Do not edit this function.
    """
    raise NotImplementedError("labs() is implemented by Rudra in api/answers.py")


# ── Rudra: passport() ────────────────────────────────────────────────────
def passport(product: str) -> dict:
    """
    Compliance Passport: composes mandate() + recommend() + labs() + scheme().
    Owner: Rudra. Build this LAST once the other four work.
    """
    raise NotImplementedError("passport() is implemented by Rudra in api/answers.py")


# ── Rudra: graph() ───────────────────────────────────────────────────────
def graph(highlight: list[str] | None = None) -> dict:
    """
    Returns graph.json data plus highlight_nodes for the current answer.
    Owner: Rudra.
    """
    raise NotImplementedError("graph() is implemented by Rudra in api/answers.py")


# ── Rudra: phrase() ──────────────────────────────────────────────────────
def phrase(facts: dict, question: str) -> str:
    """
    Turns retrieved facts into a 1-2 sentence answer via Ollama/Qwen.
    It adds NO new facts — only rephrases what retrieval returned.
    Owner: Rudra.
    """
    raise NotImplementedError("phrase() is implemented by Rudra in api/answers.py")


# ── Quick self-test for recommend() ──────────────────────────────────────
if __name__ == "__main__":
    print("Testing recommend()…")
    r = recommend("LED bulb")
    print(f"  _top_score: {r['_top_score']:.3f}")
    print(f"  citations:  {r['citations'][:2]}")
    if r["citations"]:
        print("  ✅ recommend() OK")
    else:
        print("  ⚠ No citations returned — run embed_job.py first")
