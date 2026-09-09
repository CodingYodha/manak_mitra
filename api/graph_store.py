"""
graph_store.py — Cached in-memory loader.
Everyone imports this; the graph is loaded once and held in RAM.
"""
import pickle
import functools
import pathlib

ROOT = pathlib.Path(__file__).parent.parent
GRAPH_FILE = ROOT / "graph.gpickle"


@functools.lru_cache(maxsize=1)
def get():
    """Return the cached NetworkX graph. Raises FileNotFoundError if not built yet."""
    if not GRAPH_FILE.exists():
        raise FileNotFoundError(
            "graph.gpickle not found. Run: python api/graph_build.py"
        )
    with open(GRAPH_FILE, "rb") as f:
        return pickle.load(f)


def is_ready() -> bool:
    return GRAPH_FILE.exists()
