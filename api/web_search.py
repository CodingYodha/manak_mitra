"""
Manak Mitra — Exa Web Search Layer
Owner: Rudra

Wraps the Exa neural search API to augment RAG answers with live web results
scoped to authoritative BIS and government domains.

Public API:
    exa_search(query, num_results=3) -> list[dict]

Each result dict:
    {
        "title":          "BIS Notification: QCO for Toys 2024",
        "url":            "https://bis.gov.in/...",
        "snippet":        "The Bureau of Indian Standards hereby notifies...",
        "published_date": "2024-10-15",
        "kind":           "web"
    }

Graceful degradation:
    - If EXA_API_KEY is not set → returns [] silently (RAG-only mode)
    - If Exa API errors → logs warning, returns [] (no crash)

Config (via environment variables):
    EXA_API_KEY      — required to enable web search
    EXA_NUM_RESULTS  — number of results per query (default: 3)
"""
import logging
import os
from typing import List, Dict, Any, Optional

import httpx

logger = logging.getLogger("manak.web_search")

# ── Authoritative BIS-domain allow-list ───────────────────────────────────────
# Exa will be instructed to prioritise these domains.
# Results from outside these domains are still returned if no better match exists.
_BIS_DOMAINS = [
    "bis.gov.in",
    "standardsbis.in",
    "egazette.gov.in",
    "meity.gov.in",
    "dpiit.gov.in",
    "mospi.gov.in",
    "mhfw.gov.in",
    "fssai.gov.in",
    "lims.bis.gov.in",
]

_EXA_SEARCH_URL = "https://api.exa.ai/search"
_EXA_CONTENTS_URL = "https://api.exa.ai/contents"

# ── Timeout (seconds) — keep tight so RAG latency is not degraded ─────────────
_TIMEOUT = 6.0


def _get_api_key() -> Optional[str]:
    """Returns the Exa API key from environment, or None if not configured."""
    return os.environ.get("EXA_API_KEY") or None


def exa_search(query: str, num_results: int = 0) -> List[Dict[str, Any]]:
    """
    Run a neural web search via Exa API, scoped to BIS-authoritative domains.

    Parameters
    ----------
    query       : The user query (English / Hindi / Hinglish).
    num_results : How many results to return. Defaults to EXA_NUM_RESULTS env
                  var, then 3.

    Returns
    -------
    list[dict]  — web results with title, url, snippet, published_date, kind="web"
                  Empty list if key missing or API fails.
    """
    api_key = _get_api_key()
    if not api_key:
        logger.debug("[web_search] EXA_API_KEY not set — skipping web search")
        return []

    # Resolve num_results
    if num_results <= 0:
        num_results = int(os.environ.get("EXA_NUM_RESULTS", "3"))

    # Build a BIS-focused query if not already domain-qualified
    scoped_query = _scope_query(query)

    payload = {
        "query": scoped_query,
        "numResults": num_results,
        "type": "neural",                    # Exa neural (semantic) search
        "useAutoprompt": True,               # Let Exa improve the query
        "includeDomains": _BIS_DOMAINS,      # Restrict to BIS-authoritative sources
        "contents": {
            "text": {
                "maxCharacters": 400,        # Enough for a meaningful snippet
                "includeHtmlTags": False
            }
        }
    }

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.post(_EXA_SEARCH_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.warning("[web_search] Exa API timed out — falling back to RAG-only")
        return []
    except httpx.HTTPStatusError as e:
        logger.warning(f"[web_search] Exa API HTTP error {e.response.status_code}: {e.response.text[:200]}")
        return []
    except Exception as e:
        logger.warning(f"[web_search] Exa API error: {e}")
        return []

    results: List[Dict[str, Any]] = []
    for item in data.get("results", []):
        # Prefer the text contents snippet; fall back to the Exa autoprompt highlight
        snippet = ""
        if item.get("text"):
            snippet = item["text"][:400].strip()
        elif item.get("highlights"):
            snippet = " … ".join(item["highlights"])[:400]

        results.append({
            "title":          item.get("title", ""),
            "url":            item.get("url", ""),
            "snippet":        snippet,
            "published_date": item.get("publishedDate", ""),
            "kind":           "web",
        })

    logger.info(f"[web_search] Exa returned {len(results)} results for: {query[:60]!r}")
    return results


def _scope_query(query: str) -> str:
    """
    Prepend BIS context to the query so Exa's neural search stays on-topic
    even when the user's phrasing is ambiguous.
    """
    q = query.strip()
    # Only prepend if the query doesn't already reference BIS/IS standards explicitly
    lower = q.lower()
    if not any(kw in lower for kw in ["bis", "indian standard", "is ", "qco", "hallmark", "bureau"]):
        q = f"BIS Indian Standard {q}"
    return q


def web_citations(web_hits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert Exa result dicts into the unified Manak Mitra citation format.

    Citation dict:
        {
            "kind":           "web",
            "ref":            "BIS — QCO Toys 2024",
            "url":            "https://bis.gov.in/...",
            "snippet":        "...",
            "published_date": "2024-10-15"
        }
    """
    citations = []
    for hit in web_hits:
        ref = hit.get("title") or hit.get("url", "Web Source")
        citations.append({
            "kind":           "web",
            "ref":            ref[:120],
            "url":            hit.get("url", ""),
            "snippet":        hit.get("snippet", ""),
            "published_date": hit.get("published_date", ""),
        })
    return citations


# ── Smoke test ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    from dotenv import load_dotenv  # optional — only if python-dotenv is installed
    try:
        load_dotenv()
    except ImportError:
        pass

    logging.basicConfig(level=logging.INFO)
    key = _get_api_key()
    if not key:
        print("❌  EXA_API_KEY not set. Add it to .env and retry.")
        sys.exit(1)

    queries = [
        "LED bulb BIS certification QCO",
        "hallmarking gold jewellery HUID",
        "mandatory certification cement steel",
        "CRS scheme electronic products registration",
    ]

    for q in queries:
        print(f"\n{'─'*60}")
        print(f"Query: {q}")
        hits = exa_search(q, num_results=2)
        if not hits:
            print("  (no results)")
        for h in hits:
            print(f"  [{h['published_date'] or 'n/a'}] {h['title'][:60]}")
            print(f"   URL: {h['url']}")
            print(f"   {h['snippet'][:120]}…")

    print("\n✅  web_search.py smoke test complete")
