#!/usr/bin/env python3
"""
Manak Mitra — Evaluation Scorer
Owner: Shreya (script) + Shivaprasad (retrieval logic input)

Reads eval/golden40.jsonl and evaluates the live system.
Can run in two modes:
  --mode search  : calls search.find() directly (retrieval-only, no API needed)
  --mode api     : calls POST localhost:8000/chat (full pipeline, needs uvicorn running)

Usage:
    python eval/score.py --mode search          # fast, no server needed
    python eval/score.py --mode api             # full end-to-end
    python eval/score.py --mode search --verbose
    python eval/score.py --output eval/results.txt

Metrics reported:
    accuracy@1        — correct IS number appears as citations[0]["ref"]
    accuracy@3        — correct IS number appears in citations[0..2]
    citation_correct  — non-abstained answers have non-empty citations[]
    abstention_prec   — abstention cases correctly refused (abstained: true)
"""
import argparse
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Paths
_ROOT    = pathlib.Path(__file__).parent.parent
_GOLDEN  = _ROOT / "eval" / "golden40.jsonl"
_API_URL = "http://localhost:8000"


def load_golden(path: pathlib.Path) -> list[dict]:
    cases = []
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                cases.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"WARNING: line {i} is not valid JSON: {e}", file=sys.stderr)
    return cases


def evaluate_search(cases: list[dict], verbose: bool = False) -> dict:
    """Evaluate using search.find() directly — no API needed."""
    sys.path.insert(0, str(_ROOT / "api"))
    try:
        import search as search_mod
    except ImportError:
        print("ERROR: cannot import search module. Run from manak-mitra/ root.", file=sys.stderr)
        sys.exit(1)

    if not search_mod.index_loaded():
        print("ERROR: Vector index not loaded. Run: python api/embed_job.py", file=sys.stderr)
        sys.exit(1)

    results = []
    for case in cases:
        q             = case["q"]
        expect_is     = case.get("expect_is")
        expect_abstain = case.get("expect_abstain", False)
        ics_prefix    = case.get("ics_prefix")

        # Get top-5 hits from search
        hits = search_mod.find(q, k=5, ics_prefix=ics_prefix)
        top_dense = hits[0].get("dense_score", hits[0]["score"]) if hits else 0.0

        # Simulate abstention using dense semantic score vs floor
        abstained = top_dense < search_mod.ABSTENTION_FLOOR
        hit_is    = [h["is_number"] for h in hits]

        # Helper to check if any expected IS matches a hit
        def matches_expected(hit_str, target):
            if isinstance(target, list):
                return any(matches_expected(hit_str, t) for t in target)
            target = str(target).strip()
            return hit_str == target or hit_str.startswith(target)

        at1 = bool(not expect_abstain and expect_is and len(hit_is) > 0 and matches_expected(hit_is[0], expect_is))
        at3 = bool(not expect_abstain and expect_is and any(matches_expected(h, expect_is) for h in hit_is[:3]))

        result = {
            "q":              q,
            "expect_is":      expect_is,
            "expect_abstain": expect_abstain,
            "abstained":      abstained,
            "top_score":      top_dense,
            "hit_is":         hit_is,
            "citations":      [{"ref": h["is_number"]} for h in hits] if not abstained else [],
            "at1":            at1,
            "at3":            at3,
            "cite_ok":        (not abstained and len(hit_is) > 0) or expect_abstain,
            "abstain_ok":     (expect_abstain == abstained),
        }
        results.append(result)

        if verbose:
            status = "✅" if (result["at3"] or (expect_abstain and result["abstain_ok"])) else "❌"
            print(f"  {status} [{result['top_score']:.3f}] {q[:55]:55s}")
            if expect_is:
                exp_str = ", ".join(expect_is) if isinstance(expect_is, list) else str(expect_is)
                print(f"        expect: {exp_str[:30]:30s}  got: {hit_is[:3]}")
            if expect_abstain:
                print(f"        expect_abstain={expect_abstain}  abstained={abstained}")

    return _compute_metrics(results)


def evaluate_api(cases: list[dict], verbose: bool = False) -> dict:
    """Evaluate by calling the live /chat API."""
    results = []
    for case in cases:
        q              = case["q"]
        expect_is      = case.get("expect_is")
        expect_abstain = case.get("expect_abstain", False)

        url = f"{_API_URL}/chat?q={urllib.parse.quote(q)}&lang=en&channel=eval"
        try:
            req  = urllib.request.Request(url, method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
        except Exception as e:
            print(f"  ERROR calling API for '{q[:40]}': {e}", file=sys.stderr)
            results.append({
                "q": q, "expect_is": expect_is, "expect_abstain": expect_abstain,
                "at1": False, "at3": False, "cite_ok": False, "abstain_ok": False,
                "abstained": None, "top_score": None, "hit_is": [], "citations": [],
            })
            continue

        abstained = data.get("abstained", False)
        citations = data.get("citations", [])
        hit_is    = [c["ref"] for c in citations]

        def matches_expected(hit_str, target):
            if isinstance(target, list):
                return any(matches_expected(hit_str, t) for t in target)
            target = str(target).strip()
            return hit_str == target or hit_str.startswith(target)

        at1 = bool(not expect_abstain and expect_is and len(hit_is) > 0 and matches_expected(hit_is[0], expect_is))
        at3 = bool(not expect_abstain and expect_is and any(matches_expected(h, expect_is) for h in hit_is[:3]))

        result = {
            "q":              q,
            "expect_is":      expect_is,
            "expect_abstain": expect_abstain,
            "abstained":      abstained,
            "top_score":      None,
            "hit_is":         hit_is,
            "citations":      citations,
            "at1":            at1,
            "at3":            at3,
            "cite_ok":        (not abstained and bool(citations)) or expect_abstain,
            "abstain_ok":     (expect_abstain == abstained),
        }
        results.append(result)

        if verbose:
            status = "✅" if (result["at3"] or (expect_abstain and result["abstain_ok"])) else "❌"
            print(f"  {status} {q[:55]:55s}")

    return _compute_metrics(results)


def _compute_metrics(results: list[dict]) -> dict:
    total     = len(results)
    is_cases  = [r for r in results if r["expect_is"]]
    abs_cases = [r for r in results if r["expect_abstain"]]
    non_abs   = [r for r in results if not r["expect_abstain"]]

    at1   = sum(r["at1"] for r in is_cases) / max(len(is_cases), 1)
    at3   = sum(r["at3"] for r in is_cases) / max(len(is_cases), 1)
    cite  = sum(r["cite_ok"] for r in non_abs) / max(len(non_abs), 1)
    abst  = sum(r["abstain_ok"] for r in abs_cases) / max(len(abs_cases), 1)

    failures = [r for r in is_cases if not r["at3"]]
    abs_failures = [r for r in abs_cases if not r["abstain_ok"]]

    return {
        "total":             total,
        "is_cases":          len(is_cases),
        "abstain_cases":     len(abs_cases),
        "accuracy_at_1":     at1,
        "accuracy_at_3":     at3,
        "citation_correct":  cite,
        "abstention_prec":   abst,
        "failures":          failures,
        "abstain_failures":  abs_failures,
        "raw":               results,
    }


def print_report(metrics: dict, output_path: pathlib.Path | None = None):
    lines = []
    lines.append("")
    lines.append("=" * 60)
    lines.append("  MANAK MITRA — EVALUATION RESULTS")
    lines.append(f"  {time.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 60)
    lines.append(f"  Total cases:         {metrics['total']}")
    lines.append(f"  IS-retrieval cases:  {metrics['is_cases']}")
    lines.append(f"  Abstention cases:    {metrics['abstain_cases']}")
    lines.append("")
    lines.append(f"  accuracy@1:        {metrics['accuracy_at_1']:.2f}  (target ≥ 0.60)")
    lines.append(f"  accuracy@3:        {metrics['accuracy_at_3']:.2f}  (target ≥ 0.80)")
    lines.append(f"  citation_correct:  {metrics['citation_correct']:.2f}  (target ≥ 0.90)")
    lines.append(f"  abstention_prec:   {metrics['abstention_prec']:.2f}  (target = 1.00)")
    lines.append("")

    if metrics["failures"]:
        lines.append(f"  RETRIEVAL FAILURES ({len(metrics['failures'])}):")
        for r in metrics["failures"]:
            exp_str = ", ".join(r['expect_is']) if isinstance(r['expect_is'], list) else str(r['expect_is'])
            lines.append(f"    ✗ expect={exp_str[:30]:30s} got={r['hit_is'][:3]}")
            lines.append(f"      q: {r['q'][:70]}")
    else:
        lines.append("  No retrieval failures ✅")

    if metrics["abstain_failures"]:
        lines.append(f"\n  ABSTENTION FAILURES ({len(metrics['abstain_failures'])}):")
        for r in metrics["abstain_failures"]:
            lines.append(f"    ✗ expected_abstain={r['expect_abstain']} actual={r['abstained']}")
            lines.append(f"      q: {r['q'][:70]}")
    else:
        lines.append("  No abstention failures ✅")

    lines.append("=" * 60)
    lines.append("")

    report = "\n".join(lines)
    print(report)

    if output_path:
        output_path.write_text(report, encoding="utf-8")
        print(f"Report saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Manak Mitra evaluation scorer")
    parser.add_argument("--mode", choices=["search", "api"], default="search",
                        help="'search' = call search.find() directly (no server needed), "
                             "'api' = call live /chat endpoint")
    parser.add_argument("--golden", type=pathlib.Path, default=_GOLDEN,
                        help="Path to golden JSONL file")
    parser.add_argument("--output", type=pathlib.Path, default=None,
                        help="Save report to this file (e.g. eval/results.txt)")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Print each case result")
    args = parser.parse_args()

    if not args.golden.exists():
        print(f"ERROR: golden file not found: {args.golden}", file=sys.stderr)
        sys.exit(1)

    cases = load_golden(args.golden)
    print(f"Loaded {len(cases)} evaluation cases from {args.golden}")
    print(f"Mode: {args.mode}")

    if args.verbose:
        print("\nPer-case results:")

    if args.mode == "search":
        metrics = evaluate_search(cases, verbose=args.verbose)
    else:
        metrics = evaluate_api(cases, verbose=args.verbose)

    print_report(metrics, output_path=args.output)

    # Exit code: 0 if targets met, 1 if not
    ok = (
        metrics["accuracy_at_1"]   >= 0.60 and
        metrics["accuracy_at_3"]   >= 0.80 and
        metrics["citation_correct"] >= 0.90 and
        metrics["abstention_prec"] >= 1.00
    )
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
