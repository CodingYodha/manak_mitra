#!/usr/bin/env python3
"""
Manak Mitra — Standards Vector Index Builder
Owner: Shivaprasad

Reads data/curated/standards.csv and encodes every title with the
paraphrase-multilingual-MiniLM-L12-v2 model (Devanagari-native, 384-dim).

Writes:
  vectors.npy          — shape (N, 384), float32, L2-normalised
  vectors_meta.json    — list[dict], same order as vectors, one entry per standard

Run once. Re-run whenever standards.csv changes significantly.
Commit BOTH output files — search.py loads them at import time.

Usage:
    python api/embed_job.py
    python api/embed_job.py --csv data/curated/standards_seed.csv   # use seed while waiting for Shinde
"""
import argparse, csv, json, pathlib, sys, time

# ── Constants ──────────────────────────────────────────────────────────────
MODEL_NAME    = "paraphrase-multilingual-MiniLM-L12-v2"
STANDARDS_CSV = pathlib.Path("data/curated/standards.csv")
SEED_CSV      = pathlib.Path("data/curated/standards_seed.csv")
VECTORS_NPY   = pathlib.Path("vectors.npy")
VECTORS_META  = pathlib.Path("vectors_meta.json")
BATCH_SIZE    = 64


# ── CSV loading ────────────────────────────────────────────────────────────
def load_standards(path: pathlib.Path) -> list[dict]:
    """Load standards.csv into a list of clean dicts."""
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        for i, row in enumerate(csv.DictReader(f), 2):
            is_num = row.get("is_number", "").strip()
            title  = row.get("title", "").strip()
            if not is_num or not title:
                print(f"  SKIP row {i}: missing is_number or title", file=sys.stderr)
                continue
            rows.append({
                "is_number":    is_num,
                "title":        title,
                "ics_code":     row.get("ics_code", "").strip(),
                "status":       row.get("status", "ACTIVE").strip() or "ACTIVE",
                "year":         row.get("year", "").strip(),
                "is_free":      row.get("is_free", "false").strip().lower() in ("1", "true", "yes"),
                "purchase_url": row.get("purchase_url", "").strip(),
            })
    return rows


# ── Main ───────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Build vector index for Manak Mitra")
    parser.add_argument("--csv", type=pathlib.Path, default=None,
                        help="Path to standards CSV (defaults to data/curated/standards.csv, "
                             "falls back to standards_seed.csv)")
    args = parser.parse_args()

    # Resolve CSV path
    if args.csv:
        csv_path = args.csv
    elif STANDARDS_CSV.exists():
        csv_path = STANDARDS_CSV
    elif SEED_CSV.exists():
        print(f"NOTE: standards.csv not found, using seed: {SEED_CSV}", file=sys.stderr)
        csv_path = SEED_CSV
    else:
        print("ERROR: No standards CSV found. Run:", file=sys.stderr)
        print("  python api/embed_job.py --csv <path>", file=sys.stderr)
        sys.exit(1)

    print(f"Loading standards from: {csv_path}")
    rows = load_standards(csv_path)
    if not rows:
        print("ERROR: No valid rows found in CSV", file=sys.stderr)
        sys.exit(1)
    print(f"  {len(rows)} standards loaded")

    if len(rows) < 20:
        print(f"WARNING: Only {len(rows)} rows — embed will work but retrieval quality will be low")

    # Lazy import so the file is importable even without ML deps for testing
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np
    except ImportError as e:
        print(f"ERROR: Missing dependency — {e}", file=sys.stderr)
        print("Run: pip install sentence-transformers numpy", file=sys.stderr)
        sys.exit(1)

    print(f"Loading model: {MODEL_NAME}")
    print("  (First run downloads ~500 MB — subsequent runs use cache)")
    t0 = time.time()
    model = SentenceTransformer(MODEL_NAME)
    print(f"  Model loaded in {time.time()-t0:.1f}s")

    # Encode: title is the primary search surface.
    # We use title only (not ICS code) so that semantic queries match naturally.
    texts = [r["title"] for r in rows]
    print(f"Encoding {len(texts)} titles (batch_size={BATCH_SIZE})…")
    t0 = time.time()
    vecs = model.encode(
        texts,
        normalize_embeddings=True,   # REQUIRED: enables cosine via simple dot product
        show_progress_bar=True,
        batch_size=BATCH_SIZE,
        convert_to_numpy=True,
    )
    print(f"  Encoded in {time.time()-t0:.1f}s — shape: {vecs.shape}")

    # Sanity checks
    assert vecs.shape[0] == len(rows), "Vector/meta count mismatch"
    assert vecs.shape[1] == 384, f"Unexpected embedding dim: {vecs.shape[1]} (expected 384)"
    
    # Verify normalisation (dot product of any vec with itself should be ~1.0)
    import numpy as np
    norms = np.linalg.norm(vecs, axis=1)
    assert abs(norms.mean() - 1.0) < 0.01, "Vectors not normalised — check normalize_embeddings=True"

    # Write outputs
    np.save(VECTORS_NPY, vecs)
    with open(VECTORS_META, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    print(f"\nOutputs written:")
    print(f"  {VECTORS_NPY}   — {VECTORS_NPY.stat().st_size // 1024} KB")
    print(f"  {VECTORS_META}  — {VECTORS_META.stat().st_size // 1024} KB")
    print(f"\nCHECKPOINT: run this to verify:")
    print(f"  python -c \"import numpy as np; v=np.load('vectors.npy'); print(v.shape)\"")
    print(f"  Expected: ({len(rows)}, 384)")
    print(f"\nCommit both files to git:")
    print(f"  git add vectors.npy vectors_meta.json && git commit -m 'chore: update vector index ({len(rows)} standards)'")


if __name__ == "__main__":
    main()
