"""Export browser-ready full and positioned knowledge-graph views.

Run after ``python api/graph_build.py`` whenever the curated datasets change.
The full export keeps the entire catalogue for search/reporting; the 3D export
contains every connected node and relationship, with deterministic coordinates
for instant browser rendering.
"""
import json
import math
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


def position_full_catalogue(graph: nx.DiGraph, connected_positions: dict) -> dict:
    """Position every catalogue record without browser-side simulation.

    Connected entities retain the offline spring layout. Standards with no
    sourced relationship are distributed across deterministic outer shells,
    making the full catalogue navigable instead of collapsing at (0, 0, 0).
    """
    positions = dict(connected_positions)
    isolates = sorted(node for node, degree in graph.degree() if degree == 0)
    golden_angle = math.pi * (3 - math.sqrt(5))
    shell_size = 7000

    for index, node_id in enumerate(isolates):
        within_shell = index % shell_size
        shell_count = min(shell_size, len(isolates) - (index // shell_size) * shell_size)
        radius = 1150 + (index // shell_size) * 220
        y = 1 - 2 * ((within_shell + 0.5) / shell_count)
        radial = math.sqrt(max(0, 1 - y * y))
        angle = golden_angle * within_shell
        positions[node_id] = (
            radius * math.cos(angle) * radial,
            radius * y,
            radius * math.sin(angle) * radial,
        )
    return positions


def main() -> None:
    with GRAPH_FILE.open("rb") as handle:
        graph = pickle.load(handle)
    if not isinstance(graph, nx.DiGraph):
        graph = nx.DiGraph(graph)

    connected_nodes = [node for node, degree in graph.degree() if degree > 0]
    connected = graph.subgraph(connected_nodes).copy()
    connected_positions = build_positions(connected)
    full = serialise_graph(graph, position_full_catalogue(graph, connected_positions))
    positioned = serialise_graph(connected, connected_positions)

    FULL_FILE.write_text(json.dumps(full, ensure_ascii=False, separators=(",", ":")))
    THREE_D_FILE.write_text(json.dumps(positioned, ensure_ascii=False, separators=(",", ":")))
    print(f"full: {len(full['nodes'])} nodes, {len(full['links'])} links")
    print(f"3d: {len(positioned['nodes'])} nodes, {len(positioned['links'])} links")


if __name__ == "__main__":
    main()
