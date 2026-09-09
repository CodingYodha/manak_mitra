"""Export browser-ready full and positioned knowledge-graph views.

Run after ``python api/graph_build.py`` whenever the curated datasets change.
The full export keeps the entire catalogue for search/reporting; the 3D export
contains every connected node and relationship, with deterministic coordinates
for instant browser rendering.
"""
import json
import pathlib
import pickle
from typing import Optional

import networkx as nx


ROOT = pathlib.Path(__file__).parent.parent
PUBLIC = ROOT / "web" / "public"
GRAPH_FILE = ROOT / "graph.gpickle"
FULL_FILE = PUBLIC / "graph.json"
THREE_D_FILE = PUBLIC / "graph_3d.json"


def scalar_attributes(data: dict) -> dict:
    return {key: value for key, value in data.items()
            if isinstance(value, (str, int, float, bool))}


def load_previous_positions() -> dict:
    if not THREE_D_FILE.exists():
        return {}
    try:
        with THREE_D_FILE.open() as handle:
            graph = json.load(handle)
        return {
            node["id"]: (node["x"], node["y"], node["z"])
            for node in graph.get("nodes", [])
            if all(isinstance(node.get(axis), (int, float)) for axis in ("x", "y", "z"))
        }
    except (json.JSONDecodeError, OSError, KeyError):
        return {}


def serialise_graph(graph: nx.DiGraph, positions: Optional[dict] = None) -> dict:
    nodes = []
    for node_id, data in graph.nodes(data=True):
        node = {"id": node_id, **scalar_attributes(data)}
        if positions and node_id in positions:
            x, y, z = positions[node_id]
            node.update({"x": round(float(x), 2), "y": round(float(y), 2), "z": round(float(z), 2)})
        nodes.append(node)
    links = [
        {"source": source, "target": target, "rel": data.get("rel", "")}
        for source, target, data in graph.edges(data=True)
    ]
    return {"nodes": nodes, "links": links}


def build_positions(graph: nx.DiGraph) -> dict:
    """Refine the previous deterministic layout instead of laying out in JS.

    Browser-side physics is expensive at this graph size. A short, seeded,
    offline 3D spring pass retains the established spatial map while spreading
    nodes after graph data has changed.
    """
    prior = load_previous_positions()
    initial = {node: prior[node] for node in graph.nodes if node in prior}
    positions = nx.spring_layout(
        graph.to_undirected(),
        pos=initial or None,
        dim=3,
        iterations=25,
        k=0.08,
        seed=26107,
        scale=850,
    )
    return positions


def main() -> None:
    with GRAPH_FILE.open("rb") as handle:
        graph = pickle.load(handle)
    if not isinstance(graph, nx.DiGraph):
        graph = nx.DiGraph(graph)

    full = serialise_graph(graph)
    connected_nodes = [node for node, degree in graph.degree() if degree > 0]
    connected = graph.subgraph(connected_nodes).copy()
    positioned = serialise_graph(connected, build_positions(connected))

    FULL_FILE.write_text(json.dumps(full, ensure_ascii=False, separators=(",", ":")))
    THREE_D_FILE.write_text(json.dumps(positioned, ensure_ascii=False, separators=(",", ":")))
    print(f"full: {len(full['nodes'])} nodes, {len(full['links'])} links")
    print(f"3d: {len(positioned['nodes'])} nodes, {len(positioned['links'])} links")


if __name__ == "__main__":
    main()
