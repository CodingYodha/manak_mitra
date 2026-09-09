"""
graph_build.py — Offline graph builder for Manak Mitra.

Run once (or whenever CSVs are updated):
    python api/graph_build.py

Produces: graph.gpickle (committed to repo, loaded at runtime by graph_store.py).

Node types:  standard, ics, lab, product, qco, scheme
Edge types:  classified_as, parent_of, tests, requires, governed_by, under
"""
import csv
import pickle
import pathlib
import sqlite3
import re

ROOT = pathlib.Path(__file__).parent.parent

# ── Normalisation helpers ────────────────────────────────────────────────────
def _norm_is(raw: str) -> str:
    """
    Canonicalize IS number for consistent node IDs.
    Examples:
      'IS 9873 : Part 1 (2025)'    → 'IS 9873 (Part 1)'
      'IS 9873 : Part 7 (2017)'    → 'IS 9873 (Part 7)'
      'IS 9873 (Part 1) : 2018'    → 'IS 9873 (Part 1)'
      'IS 16102 (Part 1)'          → 'IS 16102 (Part 1)'
      'IS 1417'                    → 'IS 1417'
    """
    s = raw.strip()
    # Mapping files frequently contain a dangling colon (for example,
    # "IS 15768 :"). Treat it as formatting, not as part of the standard ID.
    s = re.sub(r"\s*:\s*$", "", s)
    # Remove trailing year in parens that follows a Part spec: 'IS X (Part Y) : 2018' -> 'IS X (Part Y)'
    s = re.sub(r"(\(Part\s*\d+\))\s*[:\-]?\s*\(?(\d{4})\)?", r"\1", s, flags=re.I)
    # Normalize ': Part X (year)' -> '(Part X)'
    s = re.sub(r"\s*:\s*Part\s*(\d+)\s*\(?\d{0,4}\)?", r" (Part \1)", s, flags=re.I)
    # Remove stray trailing years like ' (2022)', ' 2022'
    s = re.sub(r"\s*\(?\b(19|20)\d{2}\b\)?$", "", s).strip()
    # Normalize whitespace inside and around parens
    s = re.sub(r"\(\s*(Part)\s*(\d+)\s*\)", r"(Part \2)", s, flags=re.I)
    s = re.sub(r"\s+", " ", s)
    return s.strip()

def _lab_id(lab_code: str) -> str:
    return f"lab:{lab_code}"

def _std_id(is_number: str) -> str:
    return f"std:{_norm_is(is_number)}"

def _ics_id(code: str) -> str:
    return f"ics:{code.strip()}"

def _prod_id(desc: str) -> str:
    return f"prod:{desc.strip()}"

def _qco_id(qco_id: str) -> str:
    return f"qco:{qco_id.strip()}"

def _scheme_id(scheme: str) -> str:
    return f"scheme:{scheme.strip()}"

# ── Build ─────────────────────────────────────────────────────────────────────
def build(output: str = "graph.gpickle", verbose: bool = True) -> object:
    try:
        import networkx as nx
    except ImportError:
        raise RuntimeError("networkx not installed — run: pip install networkx")

    # A relationship is unique for a source/target pair in this domain. A
    # DiGraph keeps duplicate CSV rows from becoming duplicate rendered links.
    G = nx.DiGraph()

    def ensure_standard(is_number: str) -> str:
        """Create a typed placeholder when a relation references an IS absent
        from the catalogue. This preserves the relationship without emitting an
        untyped node that the client cannot render consistently.
        """
        node_id = _std_id(is_number)
        if node_id not in G:
            label = _norm_is(is_number)
            G.add_node(node_id, type="standard", label=label,
                       is_number=label, status="UNVERIFIED_REFERENCE")
        return node_id

    def ensure_qco(qco_id: str) -> str:
        """Create a typed QCO reference for product rows not in the QCO file."""
        node_id = _qco_id(qco_id)
        if node_id not in G:
            G.add_node(node_id, type="qco", label=qco_id,
                       status="UNVERIFIED_REFERENCE")
        return node_id

    # ── 1. Standards (from standards.csv — 23k rows) ─────────────────────────
    stds_csv = ROOT / "data" / "curated" / "standards.csv"
    std_count = 0
    if stds_csv.exists():
        for row in csv.DictReader(open(stds_csv, encoding="utf-8-sig")):
            nid = _std_id(row["is_number"])
            G.add_node(nid, type="standard",
                       label=row["title"],
                       is_number=row["is_number"],
                       ics=row.get("ics_code", "").strip(),
                       status=row.get("status", ""),
                       year=row.get("year", ""),
                       purchase_url=row.get("purchase_url", ""))
            std_count += 1
    if verbose:
        print(f"[graph_build] standards: {std_count} nodes")

    # ── 2. ICS Taxonomy (ics_taxonomy.csv) ───────────────────────────────────
    ics_csv = ROOT / "data" / "curated" / "ics_taxonomy.csv"
    ics_count = 0
    if ics_csv.exists():
        for row in csv.DictReader(open(ics_csv, encoding="utf-8-sig")):
            nid = _ics_id(row["identifier"])
            G.add_node(nid, type="ics",
                       label=row.get("titleEn", ""),
                       code=row["identifier"])
            if row.get("parent", "").strip():
                G.add_edge(nid, _ics_id(row["parent"]), rel="parent_of")
            ics_count += 1
    if verbose:
        print(f"[graph_build] ICS taxonomy: {ics_count} nodes")

    # ── 3. Standard → ICS edges ──────────────────────────────────────────────
    std_ics_edges = 0
    for nid, data in list(G.nodes(data=True)):
        if data.get("type") == "standard" and data.get("ics"):
            ics_node = _ics_id(data["ics"])
            if ics_node in G:
                G.add_edge(nid, ics_node, rel="classified_as")
                std_ics_edges += 1
    if verbose:
        print(f"[graph_build] std→ics edges: {std_ics_edges}")

    # ── 4. Labs (from labs.csv + lab_standard_mapping.csv) ───────────────────
    labs_csv = ROOT / "data" / "labs.csv"
    lab_map_csv = ROOT / "data" / "curated" / "lab_standard_mapping.csv"

    # Build lab_code -> lab row index from mapping CSV (lab_code is stable)
    lab_meta: dict = {}
    if lab_map_csv.exists():
        for row in csv.DictReader(open(lab_map_csv, encoding="utf-8-sig")):
            code = row["lab_code"].strip()
            if code not in lab_meta:
                lab_meta[code] = {
                    "name": row["lab_name"].strip(),
                    "city": row["city"].strip(),
                    "state": row["state"].strip(),
                    "category": row["category"].strip(),
                }

    # Add lab nodes from labs.csv (ground truth)
    if labs_csv.exists():
        labs_list = list(csv.DictReader(open(labs_csv, encoding="utf-8-sig")))
        for i, row in enumerate(labs_list):
            # Derive a stable lab_code from mapping by matching name+city
            name = row.get("name", row.get("\ufeffname", "")).strip()
            city = row["city"].strip()
            # Try to find matching code in lab_meta
            matched_code = next(
                (c for c, m in lab_meta.items() if m["name"] == name and m["city"] == city),
                f"LABCSV_{i:04d}"
            )
            nid = _lab_id(matched_code)
            G.add_node(nid, type="lab",
                       lab_id=matched_code,
                       label=name,
                       city=city,
                       state=row.get("state", "").strip(),
                       categories=row.get("categories", "").strip())

    if verbose:
        lab_nodes = sum(1 for _, d in G.nodes(data=True) if d.get("type") == "lab")
        print(f"[graph_build] lab nodes: {lab_nodes}")

    # ── 5. Lab → Standard edges (lab_standard_mapping.csv) ───────────────────
    test_edges = 0
    if lab_map_csv.exists():
        for row in csv.DictReader(open(lab_map_csv, encoding="utf-8-sig")):
            code = row["lab_code"].strip()
            is_num = row["is_number"].strip()
            if not is_num:
                continue
            lab_node = _lab_id(code)
            std_node = ensure_standard(is_num)
            if lab_node in G:
                G.add_edge(lab_node, std_node, rel="tests",
                           scope_validity=row.get("scope_validity", ""),
                           ics_cluster=row.get("ics_cluster", ""))
                test_edges += 1
    if verbose:
        print(f"[graph_build] lab→std (tests) edges: {test_edges}")

    # ── 5b. Backfill ICS codes on standards from lab_mapping ics_cluster ─────
    # The mapping has 'ics_cluster' labels (e.g. 'Mechanical') — map to ICS prefixes
    CLUSTER_TO_ICS = {
        "electrical": "29", "electronics": "31", "mechanical": "21",
        "chemicals": "71", "steel": "77", "rubber": "83", "textile": "59",
        "food": "67", "civil": "91", "automotive": "43", "toys": "97",
        "lighting": "29.140", "general testing": "03",
    }
    ics_backfill = 0
    if lab_map_csv.exists():
        for row in csv.DictReader(open(lab_map_csv, encoding="utf-8-sig")):
            is_num = row["is_number"].strip()
            cluster = row.get("ics_cluster", "").strip().lower()
            if not is_num or not cluster:
                continue
            std_node = ensure_standard(is_num)
            if std_node in G and not G.nodes[std_node].get("ics"):
                ics_prefix = CLUSTER_TO_ICS.get(cluster, "")
                if ics_prefix:
                    G.nodes[std_node]["ics"] = ics_prefix
                    ics_node = _ics_id(ics_prefix)
                    if ics_node in G:
                        G.add_edge(std_node, ics_node, rel="classified_as")
                        ics_backfill += 1
    if verbose:
        print(f"[graph_build] ICS backfill from mapping: {ics_backfill} additional edges")

    # ── 6. QCO + Product nodes (bis_scheme_1_products.csv) ──────────────────
    prod_csv = ROOT / "data" / "curated" / "bis_scheme_1_products.csv"
    qco_csv = ROOT / "data" / "curated" / "bis_scheme_1_qcos.csv"

    if qco_csv.exists():
        for row in csv.DictReader(open(qco_csv, encoding="utf-8-sig")):
            qid = _qco_id(row["qco_id"])
            G.add_node(qid, type="qco",
                       label=row["qco"].strip()[:120],
                       notification_url=row.get("notification_url", ""),
                       source_url=row.get("source_url", ""))

    prod_count = 0
    if prod_csv.exists():
        for row in csv.DictReader(open(prod_csv, encoding="utf-8-sig")):
            is_num = row["is_number"].strip()
            product = row["product"].strip()
            qco_raw = row.get("qco_id", "").strip()
            scheme = row.get("scheme", "").strip()

            pid = _prod_id(product)
            G.add_node(pid, type="product",
                       label=product,
                       is_number=is_num,
                       category=row.get("category", "").strip())

            if is_num:
                std_node = ensure_standard(is_num)
                G.add_edge(pid, std_node, rel="requires")

            if qco_raw:
                qid = ensure_qco(qco_raw)
                G.add_edge(pid, qid, rel="governed_by")
                if scheme:
                    sid = _scheme_id(scheme)
                    G.add_node(sid, type="scheme", label=scheme)
                    G.add_edge(qid, sid, rel="under")
            prod_count += 1

    # Also wire from our SQLite qco_items for the 3 demo products
    # Add ALIAS nodes so both "22K gold ring" and the full CSV name resolve
    DEMO_ALIASES = {
        "Self-ballasted LED lamps for general lighting services": [
            "LED bulb", "LED lamp", "9W LED bulb", "self-ballasted LED"
        ],
        "Gold Jewellery / Artefacts / Gold Ring": [
            "22K gold ring", "gold ring", "gold jewellery", "hallmarking"
        ],
        "Safety of Toys Part l Safety Aspects Related to Mechanical and Physical Properties.": [
            "Children's plastic toy", "plastic toy", "toys", "children toy"
        ],
    }
    db = ROOT / "manak.db"
    if db.exists():
        con = sqlite3.connect(db)
        con.row_factory = sqlite3.Row
        for r in con.execute("SELECT product_desc, is_number, qco_id, scheme FROM qco_items"):
            pid = _prod_id(r["product_desc"])
            if pid not in G:
                G.add_node(pid, type="product", label=r["product_desc"])
            if r["is_number"]:
                G.add_edge(pid, ensure_standard(r["is_number"]), rel="requires")
            if r["qco_id"]:
                G.add_edge(pid, ensure_qco(r["qco_id"]), rel="governed_by")
            if r["scheme"]:
                sid = _scheme_id(r["scheme"])
                G.add_node(sid, type="scheme", label=r["scheme"])
                G.add_edge(_qco_id(r["qco_id"]), sid, rel="under")
        con.close()

    # Add alias nodes pointing to the canonical product node
    alias_count = 0
    for canonical, aliases in DEMO_ALIASES.items():
        canonical_pid = _prod_id(canonical)
        if canonical_pid not in G:
            continue
        for alias in aliases:
            alias_pid = _prod_id(alias)
            G.add_node(alias_pid, type="product_alias", label=alias, canonical=canonical_pid)
            # Copy each canonical relationship exactly once. The old nested
            # successor/edge loops created a Cartesian product of targets and
            # relationship labels, corrupting alias links and duplicating QCO
            # → scheme lines in the visual graph.
            for _, successor, data in list(G.out_edges(canonical_pid, data=True)):
                G.add_edge(alias_pid, successor, **data)
            alias_count += 1
    if verbose:
        print(f"[graph_build] product nodes: {prod_count} (+ 3 demo from DB, {alias_count} aliases)")

    # ── 7. Persist ────────────────────────────────────────────────────────────
    out = ROOT / output
    with open(out, "wb") as f:
        pickle.dump(G, f, protocol=pickle.HIGHEST_PROTOCOL)

    if verbose:
        print(f"[graph_build] DONE — {G.number_of_nodes()} nodes, "
              f"{G.number_of_edges()} edges → {out}")
    return G


if __name__ == "__main__":
    build()
