import sys
import pathlib

_ROOT = pathlib.Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from fastapi.testclient import TestClient
from api.main import app

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

client = TestClient(app)

tests = [
    ("hii", "conversational"),
    ("what can you do", "conversational"),
    ("asdkjhasd", "conversational"),
    ("123891723", "conversational"),
    ("Is BIS mandatory for 9W LED bulb?", "mandate"),
    ("IS 16102 standard", "recommend")
]

print("==================================================")
print(" Running FastAPI /chat Endpoint Gatekeeper Tests")
print("==================================================\n")

passed = 0
for query, expected_intent in tests:
    resp = client.post(f"/chat?q={query}")
    if resp.status_code != 200:
        print(f"[FAIL] Query '{query}' HTTP {resp.status_code}")
        continue
    data = resp.json()
    intent = data.get("intent")
    citations = data.get("citations", [])
    answer = data.get("answer", "")
    preview = answer.replace("\n", " ")[:110]

    ok = False
    if expected_intent == "conversational":
        # Must be conversational intent and 0 citations (no staplers!)
        ok = (intent == "conversational" or intent == "greeting") and len(citations) == 0
    else:
        # Compliance query should have citations or valid compliance intent
        ok = intent in ("mandate", "recommend")

    if ok:
        passed += 1
        print(f"[PASS] Query: '{query}'")
    else:
        print(f"[FAIL] Query: '{query}'")

    print(f"       Intent: {intent}, Citations: {len(citations)}")
    print(f"       Answer: {preview}...\n")

print(f"Total: {passed}/{len(tests)} tests passed.")
sys.exit(0 if passed == len(tests) else 1)
