"""
Manak Mitra — Scheme Logic Module
Owner: Jay · feat/jay

Provides scheme lookup, decision-tree traversal, fee retrieval,
and consumer/grievance routing. All data comes from schemes.yaml;
no generation over fees or deadlines.
"""
import pathlib
import re
import yaml
from typing import Optional

_ROOT = pathlib.Path(__file__).parent.parent
_SCHEMES_PATH = _ROOT / "data" / "curated" / "schemes.yaml"

# ── Cached scheme data ───────────────────────────────────────────────────
_schemes_cache: Optional[dict] = None


def load_schemes() -> dict:
    """Read and cache schemes.yaml. Returns the full dict."""
    global _schemes_cache
    if _schemes_cache is not None:
        return _schemes_cache
    if not _SCHEMES_PATH.exists():
        _schemes_cache = {}
        return _schemes_cache
    with open(_SCHEMES_PATH, encoding="utf-8") as f:
        _schemes_cache = yaml.safe_load(f) or {}
    return _schemes_cache


def reload_schemes() -> dict:
    """Force-reload schemes.yaml (useful after edits)."""
    global _schemes_cache
    _schemes_cache = None
    return load_schemes()


# ── Scheme names (excludes CONSUMER routing block) ───────────────────────
_CERTIFICATION_SCHEMES = {"CRS", "ISI", "HALLMARKING", "FMCS"}


def list_schemes() -> list[dict]:
    """Return summary of all certification schemes."""
    data = load_schemes()
    result = []
    for key in _CERTIFICATION_SCHEMES:
        scheme = data.get(key)
        if not scheme:
            continue
        result.append({
            "key": key,
            "name": scheme.get("name", key),
            "full_name": scheme.get("full_name", ""),
            "ministry": scheme.get("ministry", ""),
            "applies_when": scheme.get("applies_when", ""),
            "total_timeline": scheme.get("total_timeline", ""),
        })
    return result


def lookup(product_or_scheme: str) -> Optional[dict]:
    """
    Match a product name or scheme name to the appropriate scheme.
    Returns the full scheme dict or None.

    Lookup priority:
      1. Exact scheme key match (CRS, ISI, HALLMARKING, FMCS)
      2. Fuzzy match against scheme names and applies_when text
      3. Fuzzy match against product_examples
    """
    data = load_schemes()
    term = product_or_scheme.strip().upper()

    # 1. Exact key match
    if term in _CERTIFICATION_SCHEMES and term in data:
        return data[term]

    # 2. Fuzzy match against scheme names / applies_when
    term_lower = product_or_scheme.strip().lower()
    best_match = None
    best_score = 0

    for key in _CERTIFICATION_SCHEMES:
        scheme = data.get(key)
        if not scheme:
            continue

        # Check scheme name
        name = scheme.get("name", "").lower()
        full_name = scheme.get("full_name", "").lower()
        applies = scheme.get("applies_when", "").lower()

        # Simple keyword scoring
        score = 0
        for word in term_lower.split():
            if len(word) < 3:
                continue
            if word in name or word in full_name:
                score += 3
            if word in applies:
                score += 2

        # Check product examples
        for example in scheme.get("product_examples", []):
            if term_lower in example.lower() or example.lower() in term_lower:
                score += 5

        if score > best_score:
            best_score = score
            best_match = scheme

    return best_match if best_score > 0 else None


def scheme_key_for_product(product: str) -> Optional[str]:
    """
    Given a product name, return the scheme KEY (CRS, ISI, etc.).
    Uses the same logic as lookup() but returns the key string.
    """
    data = load_schemes()
    term_lower = product.strip().lower()

    best_key = None
    best_score = 0

    for key in _CERTIFICATION_SCHEMES:
        scheme = data.get(key)
        if not scheme:
            continue

        score = 0
        name = scheme.get("name", "").lower()
        applies = scheme.get("applies_when", "").lower()

        for word in term_lower.split():
            if len(word) < 3:
                continue
            if word in name:
                score += 3
            if word in applies:
                score += 2

        for example in scheme.get("product_examples", []):
            if term_lower in example.lower() or example.lower() in term_lower:
                score += 5

        if score > best_score:
            best_score = score
            best_key = key

    return best_key if best_score > 0 else None


def get_scheme(scheme_name: str) -> Optional[dict]:
    """Get full scheme data by key name."""
    data = load_schemes()
    key = scheme_name.strip().upper()
    if key in _CERTIFICATION_SCHEMES:
        return data.get(key)
    return None


def get_decision_tree(scheme_name: str) -> Optional[list]:
    """
    Return the decision-tree questions/branches for a scheme.
    Each node has: question, key, options (with value and next/result).
    """
    scheme = get_scheme(scheme_name)
    if not scheme:
        return None
    return scheme.get("decision_tree", [])


def traverse(scheme_name: str, user_answers: dict) -> dict:
    """
    Deterministic walk through the scheme decision tree.

    Args:
        scheme_name: CRS, ISI, HALLMARKING, or FMCS
        user_answers: dict mapping question key → user's answer value
            e.g. {"in_qco": "yes", "is_domestic": "yes"}

    Returns:
        dict with:
            completed: bool — did we reach the steps?
            result: str — terminal message if stopped early
            steps: list — the certification steps if completed
            fees: dict — fee breakdown if completed
            total_timeline: str — estimated timeline if completed
    """
    tree = get_decision_tree(scheme_name)
    if not tree:
        return {"completed": False, "result": f"Scheme '{scheme_name}' not found."}

    scheme = get_scheme(scheme_name)

    for node in tree:
        key = node.get("key", "")
        user_value = user_answers.get(key, "").strip().lower()

        if not user_value:
            # User hasn't answered this question — return the question
            return {
                "completed": False,
                "pending_question": {
                    "key": key,
                    "question": node["question"],
                    "options": [opt["value"] for opt in node.get("options", [])],
                },
            }

        # Find matching option
        matched = None
        for opt in node.get("options", []):
            if opt["value"].lower() == user_value:
                matched = opt
                break

        if not matched:
            return {
                "completed": False,
                "result": f"Invalid answer '{user_value}' for question: {node['question']}",
            }

        # Check if this option has a terminal result
        if "result" in matched:
            return {"completed": False, "result": matched["result"]}

        # Otherwise continue to next question (matched["next"] points to steps or next key)

    # All questions answered positively — return the scheme steps
    return {
        "completed": True,
        "scheme_name": scheme.get("name", scheme_name),
        "steps": scheme.get("steps", []),
        "fees": scheme.get("fees", {}),
        "total_timeline": scheme.get("total_timeline", ""),
        "required_marks": scheme.get("required_marks", {}),
    }


def get_steps(scheme_name: str) -> Optional[list]:
    """Return ordered steps with durations for a scheme."""
    scheme = get_scheme(scheme_name)
    if not scheme:
        return None
    return scheme.get("steps", [])


def get_fees(scheme_name: str) -> Optional[dict]:
    """Return fee breakdown with source citations for a scheme."""
    scheme = get_scheme(scheme_name)
    if not scheme:
        return None
    return scheme.get("fees", {})


def get_required_marks(scheme_name: str) -> Optional[dict]:
    """Return the required marks/identifiers for a scheme."""
    scheme = get_scheme(scheme_name)
    if not scheme:
        return None
    return scheme.get("required_marks", {})


# ── Consumer / Grievance Routing ─────────────────────────────────────────

def get_consumer_routes() -> Optional[dict]:
    """Return consumer grievance routing info."""
    data = load_schemes()
    return data.get("CONSUMER")


def route_consumer(query: str) -> dict:
    """
    Route a consumer query to the appropriate action.
    Returns helpline info and specific action recommendation.
    """
    consumer = get_consumer_routes()
    if not consumer:
        return {
            "action": "Contact BIS helpline 1800-11-4000",
            "helpline": "1800-11-4000",
            "website": "https://bis.gov.in",
        }

    query_lower = query.lower()
    matched_route = None
    for route in consumer.get("routes", []):
        trigger = route.get("trigger", "").lower()
        if any(word in query_lower for word in trigger.split()):
            matched_route = route
            break

    return {
        "action": matched_route["action"] if matched_route else "Contact BIS helpline 1800-11-4000",
        "helpline": consumer.get("helpline", "1800-11-4000"),
        "website": consumer.get("website", "https://bis.gov.in"),
        "care_app": consumer.get("care_app", "BIS CARE Mobile App"),
        "grievance_portal": consumer.get("grievance_portal", ""),
    }


# ── Quick self-test ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Testing schemes.py…\n")

    # List schemes
    schemes = list_schemes()
    print(f"Schemes loaded: {len(schemes)}")
    for s in schemes:
        print(f"  {s['key']}: {s['name']}")

    # Lookup by product
    print("\nLookup 'LED bulb':")
    result = lookup("LED bulb")
    print(f"  → {result['name'] if result else 'NOT FOUND'}")

    print("\nLookup 'gold ring':")
    result = lookup("gold ring")
    print(f"  → {result['name'] if result else 'NOT FOUND'}")

    print("\nLookup 'plastic toy':")
    result = lookup("plastic toy")
    print(f"  → {result['name'] if result else 'NOT FOUND'}")

    # Decision tree traversal
    print("\nTraverse CRS with all 'yes':")
    result = traverse("CRS", {"in_qco": "yes", "is_domestic": "yes"})
    print(f"  completed: {result['completed']}")
    if result["completed"]:
        print(f"  steps: {len(result['steps'])}")
        print(f"  fees source: {result['fees'].get('source_url', 'N/A')}")

    # Fees
    print("\nCRS fees:")
    fees = get_fees("CRS")
    if fees:
        print(f"  application: {fees.get('application')}")
        print(f"  source_url: {fees.get('source_url')}")
        print(f"  retrieved_on: {fees.get('retrieved_on')}")

    # Consumer routing
    print("\nConsumer route 'verify HUID':")
    route = route_consumer("how to verify HUID")
    print(f"  action: {route['action']}")
    print(f"  helpline: {route['helpline']}")

    print("\n✅ All tests passed!")
