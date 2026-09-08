"""
Manak Mitra — Standards Retrieval Engine
Owner: Shivaprasad

Cosine-similarity search over the pre-built vector index.
This module is loaded ONCE at FastAPI startup and stays warm for every query.

Public API (Rudra imports this):
    find(query, k=5, ics_prefix=None) -> list[dict]

Each result dict:
    {
        "is_number":    "IS 16102 (Part 1)",
        "title":        "Self-ballasted LED lamps for general lighting — Safety",
        "ics_code":     "29.140.99",
        "status":       "ACTIVE",
        "year":         "2012",
        "is_free":      false,
        "purchase_url": "https://standardsbis.in/...",
        "score":        0.87            <- cosine similarity [0.0, 1.0]
    }

Graceful degradation:
    If vectors.npy does not yet exist (e.g. Shinde hasn't delivered standards.csv),
    find() returns [] and guard.py will abstain. The server still starts.
"""
import json
import pathlib
import sys

import numpy as np
from sentence_transformers import SentenceTransformer

# ── Paths ──────────────────────────────────────────────────────────────────
_ROOT         = pathlib.Path(__file__).parent.parent
_VECTORS_NPY  = _ROOT / "vectors.npy"
_VECTORS_META = _ROOT / "vectors_meta.json"

# IMPORTANT: must match the model used in embed_job.py — never change one without the other
_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

# Abstention floor — same value as guard.py FLOOR. Queries below this score get refused.
ABSTENTION_FLOOR = 0.35


# ── Module-level load (once at import time) ────────────────────────────────
def _load_index():
    """Load model + vectors. Returns (model, vecs, meta) or raises FileNotFoundError."""
    if not _VECTORS_NPY.exists() or not _VECTORS_META.exists():
        raise FileNotFoundError(
            f"Index not found: {_VECTORS_NPY} / {_VECTORS_META}\n"
            "Run: python api/embed_job.py\n"
            "Then commit vectors.npy and vectors_meta.json"
        )

    model = SentenceTransformer(_MODEL_NAME)
    vecs  = np.load(_VECTORS_NPY)
    meta  = json.load(open(_VECTORS_META, encoding="utf-8"))

    if len(meta) != vecs.shape[0]:
        raise ValueError(
            f"vectors.npy has {vecs.shape[0]} rows but vectors_meta.json has {len(meta)} entries. "
            "Re-run: python api/embed_job.py"
        )

    return model, vecs, meta


# Try to load at import time; degrade gracefully if index missing
_MODEL: SentenceTransformer | None = None
_VECS:  np.ndarray | None = None
_META:  list[dict] | None = None
_LOAD_ERROR: str | None = None

try:
    _MODEL, _VECS, _META = _load_index()
    print(f"[search] Loaded {len(_META)} standards, dim={_VECS.shape[1]}", file=sys.stderr)
except FileNotFoundError as e:
    _LOAD_ERROR = str(e)
    print(f"[search] WARNING — index not loaded: {e}", file=sys.stderr)
except Exception as e:
    _LOAD_ERROR = str(e)
    print(f"[search] ERROR loading index: {e}", file=sys.stderr)


# ── Public API ─────────────────────────────────────────────────────────────
def find(query: str, k: int = 5, ics_prefix: str | None = None) -> list[dict]:
    """
    Return up to k standards most semantically similar to query.

    Parameters
    ----------
    query      : Natural language query, any language supported by the model.
    k          : Maximum number of results to return.
    ics_prefix : Optional ICS code prefix to narrow search domain.
                 e.g. "29.140" = lighting equipment, "97.200" = toys, "91.100" = building materials
                 If provided, only standards whose ics_code starts with this prefix are returned.

    Returns
    -------
    list[dict] — results ordered by descending cosine score.
                 Empty list if index not loaded or no results pass the ICS filter.
    """
    if _MODEL is None:
        return []  # graceful degradation — guard.py will abstain

    # Encode the query with the same normalisation as documents
    q_vec  = _MODEL.encode([query], normalize_embeddings=True)[0]   # shape (384,)
    scores = _VECS @ q_vec                                           # cosine sim for all N docs

    results: list[dict] = []
    for idx in np.argsort(-scores):                                  # best score first
        m = _META[idx]
        # Apply optional ICS filter
        if ics_prefix and not (m.get("ics_code") or "").startswith(ics_prefix):
            continue
        results.append({**m, "score": float(scores[idx])})
        if len(results) >= k:
            break

    return results


def index_loaded() -> bool:
    """Returns True if the vector index is available."""
    return _MODEL is not None


def load_error() -> str | None:
    """Returns the error message if index failed to load, else None."""
    return _LOAD_ERROR


def stats() -> dict:
    """Return index statistics for health-check endpoint."""
    if _MODEL is None:
        return {"loaded": False, "error": _LOAD_ERROR}
    return {
        "loaded":    True,
        "standards": len(_META),
        "model":     _MODEL_NAME,
        "dim":       int(_VECS.shape[1]),
    }


# ── Smoke test (run directly) ──────────────────────────────────────────────
if __name__ == "__main__":
    if not index_loaded():
        print("Index not loaded. Run: python api/embed_job.py")
        print("Using seed CSV for a quick test…")
        sys.exit(1)

    def _show(label: str, results: list[dict]):
        print(f"\n{'='*60}")
        print(f"Query: {label}")
        print(f"{'='*60}")
        if not results:
            print("  (no results)")
            return
        for r in results:
            flag = "✓ ABSTAIN" if r["score"] < ABSTENTION_FLOOR else ""
            print(f"  [{r['score']:.3f}] {r['is_number']:30s} {r['title'][:50]}  {flag}")

    # Checkpoint 4: English retrieval — IS 16102 must appear in top-3
    hits = find("LED bulb", k=3)
    _show("LED bulb (English)", hits)
    top3_is = [h["is_number"] for h in hits]
    if "IS 16102 (Part 1)" in top3_is:
        print("  ✅ CHECKPOINT 4 PASSED: IS 16102 (Part 1) in top-3")
    else:
        print("  ❌ CHECKPOINT 4 FAILED: IS 16102 (Part 1) NOT in top-3")
        print(f"     Got: {top3_is}")

    # Checkpoint 5: Hindi retrieval — must not crash, must return something
    hits_hi = find("एलईडी बल्ब", k=3)
    _show("एलईडी बल्ब (Hindi)", hits_hi)
    if hits_hi:
        print("  ✅ CHECKPOINT 5 PASSED: Hindi query returned results")
    else:
        print("  ❌ CHECKPOINT 5 FAILED: Hindi query returned empty — wrong model?")

    # Checkpoint 6: Abstention trap — nonsense query must score < ABSTENTION_FLOOR
    hits_trap = find("airspeed velocity of an unladen swallow", k=1)
    _show("Airspeed of a swallow (trap query)", hits_trap)
    top_score = hits_trap[0]["score"] if hits_trap else 0.0
    if top_score < ABSTENTION_FLOOR:
        print(f"  ✅ CHECKPOINT 6 PASSED: trap score {top_score:.3f} < {ABSTENTION_FLOOR}")
    else:
        print(f"  ❌ CHECKPOINT 6 FAILED: trap score {top_score:.3f} >= {ABSTENTION_FLOOR} — would NOT abstain!")

    # ICS filter demo
    _show("lamp energy efficiency (ICS: 29.140)", find("lamp energy efficiency", k=3, ics_prefix="29.140"))

    # Water heater
    _show("electric water heater", find("electric water heater", k=3))

    # Children toys
    _show("children plastic toys safety", find("children plastic toys safety", k=3))

    print(f"\n{'='*60}")
    print("Index stats:", stats())
