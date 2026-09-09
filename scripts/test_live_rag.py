import sys
import os
import pathlib

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

_ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(_ROOT))

from api import main

test_queries = [
    "Do I need BIS certification for 9W LED bulb?",
    "What is the standard and hallmarking process for 22K gold jewellery?",
    "Which lab in Delhi tests plastic toys for children?",
    "What is the fee and timeline for FMCS certification?",
    "What is the airspeed velocity of an unladen swallow?"
]

print("=" * 70)
print("MANAK MITRA — END-TO-END RAG LIVE PIPELINE TEST")
print("=" * 70)

for q in test_queries:
    res = main.chat(q)
    print(f"\n[USER QUERY]: {q}")
    print(f"-> INTENT:    {res.get('intent')}")
    print(f"-> ABSTAINED: {res.get('abstained')}")
    print(f"-> ANSWER:    {res.get('answer')}")
    if res.get("citations"):
        cites = [f"{c.get('kind')}: {c.get('ref')}" for c in res.get("citations")[:2]]
        print(f"-> CITATIONS: {cites}")
    print("-" * 70)
