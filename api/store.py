"""
Manak Mitra — Database & Structured Store
Owner: Rudra

SQLite data access layer for:
- Quality Control Orders (QCO)
- Mandatory Certified Products & HSN codes
- Recognized Testing Laboratories & Lab-Standard Scopes
- Standards catalog & metadata
- Query audit logs & telemetry
"""
import sqlite3
import json
import pathlib
import datetime
import re
from typing import List, Dict, Any, Optional

DB = pathlib.Path(__file__).parent.parent / "manak.db"


def conn() -> sqlite3.Connection:
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


def init():
    """Initializes the database schema and seeds from curated CSV files if empty."""
    try:
        from api import ingest
    except ImportError:
        import ingest
    with conn() as c:
        ingest.init_schema(c)

        # Check if database has been populated
        qco_count = c.execute("SELECT count(*) FROM qco").fetchone()[0]
        prod_count = c.execute("SELECT count(*) FROM qco_items").fetchone()[0]
        lab_count = c.execute("SELECT count(*) FROM labs").fetchone()[0]

        if qco_count == 0 or prod_count <= 3 or lab_count <= 3:
            # Run full automated ingestion
            ingest.ingest_all(DB)


def mandate_for(term: str) -> List[Dict[str, Any]]:
    """
    Given a product name, IS number, or HSN code, returns all QCO rows that cover it.
    Uses multi-column match with ranking by confidence.
    """
    if not term or not term.strip():
        return []

    term_clean = term.strip()
    term_pattern = f"%{term_clean.lower()}%"

    with conn() as c:
        # Search by exact or partial IS number, product description, category, or QCO title
        rows = c.execute("""
            SELECT i.id, i.qco_id, i.product_desc, i.category, i.hsn_codes, i.is_number,
                   i.scheme, i.effective_on, i.confidence,
                   COALESCE(i.notification_url, q.gazette_url) AS gazette_url,
                   q.title AS qco_title, q.ministry, q.retrieved_on, q.source_url
            FROM qco_items i
            LEFT JOIN qco q ON q.qco_id = i.qco_id
            WHERE lower(i.product_desc) LIKE ?
               OR lower(i.is_number) LIKE ?
               OR (i.hsn_codes IS NOT NULL AND i.hsn_codes LIKE ?)
               OR (i.category IS NOT NULL AND lower(i.category) LIKE ?)
               OR (q.title IS NOT NULL AND lower(q.title) LIKE ?)
            ORDER BY
                CASE
                    WHEN lower(i.is_number) = lower(?) THEN 1
                    WHEN lower(i.product_desc) LIKE ? THEN 2
                    ELSE 3
                END,
                i.confidence DESC
            LIMIT 5
        """, (term_pattern, term_pattern, term_pattern, term_pattern, term_pattern,
              term_clean, f"{term_clean.lower()}%")).fetchall()

        return [dict(r) for r in rows]


_MATCH_STOPWORDS = {"and", "for", "of", "the", "with", "use", "in", "to", "a", "an", "part", "general", "product"}
_MATCH_SYNONYMS = {"bulb": "lamp", "bulbs": "lamp", "lamps": "lamp", "toys": "toy", "children": "child", "jewellery": "jewelry"}


def _terms(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    return {_MATCH_SYNONYMS.get(word, word[:-1] if word.endswith("s") and len(word) > 3 else word) for word in words if len(word) > 1 and word not in _MATCH_STOPWORDS}


def passport_candidates(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    """Return ranked, evidence-backed QCO product items for passport disambiguation.

    This deliberately does not use semantic-vector matches: a passport makes a
    regulatory decision and must be anchored to a specific curated QCO item.
    """
    query = (query or "").strip()
    if not query:
        return []
    query_terms = _terms(query)
    normalized_is = re.sub(r"[^A-Z0-9]", "", query.upper())
    digits_only = re.sub(r"\D", "", query)

    with conn() as c:
        rows = [dict(row) for row in c.execute("""
            SELECT i.id, i.qco_id, i.product_desc, i.category, i.hsn_codes, i.is_number,
                   i.scheme, i.effective_on, i.confidence,
                   COALESCE(i.notification_url, q.gazette_url) AS gazette_url,
                   q.title AS qco_title, q.ministry, q.retrieved_on, q.source_url
            FROM qco_items i LEFT JOIN qco q ON q.qco_id = i.qco_id
        """).fetchall()]

    ranked = []
    for row in rows:
        product_text = f"{row.get('product_desc', '')} {row.get('category', '')}"
        product_terms = _terms(product_text)
        score = 0.0
        exact = False
        if normalized_is and normalized_is == re.sub(r"[^A-Z0-9]", "", (row.get("is_number") or "").upper()):
            score, exact = 1.0, True
        elif digits_only and len(digits_only) >= 4 and any(digits_only == re.sub(r"\D", "", hsn) for hsn in re.split(r"[,;/\\s]+", row.get("hsn_codes") or "") if hsn):
            score, exact = 0.98, True
        elif query_terms and product_terms:
            overlap = len(query_terms & product_terms)
            # Require at least one meaningful term. Exact phrase contains are
            # preferred, then overlap scaled by query specificity.
            if query.lower() in product_text.lower():
                score = 0.9
            elif overlap:
                score = overlap / max(len(query_terms), 1)
                if overlap == 1 and len(query_terms) > 1:
                    score *= 0.65
        if score >= 0.45:
            row["match_score"] = round(score, 3)
            row["exact_match"] = exact
            ranked.append(row)

    ranked.sort(key=lambda item: (item["exact_match"], item["match_score"], item.get("confidence") or 0), reverse=True)
    unique = []
    seen = set()
    for item in ranked:
        key = (item.get("qco_id"), item.get("is_number"), item.get("product_desc"))
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique[:limit]


def get_labs_for_standard(is_number: str, city: str = "", limit: int = 5) -> List[Dict[str, Any]]:
    """
    Finds BIS-recognized labs that specifically test a given Indian Standard (IS number).
    """
    if not is_number:
        return []

    is_clean = is_number.strip()
    is_pattern = f"%{is_clean.lower()}%"
    city_pattern = f"%{city.strip().lower()}%" if city else "%"

    with conn() as c:
        # First query the verified lab-standard scope table
        rows = c.execute("""
            SELECT lab_name AS name, city, state, is_number, product_name, category,
                   lab_code, source_url, mapping_status
            FROM lab_standards
            WHERE lower(is_number) LIKE ?
              AND lower(city) LIKE ?
            LIMIT ?
        """, (is_pattern, city_pattern, limit)).fetchall()

        if rows:
            return [dict(r) for r in rows]

        # If no direct standard scope match, fallback to category search on main labs table
        category_guess = "electronics" if "16102" in is_clean or "electronics" in is_clean.lower() else (
            "toys" if "9873" in is_clean or "toy" in is_clean.lower() else (
                "gold" if "1417" in is_clean or "gold" in is_clean.lower() else "general"
            )
        )
        return get_nearest_labs(city=city, category=category_guess, limit=limit)


def get_verified_labs_for_standard(is_number: str, city: str = "", limit: int = 5) -> List[Dict[str, Any]]:
    """Return only explicit BIS LIMS standard-scope mappings; never general labs."""
    if not is_number:
        return []
    with conn() as c:
        rows = c.execute("""
            SELECT lab_name AS name, city, state, is_number, product_name, category,
                   lab_code, source_url, mapping_status
            FROM lab_standards
            WHERE lower(is_number) LIKE ? AND lower(city) LIKE ?
            LIMIT ?
        """, (f"%{is_number.strip().lower()}%", f"%{city.strip().lower()}%" if city else "%", limit)).fetchall()
    return [dict(row) for row in rows]


def get_nearest_labs(city: str = "", category: str = "", limit: int = 5) -> List[Dict[str, Any]]:
    """
    Queries nearest accredited BIS labs filtered by city and category.
    """
    city_q = f"%{city.strip().lower()}%" if city else "%"
    cat_q = f"%{category.strip().lower()}%" if category else "%"

    with conn() as c:
        rows = c.execute("""
            SELECT lab_id, name, city, state, lat, lon, categories
            FROM labs
            WHERE lower(city) LIKE ? AND lower(categories) LIKE ?
            LIMIT ?
        """, (city_q, cat_q, limit)).fetchall()

        return [dict(r) for r in rows]


def get_all_standards(limit: int = 300) -> List[Dict[str, Any]]:
    """Returns standards from database (capped for visualization)."""
    with conn() as c:
        rows = c.execute("SELECT * FROM standards LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]


def get_standard_by_number(is_number: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single standard record by IS number."""
    with conn() as c:
        row = c.execute("SELECT * FROM standards WHERE lower(is_number) = lower(?)", (is_number.strip(),)).fetchone()
        return dict(row) if row else None


def log(**kw):
    """Logs query telemetry for evaluation and monitoring."""
    with conn() as c:
        c.execute("""
            INSERT INTO query_log (ts, channel, language, intent, matched_is, top_score, abstained)
            VALUES (:ts, :channel, :language, :intent, :matched_is, :top_score, :abstained)
        """, kw)


def get_stats() -> Dict[str, Any]:
    """Returns system operational statistics."""
    with conn() as c:
        total = c.execute("SELECT count(*) FROM query_log").fetchone()[0]
        abstained = c.execute("SELECT count(*) FROM query_log WHERE abstained = 1").fetchone()[0]
        qco_items_count = c.execute("SELECT count(*) FROM qco_items").fetchone()[0]
        labs_count = c.execute("SELECT count(*) FROM labs").fetchone()[0]
        lab_standards_count = c.execute("SELECT count(*) FROM lab_standards").fetchone()[0]
        standards_count = c.execute("SELECT count(*) FROM standards").fetchone()[0]

        return {
            "total_queries": total,
            "abstained_queries": abstained,
            "mandatory_products_indexed": qco_items_count,
            "testing_labs_indexed": labs_count,
            "lab_scope_mappings": lab_standards_count,
            "standards_in_db": standards_count
        }
