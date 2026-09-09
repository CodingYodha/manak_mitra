"""
Manak Mitra — Knowledge Ingestion & Database Population Engine
Owner: Shinde & Shivaprasad

Ingests:
1. QCO Gazette Orders: data/curated/bis_scheme_1_qcos.csv -> table 'qco'
2. Mandatory Certified Products: data/curated/bis_scheme_1_products.csv -> table 'qco_items'
3. Recognized Testing Laboratories: data/labs.csv -> table 'labs'
4. Lab-Standard Scope Mappings: data/curated/lab_standard_mapping.csv -> table 'lab_standards'
5. Standards Catalog: data/curated/standards.csv -> table 'standards'

Also provides document chunking utilities for technical clause retrieval from PDFs and markdown files.
"""
import csv
import datetime
import json
import logging
import os
import pathlib
import re
import sqlite3
from typing import List, Dict, Any, Optional

logger = logging.getLogger("manak.ingest")

_ROOT = pathlib.Path(__file__).parent.parent
DB_PATH = _ROOT / "manak.db"

# Data file paths
QCOS_CSV = _ROOT / "data" / "curated" / "bis_scheme_1_qcos.csv"
PRODUCTS_CSV = _ROOT / "data" / "curated" / "bis_scheme_1_products.csv"
LABS_CSV = _ROOT / "data" / "labs.csv"
LAB_STANDARD_MAPPING_CSV = _ROOT / "data" / "curated" / "lab_standard_mapping.csv"
STANDARDS_CSV = _ROOT / "data" / "curated" / "standards.csv"
SCHEMES_YAML = _ROOT / "data" / "curated" / "schemes.yaml"

SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS qco (
        qco_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        ministry TEXT,
        gazette_url TEXT NOT NULL,
        notified_on TEXT,
        retrieved_on TEXT NOT NULL,
        source_url TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS qco_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qco_id TEXT REFERENCES qco(qco_id),
        product_desc TEXT NOT NULL,
        category TEXT,
        hsn_codes TEXT,
        is_number TEXT,
        scheme TEXT,
        effective_on TEXT,
        confidence REAL DEFAULT 1.0,
        notification_url TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS standards (
        is_number TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        ics_code TEXT,
        status TEXT DEFAULT 'ACTIVE',
        year TEXT,
        is_free INTEGER DEFAULT 0,
        purchase_url TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS labs (
        lab_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT,
        state TEXT,
        lat REAL,
        lon REAL,
        categories TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS lab_standards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lab_name TEXT NOT NULL,
        city TEXT,
        state TEXT,
        category TEXT,
        lab_code TEXT,
        is_number TEXT NOT NULL,
        product_name TEXT,
        grade_type_size TEXT,
        scope_validity TEXT,
        source_url TEXT,
        mapping_status TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS document_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT NOT NULL,
        title TEXT NOT NULL,
        section TEXT,
        clause_number TEXT,
        content TEXT NOT NULL,
        source_url TEXT,
        doc_type TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS query_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT,
        channel TEXT,
        language TEXT,
        intent TEXT,
        matched_is TEXT,
        top_score REAL,
        abstained INTEGER
    );
    """
]

# Indexes for fast retrieval
INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_qco_items_is ON qco_items(is_number);",
    "CREATE INDEX IF NOT EXISTS idx_qco_items_desc ON qco_items(product_desc);",
    "CREATE INDEX IF NOT EXISTS idx_labs_city ON labs(city);",
    "CREATE INDEX IF NOT EXISTS idx_labs_categories ON labs(categories);",
    "CREATE INDEX IF NOT EXISTS idx_lab_standards_is ON lab_standards(is_number);",
    "CREATE INDEX IF NOT EXISTS idx_lab_standards_city ON lab_standards(city);"
]


def get_connection(db_path: pathlib.Path = DB_PATH) -> sqlite3.Connection:
    c = sqlite3.connect(db_path)
    c.row_factory = sqlite3.Row
    return c


def init_schema(conn: sqlite3.Connection):
    """Initializes the SQLite schema and indexes, migrating existing tables if needed."""
    with conn:
        for stmt in SCHEMA_STATEMENTS:
            conn.execute(stmt)
            
        # Ensure any new columns exist in existing tables
        def add_col_if_missing(table, column, col_type):
            cursor = conn.execute(f"PRAGMA table_info({table})")
            cols = [row[1] for row in cursor.fetchall()]
            if column not in cols:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")

        try:
            add_col_if_missing("qco", "source_url", "TEXT")
            add_col_if_missing("qco_items", "category", "TEXT")
            add_col_if_missing("qco_items", "notification_url", "TEXT")
            add_col_if_missing("standards", "is_free", "INTEGER DEFAULT 0")
            add_col_if_missing("standards", "purchase_url", "TEXT")
        except Exception as e:
            logger.debug(f"Migration notice: {e}")

        for idx in INDEX_STATEMENTS:
            conn.execute(idx)


def ingest_qcos(conn: sqlite3.Connection, csv_path: pathlib.Path = QCOS_CSV) -> int:
    """Ingests Quality Control Orders into 'qco' table."""
    if not csv_path.exists():
        logger.warning(f"QCO CSV file not found: {csv_path}")
        return 0

    today = datetime.date.today().isoformat()
    rows_inserted = 0

    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        with conn:
            for r in reader:
                qco_id = r.get("qco_id", "").strip()
                title = r.get("qco", "").strip()
                notif_url = r.get("notification_url", "").strip()
                source_url = r.get("source_url", "").strip()

                if not qco_id or not title:
                    continue

                conn.execute("""
                    INSERT OR REPLACE INTO qco (qco_id, title, ministry, gazette_url, notified_on, retrieved_on, source_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (qco_id, title, "Government of India", notif_url, None, today, source_url))
                rows_inserted += 1

    # Also ensure canonical seed QCOs exist
    with conn:
        conn.execute("""
            INSERT OR IGNORE INTO qco (qco_id, title, ministry, gazette_url, notified_on, retrieved_on, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("qco-led", "Electronics and IT Goods (Requirement for Compulsory Registration) Order", "MeitY",
              "https://www.meity.gov.in/esdm/crs", "2021-10-01", today, "https://crsbis.in/"))
        conn.execute("""
            INSERT OR IGNORE INTO qco (qco_id, title, ministry, gazette_url, notified_on, retrieved_on, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("qco-gold", "Hallmarking of Gold Jewellery and Gold Artefacts Order", "DoCA",
              "https://consumeraffairs.nic.in/hallmarking", "2021-06-23", today, "https://bis.gov.in/hallmarking"))
        conn.execute("""
            INSERT OR IGNORE INTO qco (qco_id, title, ministry, gazette_url, notified_on, retrieved_on, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("qco-toys", "Toys (Quality Control) Order", "DPIIT",
              "https://dpiit.gov.in/toys-qco", "2020-02-25", today, "https://bis.gov.in/isi"))

    logger.info(f"Ingested {rows_inserted} QCO records.")
    return rows_inserted


def ingest_products(conn: sqlite3.Connection, csv_path: pathlib.Path = PRODUCTS_CSV) -> int:
    """Ingests mandatory certified products into 'qco_items' table."""
    if not csv_path.exists():
        logger.warning(f"Products CSV not found: {csv_path}")
        return 0

    rows_inserted = 0
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        with conn:
            for r in reader:
                is_num = r.get("is_number", "").strip()
                product = r.get("product", "").strip()
                category = r.get("category", "").strip()
                scheme = r.get("scheme", "Scheme I").strip()
                qco_id = r.get("qco_id", "").strip()
                notif_url = r.get("notification_url", "").strip()

                if not is_num and not product:
                    continue

                conn.execute("""
                    INSERT INTO qco_items (qco_id, product_desc, category, hsn_codes, is_number, scheme, effective_on, confidence, notification_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (qco_id, product, category, None, is_num, scheme or "ISI", None, 1.0, notif_url))
                rows_inserted += 1

    # Ensure canonical seed product items exist
    with conn:
        # 1. LED Bulb
        conn.execute("""
            INSERT INTO qco_items (qco_id, product_desc, category, hsn_codes, is_number, scheme, effective_on, confidence, notification_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("qco-led", "Self-ballasted LED lamps for general lighting services", "Electronics", "8539", "IS 16102 (Part 1)", "CRS", "2021-10-01", 1.0, "https://crsbis.in/"))

        # 2. Gold Jewellery
        conn.execute("""
            INSERT INTO qco_items (qco_id, product_desc, category, hsn_codes, is_number, scheme, effective_on, confidence, notification_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("qco-gold", "Gold Jewellery / Artefacts / Gold Ring", "Precious Metals", "7113", "IS 1417", "HALLMARKING", "2021-06-23", 1.0, "https://bis.gov.in/hallmarking"))

        # 3. Plastic Toys
        conn.execute("""
            INSERT INTO qco_items (qco_id, product_desc, category, hsn_codes, is_number, scheme, effective_on, confidence, notification_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("qco-toys", "Toys - Safety of toys (mechanical, physical, plastic toys)", "Toys", "9503", "IS 9873 (Part 1)", "ISI", "2020-09-01", 1.0, "https://bis.gov.in/isi"))

    logger.info(f"Ingested {rows_inserted} product items.")
    return rows_inserted


def ingest_labs(conn: sqlite3.Connection, csv_path: pathlib.Path = LABS_CSV) -> int:
    """Ingests accredited testing laboratories into 'labs' table."""
    if not csv_path.exists():
        logger.warning(f"Labs CSV not found: {csv_path}")
        return 0

    rows_inserted = 0
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        with conn:
            for i, r in enumerate(reader, 1):
                name = r.get("name", "").strip()
                city = r.get("city", "").strip()
                state = r.get("state", "").strip()
                categories = r.get("categories", "").strip().replace(";", ",")

                if not name:
                    continue

                lab_id = f"lab-{i}"
                conn.execute("""
                    INSERT OR REPLACE INTO labs (lab_id, name, city, state, lat, lon, categories)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (lab_id, name, city, state, None, None, categories))
                rows_inserted += 1

    # Regional anchor labs
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO labs (lab_id, name, city, state, lat, lon, categories)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("lab-del-1", "National Test House (NR)", "New Delhi", "Delhi", 28.6139, 77.2090, "electronics,toys,cement,electrical"))
        conn.execute("""
            INSERT OR REPLACE INTO labs (lab_id, name, city, state, lat, lon, categories)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("lab-mum-1", "BIS Western Regional Lab", "Mumbai", "Maharashtra", 19.0760, 72.8777, "gold,electronics,chemicals,steel"))
        conn.execute("""
            INSERT OR REPLACE INTO labs (lab_id, name, city, state, lat, lon, categories)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("lab-blr-1", "CPRI Bangalore", "Bangalore", "Karnataka", 12.9716, 77.5946, "electronics,electrical,transformers"))

    logger.info(f"Ingested {rows_inserted} laboratories.")
    return rows_inserted


def ingest_lab_standards(conn: sqlite3.Connection, csv_path: pathlib.Path = LAB_STANDARD_MAPPING_CSV) -> int:
    """Ingests lab-standard scope mappings into 'lab_standards' table."""
    if not csv_path.exists():
        logger.warning(f"Lab-Standard mapping CSV not found: {csv_path}")
        return 0

    rows_inserted = 0
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        with conn:
            for r in reader:
                lab_name = r.get("lab_name", "").strip()
                city = r.get("city", "").strip()
                state = r.get("state", "").strip()
                category = r.get("category", "").strip()
                lab_code = r.get("lab_code", "").strip()
                is_num = r.get("is_number", "").strip()
                product_name = r.get("product_name", "").strip()
                grade_type_size = r.get("grade_type_size", "").strip()
                scope_validity = r.get("scope_validity", "").strip()
                source_url = r.get("source_url", "").strip()
                mapping_status = r.get("mapping_status", "").strip()

                if not lab_name or not is_num:
                    continue

                conn.execute("""
                    INSERT INTO lab_standards (lab_name, city, state, category, lab_code, is_number, product_name, grade_type_size, scope_validity, source_url, mapping_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (lab_name, city, state, category, lab_code, is_num, product_name, grade_type_size, scope_validity, source_url, mapping_status))
                rows_inserted += 1

    logger.info(f"Ingested {rows_inserted} lab-standard mapping records.")
    return rows_inserted


def ingest_standards(conn: sqlite3.Connection, csv_path: pathlib.Path = STANDARDS_CSV) -> int:
    """Ingests the full standards catalog into 'standards' table."""
    if not csv_path.exists():
        logger.warning(f"Standards CSV not found: {csv_path}")
        return 0

    rows_inserted = 0
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        with conn:
            for r in reader:
                is_num = r.get("is_number", "").strip()
                title = r.get("title", "").strip()
                ics_code = r.get("ics_code", "").strip()
                status = r.get("status", "ACTIVE").strip() or "ACTIVE"
                year = r.get("year", "").strip()
                is_free = 1 if str(r.get("is_free", "")).lower() in ("1", "true", "yes") else 0
                purchase_url = r.get("purchase_url", "").strip()

                if not is_num or not title:
                    continue

                conn.execute("""
                    INSERT OR REPLACE INTO standards (is_number, title, ics_code, status, year, is_free, purchase_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (is_num, title, ics_code, status, year, is_free, purchase_url))
                rows_inserted += 1

    logger.info(f"Ingested {rows_inserted} standards.")
    return rows_inserted


# ── Text Chunking & Document Extraction Utilities ───────────────────────────
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Splits long technical text into overlapping chunks respecting sentence boundaries.
    """
    if not text or len(text) <= chunk_size:
        return [text] if text else []

    paragraphs = re.split(r'\n\s*\n', text)
    chunks = []
    current_chunk = []
    current_len = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        para_len = len(para)
        if current_len + para_len > chunk_size and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            # Keep the last paragraph for overlap if it's small enough
            if len(current_chunk[-1]) <= overlap:
                current_chunk = [current_chunk[-1], para]
                current_len = len(current_chunk[0]) + para_len
            else:
                current_chunk = [para]
                current_len = para_len
        else:
            current_chunk.append(para)
            current_len += para_len

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks


def ingest_document_chunks(conn: sqlite3.Connection, doc_id: str, title: str, text: str, source_url: str = "", doc_type: str = "manual"):
    """
    Chunks a text or markdown document and stores sections in document_chunks table.
    """
    chunks = chunk_text(text, chunk_size=600, overlap=80)
    with conn:
        for i, ch in enumerate(chunks, 1):
            # Extract possible section/clause header
            header_match = re.search(r'^(#+\s*|[0-9]+\.[0-9]*\s*)(.+)', ch)
            section = header_match.group(2).strip() if header_match else f"Section {i}"

            conn.execute("""
                INSERT INTO document_chunks (doc_id, title, section, clause_number, content, source_url, doc_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (doc_id, title, section, f"Clause {i}", ch, source_url, doc_type))


def ingest_all(db_path: pathlib.Path = DB_PATH) -> Dict[str, int]:
    """
    Main entry point: initializes schema and populates all database tables from CSV sources.
    """
    conn = get_connection(db_path)
    init_schema(conn)

    # Ingest datasets
    qco_count = ingest_qcos(conn)
    prod_count = ingest_products(conn)
    lab_count = ingest_labs(conn)
    lab_std_count = ingest_lab_standards(conn)
    std_count = ingest_standards(conn)

    stats = {
        "qco_orders": qco_count,
        "qco_items": prod_count,
        "labs": lab_count,
        "lab_standards": lab_std_count,
        "standards": std_count
    }
    conn.close()
    return stats


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    print("=" * 60)
    print("Manak Mitra — Ingestion Pipeline")
    print(f"Target Database: {DB_PATH}")
    print("=" * 60)
    results = ingest_all()
    print("\nIngestion Completed Successfully:")
    for k, v in results.items():
        print(f"  • {k:20s}: {v}")
    print("=" * 60)
