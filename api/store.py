import sqlite3
import json
import pathlib
import datetime

DB = pathlib.Path(__file__).parent.parent / "manak.db"

SCHEMA = """
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
  hsn_codes TEXT,
  is_number TEXT,
  scheme TEXT,
  effective_on TEXT,
  confidence REAL
);
CREATE TABLE IF NOT EXISTS standards (
  is_number TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  ics_code TEXT,
  status TEXT,
  year INTEGER,
  is_free INTEGER,
  purchase_url TEXT
);
CREATE TABLE IF NOT EXISTS labs (
  lab_id TEXT PRIMARY KEY,
  name TEXT,
  city TEXT,
  state TEXT,
  lat REAL,
  lon REAL,
  categories TEXT
);
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
"""

def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def init():
    with conn() as c:
        c.executescript(SCHEMA)
        
        # Check if qco is empty to seed
        count = c.execute("SELECT count(*) FROM qco").fetchone()[0]
        if count == 0:
            today = datetime.date.today().isoformat()
            # 1. LED Bulb
            c.execute("INSERT INTO qco VALUES (?,?,?,?,?,?)",
                      ("qco-led", "Electronics and IT Goods (Requirement for Compulsory Registration)", "MeitY", "https://egazette.gov.in/led", "2021-10-01", today))
            c.execute("INSERT INTO qco_items (qco_id, product_desc, hsn_codes, is_number, scheme, effective_on, confidence) VALUES (?,?,?,?,?,?,?)",
                      ("qco-led", "Self-ballasted LED lamps for general lighting services", "8539", "IS 16102 (Part 1)", "CRS", "2021-10-01", 1.0))
            
            # 2. Gold Ring
            c.execute("INSERT INTO qco VALUES (?,?,?,?,?,?)",
                      ("qco-gold", "Hallmarking of Gold Jewellery and Gold Artefacts Order", "DoCA", "https://egazette.gov.in/gold", "2021-06-23", today))
            c.execute("INSERT INTO qco_items (qco_id, product_desc, hsn_codes, is_number, scheme, effective_on, confidence) VALUES (?,?,?,?,?,?,?)",
                      ("qco-gold", "Gold Jewellery / Artefacts / Gold Ring", "7113", "IS 1417", "HALLMARKING", "2021-06-23", 1.0))

            # 3. Plastic Toy
            c.execute("INSERT INTO qco VALUES (?,?,?,?,?,?)",
                      ("qco-toys", "Toys (Quality Control) Order", "DPIIT", "https://egazette.gov.in/toys", "2020-02-25", today))
            c.execute("INSERT INTO qco_items (qco_id, product_desc, hsn_codes, is_number, scheme, effective_on, confidence) VALUES (?,?,?,?,?,?,?)",
                      ("qco-toys", "Toys - Safety of toys (mechanical, physical, plastic)", "9503", "IS 9873 (Part 1)", "ISI", "2020-09-01", 1.0))

        # Check if labs is empty to seed
        count = c.execute("SELECT count(*) FROM labs").fetchone()[0]
        if count == 0:
            c.executemany("INSERT INTO labs VALUES (?,?,?,?,?,?,?)", [
                ("lab-del-1", "National Test House (NR)", "New Delhi", "Delhi", 28.6139, 77.2090, "electronics,toys"),
                ("lab-mum-1", "BIS Western Regional Lab", "Mumbai", "Maharashtra", 19.0760, 72.8777, "gold,electronics"),
                ("lab-blr-1", "CPRI Bangalore", "Bangalore", "Karnataka", 12.9716, 77.5946, "electronics"),
            ])

def mandate_for(term: str):
    """Product name or HSN code -> the QCO rows that cover it."""
    q = f"%{term.lower()}%"
    with conn() as c:
        return [dict(r) for r in c.execute("""
            SELECT i.*, q.title AS qco_title, q.gazette_url, q.retrieved_on
            FROM qco_items i JOIN qco q ON q.qco_id = i.qco_id
            WHERE lower(i.product_desc) LIKE ? OR i.hsn_codes LIKE ? OR lower(i.is_number) LIKE ?
            ORDER BY i.confidence DESC
        """, (q, q, q))]

def log(**kw):
    with conn() as c:
        c.execute("""
            INSERT INTO query_log (ts, channel, language, intent, matched_is, top_score, abstained)
            VALUES (:ts, :channel, :language, :intent, :matched_is, :top_score, :abstained)
        """, kw)

def get_stats():
    with conn() as c:
        total = c.execute("SELECT count(*) FROM query_log").fetchone()[0]
        abstained = c.execute("SELECT count(*) FROM query_log WHERE abstained = 1").fetchone()[0]
        return {"total_queries": total, "abstained": abstained}

def get_all_standards():
    with conn() as c:
        return [dict(r) for r in c.execute("SELECT * FROM standards")]

def get_nearest_labs(city: str, category: str, limit: int = 3):
    city_q = f"%{city.lower()}%" if city else "%"
    cat_q = f"%{category.lower()}%" if category else "%"
    with conn() as c:
        return [dict(r) for r in c.execute("""
            SELECT * FROM labs
            WHERE lower(city) LIKE ? AND lower(categories) LIKE ?
            LIMIT ?
        """, (city_q, cat_q, limit))]
