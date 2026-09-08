# Manak Mitra — Master Project Plan
### SIH 2026 · PS 26107 · AI-Powered Intelligent Assistant for BIS Standards

> **How to use this file:** Every team member reads the full "Team Sync" section to stay aligned.
> Then go to your own section for the exact build steps, file contracts, and checkpoints.
> Do not skip the checkpoints — a broken checkpoint at step 8 is an invisible bug at step 15.

---

## Quick Reference — Who Owns What

| Person | Track | Core Files | Hands Off To |
|--------|-------|-----------|-------------|
| **Rudra** | Backend / API / Guards | `api/store.py`, `api/main.py`, `api/guard.py`, `api/answers.py` (phrase fn) | Miya (stable API) |
| **Miya** | Frontend / Routing / WhatsApp / Voice | `web/`, `whatsapp.js`, `api/lang.py` (routing layer) | Team (demo interface) |
| **Shivaprasad** | Standards Retrieval & Evaluation | `api/embed_job.py`, `api/search.py`, `vectors.npy`, `vectors_meta.json`, `eval/score.py` | Rudra (search functions), Shreya (eval cases) |
| **Shinde** | Mandate Data / QCO / HSN | `api/ingest.py`, `data/curated/standards.csv`, `data/raw/qco/`, `data/raw/labs/labs.csv` | Shivaprasad (standards.csv), Rudra (DB populated) |
| **Jay** | Schemes / Labs / Marks / Passport | `data/curated/schemes.yaml`, `data/curated/marks.yaml`, `api/marks.py` | Rudra (scheme/lab/passport fns) |
| **Shreya** | Eval scripts / Data validation / PPT | `eval/score.py`, `eval/golden40.jsonl`, validators | Shivaprasad (eval results) |

---

## Critical Handoff Chain

```
Shinde ──(standards.csv, labs.csv, qco data)──► Shivaprasad & Rudra
Shivaprasad ──(search.py, vectors.npy)──► Rudra (integrated into answers.py)
Jay ──(schemes.yaml, marks.py, passport fn)──► Rudra
Rudra ──(stable /chat endpoint + API contract)──► Miya
Miya ──(Web + WhatsApp + Voice demo)──► Everyone at demo
Rudra ──(AI-generated PPT content)──► Shreya (SIH template)
```

---

## Repository Layout (Frozen — Do Not Rename)

```
manak-mitra/
├── api/
│   ├── store.py          ← Rudra — DB layer, only file that touches manak.db
│   ├── ingest.py         ← Shinde — QCO PDF extraction + CSV loaders
│   ├── embed_job.py      ← Shivaprasad — generate vectors.npy (run once)
│   ├── search.py         ← Shivaprasad — cosine-similarity retrieval function
│   ├── answers.py        ← Shivaprasad (recommend fn) + Rudra (mandate, phrase, labs, passport, graph fns)
│   ├── guard.py          ← Rudra — IS-number enforcer + abstention gate
│   ├── lang.py           ← Miya — Bhashini translate() + fallback
│   ├── marks.py          ← Jay — OCR + mark_rules.yaml validator
│   └── main.py           ← Rudra — FastAPI app, /chat and all endpoints
├── data/
│   ├── raw/
│   │   ├── qco/          ← Shinde — gazette PDFs + sources.txt
│   │   ├── schemes/      ← Shinde — BIS scheme HTML pages
│   │   └── labs/
│   │       └── labs.csv  ← Shinde — name, city, state, categories
│   └── curated/
│       ├── standards.csv ← Shinde (collect) + Shivaprasad (verify IS numbers)
│       ├── schemes.yaml  ← Jay — decision trees, fees, timelines
│       └── marks.yaml    ← Jay — mark grammar rules
├── eval/
│   ├── golden40.jsonl    ← Shreya (compile) + Shivaprasad (retrieval cases)
│   └── score.py          ← Shreya — runs eval, reports 4 metrics
├── web/                  ← Miya — React + Vite scaffold
├── whatsapp.js           ← Miya — Baileys transport
├── manak.db              ← generated (git-committed after seeding)
├── vectors.npy           ← Shivaprasad — generated (git-committed)
├── vectors_meta.json     ← Shivaprasad — generated (git-committed)
└── DEMO.md               ← Everyone reads, nobody edits after Day 1
```

---

## The Demo (Non-Negotiable — Everything Serves This)

**Three products every feature must work for:**
1. `9W LED bulb` → CRS scheme, IS 16102 (Part 1), mandatory
2. `22K gold ring` → Hallmarking / HUID
3. `Children's plastic toy` → ISI scheme, mandatory

**Six demo beats in order:**
1. Knowledge graph on screen before we speak
2. Hindi voice question: "क्या मुझे LED बल्ब के लिए BIS चाहिए?"
3. Generate the Compliance Passport → PDF on screen
4. QR on slide → judge messages from their phone → cited reply
5. Ask something we cannot know → **system refuses** → gives BIS helpline 1800-11-4000
6. Ministry dashboard — "here is what this gives you"

> **Beat 5 is the one teams skip. Build the refusal path first. Rehearse it.**

---

## API Response Contract (Backend → Frontend)

Every channel speaks this exact JSON shape from `/chat`:

```json
{
  "answer": "LED bulbs of 9W are covered by the Electronics & IT Goods…",
  "intent": "mandate",
  "abstained": false,
  "citations": [
    {
      "kind": "qco",
      "ref": "electronics-crs-2021",
      "url": "https://egazette.gov.in/…",
      "retrieved_on": "2026-08-14"
    },
    {
      "kind": "standard",
      "ref": "IS 16102 (Part 1)",
      "status": "ACTIVE",
      "is_free": false,
      "purchase_url": "https://standardsbis.in/…"
    }
  ],
  "highlight_nodes": ["IS 16102 (Part 1)"],
  "passport_url": "/passport/9f2c…"
}
```

**Invariant:** `citations` is NEVER empty unless `abstained` is `true`. Write a test for this.

---

## Database Schema (Agreed — Do Not Change Column Names)

```sql
-- Lane A (Shinde writes, p_mandate reads)
CREATE TABLE IF NOT EXISTS qco (
  qco_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  ministry TEXT,
  gazette_url TEXT NOT NULL,
  notified_on TEXT,
  retrieved_on TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS qco_items (
  id INTEGER PRIMARY KEY,
  qco_id TEXT REFERENCES qco,
  product_desc TEXT NOT NULL,
  hsn_codes TEXT,           -- comma-separated
  is_number TEXT,           -- 'IS 16102 (Part 1)'
  scheme TEXT,              -- ISI | CRS | FMCS | HALLMARK | ECOMARK
  effective_on TEXT,        -- YYYY-MM-DD
  confidence REAL           -- <0.8 needs human review
);
-- Lane B (Shivaprasad verifies, Shinde collects)
CREATE TABLE IF NOT EXISTS standards (
  is_number TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  ics_code TEXT,
  status TEXT,              -- ACTIVE | SUPERSEDED | WITHDRAWN
  year INTEGER,
  is_free INTEGER,          -- 0 or 1
  purchase_url TEXT
);
-- Lane C (Shinde collects)
CREATE TABLE IF NOT EXISTS labs (
  lab_id TEXT PRIMARY KEY,
  name TEXT,
  city TEXT,
  state TEXT,
  lat REAL,
  lon REAL,
  categories TEXT
);
-- Middleware (Rudra writes)
CREATE TABLE IF NOT EXISTS query_log (
  id INTEGER PRIMARY KEY,
  ts TEXT,
  channel TEXT,
  language TEXT,
  intent TEXT,
  matched_is TEXT,
  top_score REAL,
  abstained INTEGER
);
```

---

## Day-by-Day Schedule

| Time | Track A (Shinde) | Track B (Shivaprasad) | Track C (Rudra) | Track D (Miya) | Track E (Jay) |
|------|------------------|-----------------------|-----------------|----------------|---------------|
| **Day 1 AM** | Collect QCO product lists, start gazette PDFs | Wait for standards.csv; read runbook; write seeds | `store.py` schema + seed 10 rows/table; announce | Scaffold React+Vite; build stub UI | Start `schemes.yaml` (ISI + CRS) |
| **Day 1 PM** | Derive `standards.csv` from QCO IS numbers, pad to 300+ | Receive `standards.csv`, run `embed_job.py`, commit `vectors.npy` | `main.py` skeleton; stub all endpoints | Connect UI to `/chat`; citation chips | Continue `schemes.yaml` (FMCS + Hallmarking) |
| **Day 2 AM** | Collect labs.csv; collect scheme HTML pages | `search.py` — test LED bulb + Hindi query checkpoint | `guard.py` + `answers.py` (mandate fn) | Knowledge graph view; Leaflet map | Lab lookup fn; `marks.yaml`; `marks.py` |
| **Day 2 PM** | Run `ingest.py` on gazette PDFs; fix nulls manually | Retrieval part of `answers.py` (recommend fn) | `answers.py` (phrase fn + all others); integrate guard | Journey timeline; WhatsApp | Compliance Passport assembly |
| **Day 3 AM** | Spot-check 30 IS numbers against BIS site | Prepare eval cases; run `score.py`; fix 2 worst failures | `lang.py` Bhashini integration; full `/chat` flow | Browser voice (Hindi STT + TTS) | Mark OCR; finalize passport PDF |
| **Day 3 PM** | Final data freeze | Final eval report (4 metrics) | Final backend integration | Ministry dashboard | Verify all 3 demo products produce passport |
| **Night** | — | — | **FREEZE** — git tag, no commits after | Rehearse 6 beats x3 | Record fallback video |

---

---

# 🔵 SHIVAPRASAD — Standards Retrieval & Evaluation

## Your Ownership

You own the entire retrieval brain of the system:
- `api/embed_job.py` — one-time script that generates the vector index
- `api/search.py` — the function every query passes through
- `vectors.npy` and `vectors_meta.json` — committed artifacts
- The `recommend()` function in `api/answers.py`
- `eval/golden40.jsonl` (retrieval-specific cases, ~15 of the 40)
- Running the final evaluation and reporting 4 metrics

---

## Prerequisites (From Other Teammates)

You are **blocked on `standards.csv` from Shinde**. The moment it lands:
```
data/curated/standards.csv — columns: is_number, title, ics_code, status, year, is_free, purchase_url
```

In the meantime: create `standards_seed.csv` with ~20 hand-entered rows for your own testing.
Use real IS numbers you know: IS 16102, IS 1361, IS 14543, IS 9103, IS 2082, IS 4985, IS 2925, IS 269.

---

## Environment Setup

```bash
# From the manak-mitra/ root, with .venv activated
pip install fastapi "uvicorn[standard]" sentence-transformers numpy \
            pyyaml pypdf pytesseract python-multipart httpx anthropic pydantic

# Verify
python -c "import sentence_transformers, numpy; print('OK')"
```

---

## Step B1 — Verify `standards.csv` (Do This Before Embedding)

**Do NOT embed until you have verified the IS numbers.** An invented IS number on stage is unrecoverable.

```python
# Save as scripts/verify_standards.py
import csv, sys

errors = []
with open("data/curated/standards.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader, 2):  # row 1 is header
        if not row.get("is_number", "").strip():
            errors.append(f"Row {i}: empty is_number")
        if not row.get("title", "").strip():
            errors.append(f"Row {i}: empty title — IS {row.get('is_number')}")
        if row.get("status", "").strip() not in ("ACTIVE", "SUPERSEDED", "WITHDRAWN", ""):
            errors.append(f"Row {i}: invalid status '{row['status']}' — IS {row['is_number']}")

if errors:
    for e in errors: print("ERROR:", e)
    sys.exit(1)
else:
    print("OK — standards.csv looks clean")
```

**Manual check:** Randomly pick 30 IS numbers and verify them on standards.bis.gov.in.
Log any failures in `data/curated/verification_notes.txt`.

**Checkpoint:**
```bash
python scripts/verify_standards.py
python -c "import csv; print(sum(1 for _ in open('data/curated/standards.csv')))"
# Must be >= 300 (including header row)
```

---

## Step B2 — `api/embed_job.py` (Run Once, Commit Output)

```python
# api/embed_job.py
"""
Run once to generate the vector index.
Usage:  python api/embed_job.py
Output: vectors.npy  (shape: N x 384)
        vectors_meta.json  (list of dicts, same order as vectors)
Commit both files after running.
"""
from sentence_transformers import SentenceTransformer
import numpy as np, json, csv, pathlib, sys

MODEL_NAME    = "paraphrase-multilingual-MiniLM-L12-v2"
STANDARDS_CSV = pathlib.Path("data/curated/standards.csv")
VECTORS_NPY   = pathlib.Path("vectors.npy")
VECTORS_META  = pathlib.Path("vectors_meta.json")


def load_standards(path: pathlib.Path) -> list[dict]:
    rows = []
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("is_number", "").strip():
                rows.append({
                    "is_number":    row["is_number"].strip(),
                    "title":        row["title"].strip(),
                    "ics_code":     row.get("ics_code", "").strip(),
                    "status":       row.get("status", "ACTIVE").strip(),
                    "year":         row.get("year", "").strip(),
                    "is_free":      row.get("is_free", "false").strip().lower() in ("1", "true", "yes"),
                    "purchase_url": row.get("purchase_url", "").strip(),
                })
    return rows


def main():
    if not STANDARDS_CSV.exists():
        print(f"ERROR: {STANDARDS_CSV} not found. Get it from Shinde first.", file=sys.stderr)
        sys.exit(1)

    rows = load_standards(STANDARDS_CSV)
    print(f"Loaded {len(rows)} standards from CSV")

    print(f"Loading model: {MODEL_NAME}  (first run downloads ~500 MB)")
    model = SentenceTransformer(MODEL_NAME)

    texts = [r["title"] for r in rows]
    print(f"Encoding {len(texts)} titles…")
    vecs = model.encode(
        texts,
        normalize_embeddings=True,    # IMPORTANT: enables cosine via dot product
        show_progress_bar=True,
        batch_size=64,
    )

    np.save(VECTORS_NPY, vecs)
    json.dump(rows, open(VECTORS_META, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"Done.")
    print(f"  vectors.npy shape:      {vecs.shape}")
    print(f"  vectors_meta.json rows: {len(rows)}")
    print("Commit both files now.")


if __name__ == "__main__":
    main()
```

**Checkpoint:**
```bash
python api/embed_job.py
python -c "import numpy as np; v=np.load('vectors.npy'); print(v.shape)"
# Expected: (N, 384)  where N >= 300
```

---

## Step B3 — `api/search.py` (The Core Retrieval Function)

**Rudra imports this.** Keep the function signature exactly as shown.

```python
# api/search.py
"""
Cosine-similarity retrieval over the standards catalogue.
Loaded once at import time — fast on every query.

Public API (Rudra depends on this exact signature):
    find(query: str, k: int = 5, ics_prefix: str | None = None) -> list[dict]

Each returned dict:
    {
        "is_number":    "IS 16102 (Part 1)",
        "title":        "Self-ballasted LED lamps — Safety",
        "ics_code":     "29.140.99",
        "status":       "ACTIVE",
        "year":         "2012",
        "is_free":      false,
        "purchase_url": "https://…",
        "score":        0.87        ← cosine similarity, 0.0–1.0
    }
"""
from sentence_transformers import SentenceTransformer
import numpy as np, json, pathlib, sys

_MODEL_NAME   = "paraphrase-multilingual-MiniLM-L12-v2"
_VECTORS_NPY  = pathlib.Path("vectors.npy")
_VECTORS_META = pathlib.Path("vectors_meta.json")


def _load():
    if not _VECTORS_NPY.exists() or not _VECTORS_META.exists():
        raise FileNotFoundError(
            "vectors.npy / vectors_meta.json not found. "
            "Run: python api/embed_job.py"
        )
    model = SentenceTransformer(_MODEL_NAME)
    vecs  = np.load(_VECTORS_NPY)
    meta  = json.load(open(_VECTORS_META, encoding="utf-8"))
    assert len(meta) == vecs.shape[0], "Meta/vector count mismatch — re-run embed_job.py"
    return model, vecs, meta


try:
    _MODEL, _VECS, _META = _load()
    print(f"[search] Loaded {len(_META)} standards vectors", file=sys.stderr)
except FileNotFoundError as e:
    print(f"[search] WARNING: {e}", file=sys.stderr)
    _MODEL = _VECS = _META = None   # degrade gracefully until embed_job runs


def find(query: str, k: int = 5, ics_prefix: str | None = None) -> list[dict]:
    """
    Return up to k standards most relevant to query.
    ics_prefix: optional ICS prefix to narrow scope, e.g. '29.140' for lighting.
    Returns [] if the vector index is not yet loaded (graceful degradation).
    """
    if _MODEL is None:
        return []

    q_vec  = _MODEL.encode([query], normalize_embeddings=True)[0]   # shape (384,)
    scores = _VECS @ q_vec                                           # shape (N,) cosine

    results = []
    for idx in np.argsort(-scores):
        m = _META[idx]
        if ics_prefix and not (m.get("ics_code") or "").startswith(ics_prefix):
            continue
        results.append({**m, "score": float(scores[idx])})
        if len(results) >= k:
            break

    return results


# ── Smoke test — run directly to verify ───────────────────────────────────
if __name__ == "__main__":
    print("=== English: LED bulb ===")
    for r in find("LED bulb", k=3):
        print(f"  {r['is_number']:25s}  score={r['score']:.3f}  {r['title'][:60]}")

    print("\n=== Hindi: एलईडी बल्ब ===")
    for r in find("एलईडी बल्ब", k=3):
        print(f"  {r['is_number']:25s}  score={r['score']:.3f}  {r['title'][:60]}")

    print("\n=== ICS filter: 29.140 (lighting) ===")
    for r in find("lamp energy efficiency", k=3, ics_prefix="29.140"):
        print(f"  {r['is_number']:25s}  ics={r['ics_code']:12s}  {r['title'][:50]}")

    print("\n=== Abstention trap: airspeed of swallow ===")
    hits = find("airspeed velocity of an unladen swallow", k=1)
    print(f"  Top score: {hits[0]['score']:.3f if hits else 'no hits'}")
    print(f"  Would abstain (< 0.35): {not hits or hits[0]['score'] < 0.35}")
```

**Checkpoint:**
```bash
python api/search.py
# IS 16102 (Part 1) must appear in top-3 for "LED bulb"
# Hindi query must return results (not crash or empty list)
# Abstention trap score must be < 0.35
```

---

## Step B4 — `recommend()` function in `api/answers.py`

You own only this function. Coordinate with Rudra so you both edit different sections.

```python
# ── Shivaprasad's section in api/answers.py ────────────────────────────────
import search  # your api/search.py


def recommend(description: str) -> dict:
    """
    Standard recommendation / search.
    Returns a dict compatible with the /chat response contract.

    Keys returned:
      hits        — list of search results (each has is_number, title, score, …)
      citations   — list of citation dicts for the API response
      _top_score  — best cosine score; guard.py uses this to decide abstention
    """
    hits = search.find(description, k=5)

    if not hits:
        return {
            "hits": [],
            "citations": [],
            "_top_score": 0.0,
        }

    citations = [
        {
            "kind":         "standard",
            "ref":          h["is_number"],
            "status":       h["status"],
            "is_free":      h["is_free"],
            "purchase_url": h["purchase_url"],
        }
        for h in hits
    ]

    return {
        "hits":       hits,
        "citations":  citations,
        "_top_score": hits[0]["score"],
    }
```

**Checkpoint:**
```bash
python -c "
import sys; sys.path.insert(0, 'api')
import answers
r = answers.recommend('LED bulb')
print('top_score:', r['_top_score'])
print('citations:', r['citations'][:1])
assert r['citations'], 'citations must not be empty'
print('OK')
"
```

---

## Step B5 — Evaluation Cases for `eval/golden40.jsonl`

Contribute ~15 retrieval-focused lines. Send them to Shreya who compiles the full file.

**Format (one JSON object per line, no trailing comma):**
```jsonl
{"q": "Do I need BIS for a 9W LED bulb?", "expect_is": "IS 16102 (Part 1)", "expect_scheme": "CRS"}
{"q": "What standard applies to electric water heaters?", "expect_is": "IS 2082", "expect_intent": "recommend"}
{"q": "IS number for children plastic toys safety", "expect_is": "IS 9873 (Part 1)"}
{"q": "एलईडी बल्ब के लिए कौन सा IS नंबर?", "expect_is": "IS 16102 (Part 1)"}
{"q": "Standard for drinking water pipes PVC", "expect_is": "IS 4985"}
{"q": "Steel safety helmets standard", "expect_is": "IS 2925"}
{"q": "Portland cement Indian standard", "expect_is": "IS 269"}
{"q": "Hallmarking standard for gold jewellery", "expect_is": "IS 1417", "expect_intent": "consumer"}
{"q": "What is the airspeed velocity of an unladen swallow?", "expect_abstain": true}
{"q": "Who is the prime minister of India?", "expect_abstain": true}
{"q": "Household electrical appliances wiring", "expect_is": "IS 694"}
{"q": "BIS standard for LPG cylinders", "expect_is": "IS 3196"}
{"q": "सोने के आभूषण के लिए BIS मानक?", "expect_is": "IS 1417"}
{"q": "LED lamp for energy efficiency standard 9 watt", "expect_is": "IS 16102 (Part 1)", "ics_prefix": "29.140"}
{"q": "Toys safety for children India BIS", "expect_is": "IS 9873 (Part 1)", "expect_scheme": "ISI"}
```

**Rules for writing golden cases:**
- Verify every IS number on standards.bis.gov.in before adding it
- `expect_abstain: true` cases must be genuinely unanswerable from BIS
- Include at least 2 Hindi queries matching their English equivalents
- Include at least 2 `expect_abstain: true` cases

---

## Step B6 — `eval/score.py` spec for Shreya

Share this with Shreya so she knows what `score.py` must produce:

```
Inputs:
  eval/golden40.jsonl   — ground truth
  Running API at localhost:8000   (or call search.find() directly for retrieval-only)

Metrics:
  accuracy@1   — expect_is appears as citations[0]["ref"]
  accuracy@3   — expect_is appears in citations[0..2]
  citation_ok  — answer JSON has non-empty citations[] when not abstained
  abstention_p — cases with expect_abstain:true where abstained==true in response

Output (print to stdout):
  accuracy@1:        0.XX  (N / 40)
  accuracy@3:        0.XX  (N / 40)
  citation_correct:  0.XX  (N / 40)
  abstention_prec:   0.XX  (N / Y abstention cases)
  FAILURES: [list of q where expect_is not matched]
```

---

## Step B7 — Final Evaluation (Day 3)

```bash
# With API running: uvicorn api.main:app --reload  (from manak-mitra/ root)
python eval/score.py
```

**Target numbers:**
| Metric | Target |
|--------|--------|
| accuracy@1 | ≥ 0.60 |
| accuracy@3 | ≥ 0.80 |
| citation_correct | ≥ 0.90 |
| abstention_prec | 1.00 (no false refusals on real BIS queries) |

**If a standard ranks 4–5 instead of 1–3:**
1. Check if there are near-synonym titles in `standards.csv` crowding it out
2. Add the product's common name as a prefix in the title (e.g. "LED bulb — IS 16102…")
3. Coordinate with Shinde to add the missing synonym to the CSV

**Report format to post in group chat:**
```
EVAL RESULTS — 2026-09-09
accuracy@1:        X/40
accuracy@3:        X/40
citation_correct:  X/40
abstention_prec:   X/Y
Worst failures: IS XXXX ranked 4th for "...", IS YYYY not found for "..."
Fix applied: added synonym / fixed ics_code / re-embedded
```

---

## Shivaprasad's Checkpoints (In Order)

| # | Checkpoint | Command | Pass Condition |
|---|-----------|---------|---------------|
| 1 | CSV valid | `python scripts/verify_standards.py` | Exits 0, no ERROR lines |
| 2 | CSV size | `python -c "print(sum(1 for _ in open('data/curated/standards.csv')))"` | ≥ 300 |
| 3 | Vectors shape | `python -c "import numpy as np; print(np.load('vectors.npy').shape)"` | `(N, 384)`, N ≥ 300 |
| 4 | English retrieval | `python api/search.py` | IS 16102 in top-3 for "LED bulb" |
| 5 | Hindi retrieval | `python api/search.py` | Hindi query returns results (not crash) |
| 6 | Abstention trap | `python api/search.py` | Trap score < 0.35 |
| 7 | recommend() fn | see Step B4 checkpoint | Non-empty citations for "LED bulb" |
| 8 | Eval runs | `python eval/score.py` | 4 metrics print, no crash |

> **Message Rudra "search ready" in the group chat when checkpoint 4 passes.**
> He integrates `search.find()` and your `recommend()` into the full `/chat` flow.

---

## What You Do NOT Own (Do Not Touch)

- `api/store.py` — Rudra only
- `api/main.py` — Rudra only
- `api/guard.py` — Rudra only (abstention floor is 0.35 — know it, don't change it)
- `api/ingest.py` — Shinde only
- `api/lang.py` — Miya only
- `data/curated/schemes.yaml` — Jay only
- `data/raw/qco/` — Shinde only

---

## Common Mistakes to Avoid

| Mistake | Prevention |
|---------|-----------|
| Inventing IS numbers in golden40.jsonl | Verify every IS on standards.bis.gov.in before adding |
| Wrong embedding model | Must be `paraphrase-multilingual-MiniLM-L12-v2` — check name exactly |
| Forgetting `normalize_embeddings=True` | Without this, dot product ≠ cosine similarity |
| Not committing `vectors.npy` | Add to git after every re-run; Rudra cannot start the server without it |
| High false-refusal rate | Check what score the golden queries actually get — raise floor only if traps pass < 0.35 |
| Meta/vector count mismatch | Re-run embed_job.py whenever standards.csv changes |

---

---

# 🟢 RUDRA — Backend, API, Guards & Integration

## Key Files
- `api/store.py` — schema + `init()`, `mandate_for()`, `log()`, seed data
- `api/main.py` — FastAPI app + intent router (~40 lines keyword rules)
- `api/guard.py` — `enforce()`, `should_abstain()`, `REFUSAL` string
- `api/answers.py` — `phrase()`, `mandate()`, `labs()`, `passport()`, `graph()`

## Day 1 Blocker — Do This First, Announce When Done
```bash
python -c "from api import store; store.init(); print('DB ready')"
# This unblocks Shivaprasad, Miya, Shinde, Jay immediately
```

## guard.py Sketch
```python
# api/guard.py
import re
IS_PAT = re.compile(r"IS\s*\d{3,5}", re.I)
FLOOR  = 0.35   # tuned against golden set

def enforce(text: str, allowed_refs: list[str]) -> str:
    ok = {r.replace(" ", "").upper() for r in allowed_refs}
    for m in set(IS_PAT.findall(text)):
        if m.replace(" ", "").upper() not in ok:
            text = text.replace(m, "[removed: unverified]")
    return text

def should_abstain(top_score: float) -> bool:
    return top_score < FLOOR

REFUSAL = (
    "I can't answer this from official sources. "
    "Please contact the BIS helpline on 1800-11-4000, or see bis.gov.in."
)
```

---

# 🔴 MIYA — Frontend, Routing, Language & Channels

## Key Files
- `web/` — `npm create vite@latest web -- --template react`
- `whatsapp.js` — Baileys wrapper; thin transport, no logic
- Intent routing — classify into: `mandate | recommend | scheme | consumer | passport | graph`
- `api/lang.py` — `translate(text, src, tgt)` with Bhashini + identity fallback

## Bhashini ULCA Pattern (Two Calls, Always This Order)
```
1. POST /ulca/apis/v0/model/getModelsPipeline  → serviceId for (task, language)
2. POST {inferenceEndpoint} with serviceId     → ASR / MT / TTS result
Cache serviceId at startup — not per request.
```

## Pre-link WhatsApp the Night Before
Baileys session must be pre-scanned. Keep the process alive. A QR re-scan on stage = dead minute.

---

# 🟡 SHINDE — Mandate Data, QCO, HSN & Source Ingestion

## Critical Deliverable — Unblocks Shivaprasad
`data/curated/standards.csv` — get this out on Day 1 PM.

```
is_number,title,ics_code,status,year,is_free,purchase_url
IS 16102 (Part 1),Self-ballasted LED lamps — Safety,29.140.99,ACTIVE,2012,false,https://standardsbis.in/…
```

## sources.txt Required
```
led_qco_2021.pdf | https://egazette.gov.in/… | downloaded 2026-09-09
```

## Verification Step (Non-Optional)
```bash
sqlite3 manak.db "select product_desc, is_number, effective_on from qco_items"
# Look for nulls, wrong century dates, IS numbers not in standards table
```

---

# 🟣 JAY — Schemes, Procedures, Mark Analysis & Compliance Passport

## schemes.yaml Every Fee Block Must Have
```yaml
fees:
  application: "₹1,000"
  source_url: https://crsbis.in/…
  retrieved_on: 2026-09-08
```

## marks.yaml Structure
```yaml
huid:        { length: 6, charset: "[0-9A-Z]" }
purity:      { valid: ["375","585","750","916","958","999"] }
isi_licence: { pattern: "^CM/L-[0-9]{7}$" }
crs_rnumber: { pattern: "^R-[0-9]{8}$" }
```

## Do Not Claim Live HUID Verification
Say: "We read the mark structure and catch structural fakes; for authoritative confirmation, use BIS CARE app."

## Passport Comes Last — It Composes the Others
Build after `mandate()`, `recommend()`, `labs()`, `scheme()` all work.

---

# 🟤 SHREYA — SIH Presentation & Python Support

## eval/score.py Spec
See Shivaprasad's Step B6 above for the exact input/output contract.

## Data Validation Script
Validate all curated files before demo:
- `standards.csv`: no empty `is_number`, valid status values
- `schemes.yaml`: all 4 schemes present, every fees block has `source_url` + `retrieved_on`
- `labs.csv`: ≥ 50 rows, city in coordinate dictionary

---

## Rules (Everyone)

1. No business logic in Web, WhatsApp, or Voice.
2. FastAPI is the only integration boundary.
3. Use seeded data while the real pipeline is in progress.
4. Never invent IS numbers, fees, deadlines, or certification requirements.
5. Abstention path is mandatory. Build it first, test it every day.
6. Every answer retains citations. `citations` is never empty unless `abstained: true`.
7. No live network calls at demo time (except Bhashini if credentials available).
8. Freeze the night before. Git tag. No commits after. Rehearse x3.

---

## Freeze Checklist (Night Before Demo)

- [ ] `manak.db` committed with real data
- [ ] `vectors.npy` and `vectors_meta.json` committed
- [ ] `schemes.yaml` has all 4 schemes with verified fees
- [ ] WhatsApp session pre-linked and process running
- [ ] Ollama model pulled on the **demo laptop** (not only a dev machine)
- [ ] Fallback video recorded of all 6 demo beats
- [ ] 6-beat demo rehearsed end to end × 3, including beat 5 (refusal)
- [ ] Eval results saved to `eval/results.txt`
- [ ] `git tag demo-freeze` — no commits after

## Cut Order If You Fall Behind

1. Ministry dashboard — closer, not the product
2. Browser voice — text Hindi still shows multilingual
3. WhatsApp — painful but survivable
4. Mark OCR — keep typed-code path, drop camera

**Never cut:** data verification hour, abstention path, Compliance Passport, final rehearsal.

---

*Last updated: 2026-09-09 · Read alongside Manak-Mitra-Runbook.pdf and Manak-Mitra-Wiring-Map.pdf*
