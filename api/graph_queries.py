"""
graph_queries.py — 20 traversal features on the Manak Mitra knowledge graph.

All functions return plain dicts/lists — JSON-serialisable, no networkx objects exposed.
Import graph_store.get() lazily so the file can be imported even before the graph is built.
"""
import csv
import math
import pathlib
from typing import Optional

ROOT = pathlib.Path(__file__).parent.parent

# ── City coordinates (static, loaded once) ───────────────────────────────────
def _load_city_coords() -> dict:
    path = ROOT / "data" / "curated" / "city_coords.csv"
    if not path.exists():
        return {}
    return {
        r["city"]: (float(r["lat"]), float(r["lng"]))
        for r in csv.DictReader(open(path, encoding="utf-8-sig"))
    }

CITY_COORDS: dict = _load_city_coords()


def _haversine(a: tuple, b: tuple) -> float:
    """Great-circle distance in km."""
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return round(2 * 6371 * math.asin(math.sqrt(h)), 1)


def _G():
    """Lazy graph accessor."""
    try:
        from api.graph_store import get
    except ImportError:
        from graph_store import get
    return get()


def _node(nid: str) -> dict:
    G = _G()
    return dict(G.nodes.get(nid, {}))


# ── Helpers ───────────────────────────────────────────────────────────────────
def _std_id(is_number: str) -> str:
    return f"std:{is_number.strip()}"

def _lab_id(lab_id: str) -> str:
    return f"lab:{lab_id.strip()}"

def _prod_id(product: str) -> str:
    return f"prod:{product.strip()}"

def _ics_id(code: str) -> str:
    return f"ics:{code.strip()}"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 1 — Standards a lab is certified for
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def standards_for_lab(lab_id: str) -> list[dict]:
    G = _G()
    nid = _lab_id(lab_id)
    return [
        {"node": n, **dict(G.nodes[n])}
        for n in G.successors(nid)
        if G.nodes[n].get("type") == "standard"
    ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 2 — Labs certified for a given IS number
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def labs_for_standard(is_number: str) -> list[dict]:
    G = _G()
    nid = _std_id(is_number)
    return [
        {"node": n, **dict(G.nodes[n])}
        for n in G.predecessors(nid)
        if G.nodes[n].get("type") == "lab"
    ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 3 — Products a lab can test
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def products_for_lab(lab_id: str) -> list[dict]:
    G = _G()
    products = set()
    for std_node in G.successors(_lab_id(lab_id)):
        if G.nodes[std_node].get("type") != "standard":
            continue
        for pred in G.predecessors(std_node):
            if G.nodes[pred].get("type") == "product":
                products.add(pred)
    return [{"node": n, **dict(G.nodes[n])} for n in products]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 4 — Labs that can test a product (via its required standards)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def labs_for_product(product: str) -> list[dict]:
    G = _G()
    labs: set[str] = set()
    for std_node in G.successors(_prod_id(product)):
        if G.nodes[std_node].get("type") != "standard":
            continue
        is_num = G.nodes[std_node].get("is_number", std_node.split(":", 1)[1])
        for lab in labs_for_standard(is_num):
            labs.add(lab["node"])
    return [{"node": n, **dict(G.nodes[n])} for n in labs]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 5 — Labs in a city (optionally filtered by state)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def labs_by_city(city: str, state: Optional[str] = None) -> list[dict]:
    G = _G()
    results = []
    for nid, data in G.nodes(data=True):
        if data.get("type") != "lab":
            continue
        if data.get("city", "").lower() != city.lower():
            continue
        if state and data.get("state", "").lower() != state.lower():
            continue
        results.append({"node": nid, **data})
    return results


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 6 + 17 — Nearest labs for a product to a city (haversine sorted)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def labs_near_for_product(product: str, city: str, k: int = 3) -> list[dict]:
    origin = CITY_COORDS.get(city)
    candidates = []
    for lab in labs_for_product(product):
        lab_city = lab.get("city", "")
        coords = CITY_COORDS.get(lab_city)
        if coords is None:
            # Still include with unknown distance so we never return empty
            candidates.append({**lab, "distance_km": None})
        else:
            d = _haversine(origin, coords) if origin else None
            candidates.append({**lab, "distance_km": d})

    # Sort: known distances first, then unknowns
    candidates.sort(key=lambda r: (r["distance_km"] is None, r["distance_km"] or 0))
    return candidates[:k]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 7 — Full scope of a lab (standards + sectors)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def lab_scope(lab_id: str) -> dict:
    stds = standards_for_lab(lab_id)
    sectors = sector_expertise(lab_id)
    lab_data = _node(_lab_id(lab_id))
    return {
        "lab": lab_data,
        "standards_count": len(stds),
        "standards": stds[:20],  # cap for API response size
        "sectors": sectors,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 8 — ICS ancestor chain (leaf → subgroup → group → field)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def ics_ancestors(ics_code: str) -> list[dict]:
    G = _G()
    chain = []
    node = _ics_id(ics_code)
    visited = set()
    while node in G and node not in visited:
        visited.add(node)
        data = dict(G.nodes[node])
        chain.append({"code": node.split(":", 1)[1], "label": data.get("label", "")})
        parents = [t for _, t, d in G.out_edges(node, data=True) if d.get("rel") == "parent_of"]
        if not parents:
            break
        node = parents[0]
    return chain


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 9 — Top-level sector for a standard
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def sector_for_standard(is_number: str) -> Optional[dict]:
    G = _G()
    data = G.nodes.get(_std_id(is_number), {})
    ics = data.get("ics", "")
    if not ics:
        return None
    chain = ics_ancestors(ics)
    return chain[-1] if chain else None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 10 — Full ICS classification path for a standard
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def ics_path_for_standard(is_number: str) -> list[dict]:
    G = _G()
    data = G.nodes.get(_std_id(is_number), {})
    ics = data.get("ics", "")
    if not ics:
        return []
    return ics_ancestors(ics)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 11 — ICS categories for a product (via its standards)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def ics_for_product(product: str) -> list[dict]:
    G = _G()
    cats: set[str] = set()
    for std_node in G.successors(_prod_id(product)):
        if G.nodes[std_node].get("type") == "standard":
            ics = G.nodes[std_node].get("ics", "")
            if ics:
                cats.add(ics)
    return [{"code": c, "label": G.nodes.get(_ics_id(c), {}).get("label", "")} for c in cats]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 12 — All standards under an ICS subtree
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def standards_by_sector(sector_code: str, limit: int = 50) -> list[dict]:
    G = _G()
    try:
        import networkx as nx
        # All nodes that have a path back to this ICS node
        ics_node = _ics_id(sector_code)
        descendants = nx.ancestors(G.reverse(copy=False), ics_node)
        results = [
            {"node": n, **dict(G.nodes[n])}
            for n in descendants
            if G.nodes[n].get("type") == "standard"
        ]
        return results[:limit]
    except Exception:
        return []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 13 — Sector expertise of a lab (unique top-level ICS sectors)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def sector_expertise(lab_id: str) -> list[dict]:
    stds = standards_for_lab(lab_id)
    sectors: dict[str, str] = {}
    for std in stds:
        is_num = std.get("is_number", "")
        if not is_num:
            continue
        s = sector_for_standard(is_num)
        if s:
            sectors[s["code"]] = s["label"]
    return [{"code": k, "label": v} for k, v in sectors.items()]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 14 — Sibling standards (same ICS leaf, different IS number)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def related_standards(is_number: str, k: int = 5) -> list[dict]:
    G = _G()
    data = G.nodes.get(_std_id(is_number), {})
    ics = data.get("ics", "")
    if not ics:
        return []
    ics_node = _ics_id(ics)
    siblings = [
        {"node": n, **dict(G.nodes[n])}
        for n in G.predecessors(ics_node)
        if G.nodes[n].get("type") == "standard" and n != _std_id(is_number)
    ]
    return siblings[:k]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 15 — Full product → standard → lab traversal path
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def product_to_lab_path(product: str) -> list[dict]:
    G = _G()
    out = []
    for std_node in G.successors(_prod_id(product)):
        if G.nodes[std_node].get("type") != "standard":
            continue
        is_num = G.nodes[std_node].get("is_number", std_node.split(":", 1)[1])
        for lab_dict in labs_for_standard(is_num):
            out.append({
                "product": product,
                "standard": {"node": std_node, **dict(G.nodes[std_node])},
                "lab": lab_dict,
            })
    return out


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 16 — Recommend standards by sector code
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def recommend_by_sector(sector_code: str, k: int = 10) -> list[dict]:
    return standards_by_sector(sector_code, limit=k)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 18 — Cluster-coherent reranking (added to search.py externally)
# Exposed here for use in answers.py or direct API calls
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def rerank_by_ics_cluster(hits: list[dict]) -> list[dict]:
    """Boost hits that share the top result's ICS prefix."""
    if not hits:
        return hits
    top_ics = (hits[0].get("ics_code") or "")[:2]
    hits.sort(key=lambda h: 0 if (h.get("ics_code") or "")[:2] == top_ics else 1)
    return hits


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 19 — Standards clustered under a sector (alias of standards_by_sector)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def standards_clustered(sector_code: str, k: int = 20) -> list[dict]:
    return standards_by_sector(sector_code, limit=k)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE 20 — Subgraph JSON for force-graph visualisation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_POS_CACHE = None

def _get_3d_positions() -> dict:
    global _POS_CACHE
    if _POS_CACHE is not None:
        return _POS_CACHE
    import os, json
    pos_file = os.path.join(os.path.dirname(__file__), "..", "web", "public", "graph_3d.json")
    if os.path.exists(pos_file):
        try:
            with open(pos_file, "r") as f:
                d = json.load(f)
                _POS_CACHE = {n["id"]: {"x": n.get("x", 0), "y": n.get("y", 0), "z": n.get("z", 0)} for n in d.get("nodes", [])}
                return _POS_CACHE
        except Exception:
            pass
    _POS_CACHE = {}
    return _POS_CACHE

def subgraph_json(center_node: Optional[str] = None, hops: int = 2, full: bool = False, connected_only: bool = True) -> dict:
    G = _G()
    try:
        import networkx as nx
        if center_node and center_node in G:
            sub = nx.ego_graph(G, center_node, radius=hops, undirected=True)
        elif full and not connected_only:
            # Full 26,835 nodes
            sub = G
        else:
            # All 4,470 connected nodes spanning all 8,611 relationships
            connected = [n for n in G.nodes() if G.degree(n) > 0]
            sub = G.subgraph(connected)

        pos_map = _get_3d_positions()
        nodes = []
        for n, d in sub.nodes(data=True):
            node_dict = {"id": n, **{k: v for k, v in d.items() if isinstance(v, (str, int, float, bool))}}
            if n in pos_map:
                node_dict.update(pos_map[n])
            nodes.append(node_dict)

        links = [{"source": u, "target": v, "rel": d.get("rel", "")}
                 for u, v, d in sub.edges(data=True)]
        return {
            "nodes": nodes,
            "links": links,
            "stats": {
                "total_graph_nodes": G.number_of_nodes(),
                "total_graph_edges": G.number_of_edges(),
                "rendered_nodes": len(nodes),
                "rendered_edges": len(links)
            }
        }
    except Exception as e:
        return {"nodes": [], "links": [], "error": str(e)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Checkpoint helper — verify all 20 features for the 3 demo products
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if __name__ == "__main__":
    DEMO = [
        ("Self-ballasted LED lamps for general lighting services", "IS 16102 (Part 1)"),
        ("22K gold ring", "IS 1417"),
        ("Children's plastic toy", "IS 9873 (Part 1)"),
    ]

    print("\n── Checkpoint: 20 features across 3 demo products ──\n")

    for prod, is_num in DEMO:
        print(f"▶ {prod}")
        r1 = labs_for_standard(is_num)
        print(f"  [F2] labs_for_standard({is_num}): {len(r1)} labs")
        r4 = labs_for_product(prod)
        print(f"  [F4] labs_for_product: {len(r4)} labs")
        r6 = labs_near_for_product(prod, "Delhi")
        print(f"  [F6] labs_near_for_product(Delhi): {r6[:1]}")
        r9 = sector_for_standard(is_num)
        print(f"  [F9] sector_for_standard: {r9}")
        r14 = related_standards(is_num)
        print(f"  [F14] related_standards: {len(r14)} siblings")
        r15 = product_to_lab_path(prod)
        print(f"  [F15] product_to_lab_path: {len(r15)} paths")
        print()

    r20 = subgraph_json("std:IS 16102 (Part 1)")
    print(f"[F20] subgraph_json: {len(r20['nodes'])} nodes, {len(r20['links'])} links")
