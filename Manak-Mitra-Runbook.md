# Manak Mitra — Execution Runbook

**Twenty steps, in order.**

*SIH 2026 · PS 26107 · Ministry of Consumer Affairs, Food & Public Distribution*

Start at step 1 and do not skip. Every step says what to install, what to collect,
what file to create, and how you know it worked before you move on.
Three days, five people, one working demo.

---

## How to use this

Each step has three parts: what to **do**, what to **create**, and a **checkpoint** —
a command whose output tells you the step is genuinely finished. If a checkpoint fails,
fix it there. A broken step 8 becomes an unfindable bug at step 15.

The badge on each step says who does it: `TRACK A–E` for a workstream, `HUMAN` for
work that is transcription and verification rather than code.

### Almost nothing here is a git clone

The full plan named ten repositories. In the demo build you *install* nine of them and
*scaffold* one. There is no forking, no patching, and no reading of anyone else's source.
The only code in the repository is yours.

### Who can start when

| Track | Day 1 | Day 2 | Day 3 |
|---|---|---|---|
| A · Data | 4, 5, 6, 8 | 11 | 18 |
| B · Retrieval | 7, 9, 10 | 12 | 20 |
| C · API | 2, 3 | 13, 16 | 19 |
| D · Front end | *stub API, start early* | 14, 15 | 18 |
| E · Channels | 1 | *wait for 13* | 17 |

Steps **2, 3 and 7** unblock everyone. Do them first, in that order, on the morning of day one.

---

# Phase 0 · Ground (Steps 1–3)

*Nothing here is the product. All of it prevents a day being lost later.*

## Step 01 — Accounts and installs `TRACK E`

Do the account registrations *first* — they have lead time that code does not.

```bash
# macOS. On Ubuntu swap brew for apt.
brew install python@3.11 node tesseract
curl -fsSL https://ollama.com/install.sh | sh   # or download the app
ollama pull qwen2.5:3b                          # ~2 GB, phrasing model
```

Then, in parallel, register for:

- **Bhashini** — `bhashini.gov.in`, register as a user and request ULCA API credentials.
  **Do this today.** It is the longest lead time in the project.
- **An LLM API key** for the ingestion step (step 8). Set it as `ANTHROPIC_API_KEY`.
- **A burner SIM** for the WhatsApp number. Not your own number.

> **CHECKPOINT** — `ollama run qwen2.5:3b "say hello"` prints text, and `tesseract --version` works.

## Step 02 — Repository skeleton `TRACK C`

```bash
mkdir manak-mitra && cd manak-mitra && git init
python3.11 -m venv .venv && source .venv/bin/activate
pip install fastapi "uvicorn[standard]" sentence-transformers numpy \
            pyyaml pypdf pytesseract python-multipart httpx anthropic pydantic
mkdir -p api data/raw/{qco,schemes,labs} data/curated eval web
```

Target layout — create the empty files now so nobody invents a different name:

```text
manak-mitra/
├── api/  store.py  ingest.py  search.py  answers.py
│        guard.py  lang.py  marks.py  main.py
├── data/raw/{qco,schemes,labs}/     # downloaded sources, committed
├── data/curated/  schemes.yaml  marks.yaml  standards.csv
├── eval/  golden40.jsonl  score.py
├── web/                             # step 14 scaffolds this
└── whatsapp.js   manak.db   vectors.npy   DEMO.md
```

> **CHECKPOINT** — `python -c "import sentence_transformers, fastapi, anthropic"` exits silently.

## Step 03 — Write DEMO.md before writing code `HUMAN`

Pin the demo now. Everything you build serves these six beats; anything that does not
is out of scope until they all work.

```text
# DEMO.md — the only spec that matters

Three demo products (every feature must work for all three):
  1. 9 W LED bulb           → CRS scheme, mandatory
  2. 22K gold ring          → Hallmarking / HUID
  3. Children's plastic toy → ISI scheme, mandatory

Six beats, in order:
  1. Knowledge graph on screen before we speak
  2. Ask in Hindi, by voice: "क्या मुझे LED बल्ब के लिए BIS चाहिए?"
  3. Generate the Compliance Passport → PDF on screen
  4. QR on the slide — a judge messages it from their own phone
  5. Ask something we cannot know → it refuses and gives the helpline
  6. Ministry dashboard — "and here is what this gives you"
```

> ⚠️ **NON-NEGOTIABLE** — Beat 5 is the one teams skip, and it is the one that separates you.
> Build the refusal path deliberately and rehearse it. A system that knows when to stop talking
> reads as engineering maturity; every competing bot will confidently invent an IS number when cornered.

> **CHECKPOINT** — `DEMO.md` is committed and all five people have read it.
> If two people describe the demo differently, you are not done with this step.

---

# Phase 1 · Data (Steps 4–8)

*The only genuinely hard part. Four of these five steps are collection and verification, not programming.*

## Step 04 — Collect the mandate data `HUMAN · TRACK A`

Do **not** start at e-Gazette. The practical sources are the product lists BIS already publishes:

| Source | What it gives |
|---|---|
| `crsbis.in` | The Compulsory Registration Scheme product list. Every product with its IS number, in a table. Your richest single source. |
| `bis.gov.in` → "Products under Compulsory Certification" | Scheme-wise ISI lists with IS numbers. |
| `egazette.gov.in` | Download the actual notification PDF for **your three demo products only**. Real gazette references make the citations real. |
| `pib.gov.in` | Search "QCO" for effective dates on newly notified orders. Feeds the deadline tracker. |

Save everything raw into `data/raw/qco/`. Keep the source URL and today's date in the
filename or a sidecar `sources.txt` — you will need both for citations.

> **NOTE — verify the paths.** Government sites reorganise without redirects. If a page named
> above has moved, search the site rather than assuming it is gone. Budget for this; do not let
> it surprise you at hour three.

> **CHECKPOINT** — `data/raw/qco/` holds at least one product-list file plus 3 gazette PDFs,
> and `sources.txt` records where each came from.

## Step 05 — Derive the standards list `HUMAN · TRACK A`

Do not crawl the standards portal. Instead, **build the catalogue out of the product lists you
already have**: every IS number that appears in a QCO or CRS listing goes into `standards.csv`.
This is a better subset than a random 500, because every standard in it is one a real user
might ask about.

Then pad to roughly 500 with well-known standards from the BIS catalogue in the same sectors.

```csv
is_number,title,ics_code,status,year,is_free,purchase_url
IS 16102 (Part 1),Self-ballasted LED lamps — Safety,29.140.99,ACTIVE,2012,false,https://...
```

> ⚠️ **THE ONE THING THAT MUST BE TRUE** — Every IS number in this file must be real.
> An invented standard number displayed on stage is unrecoverable. Have a second person
> spot-check thirty of them against the BIS catalogue before the file is committed.

> **CHECKPOINT** — `wc -l data/curated/standards.csv` is 300 or more, and thirty randomly
> picked IS numbers resolve on the BIS site.

## Step 06 — Collect labs and scheme pages `TRACK A`

Two more collections, both small:

- **Labs** — the BIS recognised-laboratory directory. Sixty rows is plenty. Save as
  `data/raw/labs/labs.csv` with name, city, state, and the product categories each covers.
- **Scheme pages** — save the ISI, CRS, FMCS and Hallmarking pages from `bis.gov.in` as HTML
  into `data/raw/schemes/`. These feed step 11.

Skip live geocoding entirely. Map city names to coordinates with a static dictionary of the
thirty cities that actually appear — five minutes, and it cannot fail on stage.

> **CHECKPOINT** — `labs.csv` has ≥50 rows with a city that appears in your coordinate
> dictionary, and four scheme pages are saved.

## Step 07 — store.py: schema first, and only this file talks to the database `TRACK B`

Write this before anything that reads data. It unblocks every other track, because they can
code against seeded rows immediately.

```python
# api/store.py
import sqlite3, json, pathlib
DB = pathlib.Path(__file__).parent.parent / "manak.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS qco (
  qco_id TEXT PRIMARY KEY, title TEXT, gazette_url TEXT,
  notified_on TEXT, retrieved_on TEXT);

CREATE TABLE IF NOT EXISTS qco_items (
  id INTEGER PRIMARY KEY, qco_id TEXT, product_desc TEXT,
  hsn_codes TEXT, is_number TEXT, scheme TEXT,
  effective_on TEXT, confidence REAL);

CREATE TABLE IF NOT EXISTS standards (
  is_number TEXT PRIMARY KEY, title TEXT, ics_code TEXT,
  status TEXT, year INTEGER, is_free INTEGER, purchase_url TEXT);

CREATE TABLE IF NOT EXISTS labs (
  lab_id TEXT PRIMARY KEY, name TEXT, city TEXT, state TEXT,
  lat REAL, lon REAL, categories TEXT);

CREATE TABLE IF NOT EXISTS query_log (
  id INTEGER PRIMARY KEY, ts TEXT, channel TEXT, language TEXT,
  intent TEXT, matched_is TEXT, top_score REAL, abstained INTEGER);
"""

def conn():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c

def init():
    with conn() as c: c.executescript(SCHEMA)

def mandate_for(term):
    """Product name or HSN code -> the QCO rows that cover it."""
    q = f"%{term.lower()}%"
    with conn() as c:
        return [dict(r) for r in c.execute("""
            SELECT i.*, q.title AS qco_title, q.gazette_url, q.retrieved_on
            FROM qco_items i JOIN qco q ON q.qco_id = i.qco_id
            WHERE lower(i.product_desc) LIKE ? OR i.hsn_codes LIKE ?
            ORDER BY i.confidence DESC""", (q, q))]

def log(**kw):
    with conn() as c:
        c.execute("INSERT INTO query_log (ts,channel,language,intent,matched_is,top_score,abstained)"
                  " VALUES (:ts,:channel,:language,:intent,:matched_is,:top_score,:abstained)", kw)
```

Then seed ten fake rows per table and commit. **Announce in the group chat that this is done** —
it is the signal every other track is waiting on.

> **CHECKPOINT** — `python -c "from api import store; store.init(); print(store.mandate_for('led'))"`
> returns your seeded row.

## Step 08 — ingest.py: let the model do the extraction `TRACK A`

This is the step that replaces five days of parser engineering. Read each PDF as plain text,
hand it to the model, get validated objects back.

```python
# api/ingest.py
from pydantic import BaseModel
from pypdf import PdfReader
import anthropic, store, datetime, glob

client = anthropic.Anthropic()

class Item(BaseModel):
    product_desc: str
    hsn_codes: list[str]
    is_number: str | None
    scheme: str | None          # ISI | CRS | FMCS | HALLMARK | ECOMARK
    effective_on: str | None    # YYYY-MM-DD

class Extraction(BaseModel):
    items: list[Item]

PROMPT = """Extract every product entry from this Quality Control Order.
One entry per product. Use null where the notification does not state a
value — do not guess, and do not invent an IS number.

{text}"""

def ingest_qco(path, qco_id, gazette_url):
    text = "\n".join(p.extract_text() or "" for p in PdfReader(path).pages)
    r = client.messages.parse(
        model="claude-opus-5",
        max_tokens=16000,
        messages=[{"role": "user", "content": PROMPT.format(text=text)}],
        output_format=Extraction,
    )
    today = datetime.date.today().isoformat()
    with store.conn() as c:
        c.execute("INSERT OR REPLACE INTO qco VALUES (?,?,?,?,?)",
                  (qco_id, path, gazette_url, None, today))
        for it in r.parsed_output.items:
            c.execute("INSERT INTO qco_items (qco_id,product_desc,hsn_codes,"
                      "is_number,scheme,effective_on,confidence) VALUES (?,?,?,?,?,?,?)",
                      (qco_id, it.product_desc, ",".join(it.hsn_codes),
                       it.is_number, it.scheme, it.effective_on, 1.0))
```

Load `standards.csv` and `labs.csv` in the same script with plain `csv.DictReader` — no model
needed for data that is already tabular.

> ⚠️ **THEN READ THE OUTPUT TABLE. THIS HOUR IS NOT OPTIONAL.**
>
> Run `sqlite3 manak.db "select product_desc, is_number, effective_on from qco_items"` and read it.
> You are looking for nulls, for dates in the wrong century, and for IS numbers that do not appear
> in `standards.csv`. Fix them by hand.
>
> A model may extract. A human is the last thing to touch any number a user could act on —
> a fee, a deadline, an IS number, a mandatory-or-not verdict.

> **CHECKPOINT** — `sqlite3 manak.db "select count(*) from qco_items"` returns 40 or more,
> and every `is_number` present also exists in `standards`.

---

# Phase 2 · Brain (Steps 9–13)

*Retrieval, the six answers, the guards, and the API surface everything else talks to.*

## Step 09 — Embed the catalogue `TRACK B`

```python
# api/embed_job.py — run once, commit the output
from sentence_transformers import SentenceTransformer
import numpy as np, store, json

M = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
with store.conn() as c:
    rows = [dict(r) for r in c.execute("SELECT is_number,title,ics_code FROM standards")]

vecs = M.encode([r["title"] for r in rows], normalize_embeddings=True)
np.save("vectors.npy", vecs)
json.dump(rows, open("vectors_meta.json", "w"))
```

The model is multilingual, so a Hindi query hits the same index with no translation step.
That is why this model and not an English-only one.

> **CHECKPOINT** — `vectors.npy` exists and `np.load("vectors.npy").shape` is roughly `(500, 384)`.

## Step 10 — search.py `TRACK B`

```python
# api/search.py
from sentence_transformers import SentenceTransformer
import numpy as np, json

M = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
V = np.load("vectors.npy")
META = json.load(open("vectors_meta.json"))

def find(query, k=5, ics_prefix=None):
    q = M.encode([query], normalize_embeddings=True)[0]
    scores = V @ q                       # cosine, both normalised
    idx = np.argsort(-scores)
    out = []
    for i in idx:
        m = META[i]
        if ics_prefix and not (m["ics_code"] or "").startswith(ics_prefix):
            continue
        out.append({**m, "score": float(scores[i])})
        if len(out) >= k: break
    return out
```

> **CHECKPOINT** — `find("LED bulb")` returns IS 16102 in the top three, and `find("एलईडी बल्ब")`
> returns something sensible. If the Hindi query fails, you loaded an English-only model.

## Step 11 — schemes.yaml: drafted by AI, verified by a person `TRACK A`

Feed each saved scheme page to the model and ask for a decision tree. Then verify every number yourself.

```yaml
# data/curated/schemes.yaml
CRS:
  name: Compulsory Registration Scheme
  applies_when: Product appears in the Electronics & IT Goods QCO
  steps:
    - id: 1
      title: Test at a BIS-recognised lab
      detail: Sample tested against the applicable IS
      duration_days: [15, 30]
    - id: 2
      title: Apply online on the CRS portal
      duration_days: [1, 2]
    - id: 3
      title: BIS grants registration and an R-number
      duration_days: [15, 20]
  fees:
    application: "...."
    source_url: https://crsbis.in/...
    retrieved_on: 2026-09-08     # rendered in the UI, always
```

> ⚠️ **VERIFY EVERY FEE AND EVERY DURATION AGAINST THE LIVE PAGE.**
> This is the one file where a wrong number is a real-world harm — an MSME could act on it.
> AI drafts the structure; a person confirms each figure and stamps the date.
> Budget one hour and do not compress it.

> **CHECKPOINT** — Four schemes present, and every `fees` block carries a `source_url` and a `retrieved_on`.

## Step 12 — answers.py: the six functions `TRACK B`

```python
# api/answers.py
import store, search, yaml, httpx

SCHEMES = yaml.safe_load(open("data/curated/schemes.yaml"))

def mandate(term):
    """NO MODEL IN THIS PATH. Pure SQL. Must never be wrong."""
    rows = store.mandate_for(term)
    if not rows:
        return {"mandatory": None, "citations": []}
    r = rows[0]
    return {"mandatory": True, "scheme": r["scheme"], "is_number": r["is_number"],
            "effective_on": r["effective_on"],
            "citations": [{"kind": "qco", "ref": r["qco_title"],
                           "url": r["gazette_url"], "retrieved_on": r["retrieved_on"]}]}

def recommend(description):
    hits = search.find(description, k=5)
    return {"hits": hits,
            "citations": [{"kind": "standard", "ref": h["is_number"]} for h in hits]}

def scheme(name):
    """Deterministic walk of the YAML. No generation over fees."""
    return SCHEMES.get(name.upper())

def phrase(facts, question):
    """Ollama turns retrieved facts into a sentence. It adds no facts."""
    p = (f"Answer using ONLY these facts: {facts}\n"
         f"Question: {question}\n"
         "Two sentences. Never state an IS number that is not in the facts.")
    r = httpx.post("http://localhost:11434/api/generate",
                   json={"model": "qwen2.5:3b", "prompt": p, "stream": False},
                   timeout=60)
    return r.json()["response"]
```

`labs()`, `passport()` and `graph()` follow the same shape. `passport()` calls the others rather
than reimplementing them — which is why it is quick to write and must be written last.

> **CHECKPOINT** — `mandate("LED bulb")` returns a citation with a real gazette URL,
> and `scheme("CRS")` returns steps with fees.

## Step 13 — guard.py and main.py: the API every channel uses `TRACK C`

```python
# api/guard.py — small file, entire trust story
import re
IS_PAT = re.compile(r"IS\s*\d{3,5}", re.I)
FLOOR = 0.35

def enforce(text, allowed_refs):
    """Delete any IS number the retrieval layer did not return."""
    ok = {r.replace(" ", "").upper() for r in allowed_refs}
    for m in set(IS_PAT.findall(text)):
        if m.replace(" ", "").upper() not in ok:
            text = text.replace(m, "[removed: unverified]")
    return text

def should_abstain(top_score):
    return top_score < FLOOR

REFUSAL = ("I can't answer this from official sources. "
           "Please contact the BIS helpline on 1800-11-4000, or see bis.gov.in.")
```

```python
# api/main.py
from fastapi import FastAPI
import answers, guard, store, datetime

app = FastAPI()

@app.post("/chat")
def chat(q: str, lang: str = "en", channel: str = "web"):
    intent = route(q)
    facts  = {"mandate": answers.mandate, "recommend": answers.recommend}[intent](q)
    hits   = facts.get("hits", [])
    top    = hits[0]["score"] if hits else (1.0 if facts.get("citations") else 0.0)

    if guard.should_abstain(top):
        store.log(ts=datetime.datetime.now().isoformat(), channel=channel, language=lang,
                  intent=intent, matched_is=None, top_score=top, abstained=1)
        return {"answer": guard.REFUSAL, "abstained": True, "citations": []}

    refs = [c["ref"] for c in facts["citations"]]
    text = guard.enforce(answers.phrase(facts, q), refs)
    store.log(ts=datetime.datetime.now().isoformat(), channel=channel, language=lang,
              intent=intent, matched_is=refs[0] if refs else None,
              top_score=top, abstained=0)
    return {"answer": text, "abstained": False,
            "citations": facts["citations"],
            "highlight_nodes": refs}
```

The router is forty lines of keyword rules. Resist anything larger — it is the entirety of
your orchestration and it is easier to defend than a framework.

> **CHECKPOINT** — `curl -X POST "localhost:8000/chat?q=is%20BIS%20needed%20for%20LED%20bulbs"`
> returns an answer with a non-empty `citations` array — and a nonsense question returns
> `abstained: true`.

---

# Phase 3 · Face (Steps 14–17)

*Everything a judge actually sees. All of it runs against the API from step 13 and contains no business logic.*

## Step 14 — Scaffold the web app `TRACK D`

The one thing you scaffold rather than install:

```bash
npm create vite@latest web -- --template react
cd web && npm install
npm i react-force-graph-2d leaflet react-leaflet
```

Build the chat panel first, against the live `/chat`. Render `citations` as visible chips under
every answer — the citations are the product, not a footnote.

> **CHECKPOINT** — Typing a question in the browser returns an answer with citation chips,
> and the refusal case renders differently from a normal answer.

## Step 15 — Graph, map and timeline `TRACK D`

Three views, all fed by endpoints that already exist:

- **Knowledge graph** — `react-force-graph-2d` over `/graph`. Colour nodes by ICS cluster.
  When an answer returns `highlight_nodes`, call `centerAt()` on that node and flash it.
  *This is demo beat 1 and beat 2's payoff.*
- **Lab map** — Leaflet over `/labs/near`, markers clustered by city.
- **Journey timeline** — a horizontal strip of the `scheme()` steps with durations.
  Plain CSS; no library.

> **NOTE — 500 nodes, not 20,000.** The graph is far easier at demo scale — no GPU renderer,
> no layout pre-computation, and it settles instantly. This is one place where the cut version
> is strictly better on stage.

> **CHECKPOINT** — Asking about an LED bulb visibly moves the graph to IS 16102.
> If it does not animate, the demo loses its best moment.

## Step 16 — The Compliance Passport `TRACK C`

Your money shot, and it is mostly assembly. `passport()` calls `mandate()`, `recommend()`,
`labs()` and `scheme()`, then renders one HTML page. No PDF library — `window.print()` with a
print stylesheet produces the file.

The page must carry: the verdict, the governing QCO with its gazette reference, the scheme,
the IS number with status and purchase link, required markings, three nearest labs, indicative
fee and timeline with their dates, and the next step as a deep link.

> **CHECKPOINT** — All three demo products produce a complete one-page dossier, and printing it
> yields a clean PDF with no clipped content.

## Step 17 — WhatsApp and voice `TRACK E`

```bash
npm i @whiskeysockets/baileys @hapi/boom qrcode-terminal
```

```javascript
// whatsapp.js — no logic, just transport
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");

async function main() {
  const { state, saveCreds } = await useMultiFileAuthState("wa-session");
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const q = m.message.conversation ?? "";
    const r = await fetch(`http://localhost:8000/chat?q=${encodeURIComponent(q)}&channel=whatsapp`,
                          { method: "POST" }).then(x => x.json());
    await sock.sendMessage(m.key.remoteJid, { text: r.answer });
  });
}
main();
```

**Voice** is browser-side and takes an hour: `webkitSpeechRecognition` with `lang="hi-IN"` for
input, `speechSynthesis` or Bhashini TTS for output. No pipecat, no audio pipeline.

> ⚠️ **PRE-LINK THE WHATSAPP SESSION AND LEAVE IT RUNNING.**
> Baileys is an unofficial client. Scan the QR the night before, keep the process alive, and
> record a fallback video of the interaction. A QR re-scan on stage is a dead minute you cannot recover.

> **CHECKPOINT** — A message from a phone that is not yours gets a cited reply, and a spoken
> Hindi question produces a spoken answer.

---

# Phase 4 · Proof (Steps 18–20)

*The parts that make it credible rather than merely working.*

## Step 18 — Mark analysis and the Ministry dashboard `TRACK A · D`

`marks.py`: Tesseract reads the photo, then regex against `marks.yaml` decides. Accept a typed
code as well, so the feature always demos even in bad light.

```yaml
# data/curated/marks.yaml — the grammar of a genuine mark
huid:        { length: 6, charset: "[0-9A-Z]" }
purity:      { valid: ["375","585","750","916","958","999"] }
isi_licence: { pattern: "^CM/L-[0-9]{7}$" }
crs_rnumber: { pattern: "^R-[0-9]{8}$" }
rules:
  - "A hallmark must show BIS logo + purity + HUID together"
  - "An ISI mark without an IS number beneath it is not valid"
```

> ⚠️ **NEVER CLAIM LIVE HUID VERIFICATION.**
> There is no public HUID API — resolution happens only inside the BIS CARE app, and a DoCA
> judge knows that. Say: "we read the mark, check its structure, and catch the counterfeits that
> fail structurally; for authoritative confirmation we hand off to BIS CARE."
> That is honest and still impressive.

The **dashboard** is four SQL queries over `query_log`: questions per day, top intents,
language split, and — the one that matters — **the unanswered questions**.

> **CHECKPOINT** — A photo of a hallmark returns a structural verdict with reasons, and the
> dashboard lists real abstained queries from your own testing.

## Step 19 — lang.py: Bhashini, with the fallback built first `TRACK C`

Write the interface and the fallback before touching Bhashini, so you are never blocked on a credential.

```python
# api/lang.py
def translate(text, src, tgt):
    if BHASHINI_KEY:
        sid = _service_id("translation", src, tgt)   # cached at start-up
        return _compute(sid, text)
    return text        # fallback: browser handles it, or pass through
```

Bhashini needs **two calls, always in this order**: a config call to `getModelsPipeline` to
obtain a `serviceId` for that task-and-language pair, then the inference call.
**Cache the serviceId per language at start-up** — doing discovery per request adds a full
round trip to every turn.

> **CHECKPOINT** — A Hindi question returns a Hindi answer with the citation intact —
> and it still works with the Bhashini key unset.

## Step 20 — Score it, then freeze `TRACK B · ALL`

Forty questions, with answers *you* wrote. AI-generated ground truth measures nothing.

```json
{"q": "Do I need BIS for a 9W LED bulb?", "expect_is": "IS 16102 (Part 1)", "expect_scheme": "CRS"}
{"q": "सोने की अंगूठी पर HUID क्या है?", "expect_intent": "consumer"}
{"q": "What is the airspeed of a swallow?", "expect_abstain": true}
```

Report four numbers on the slide: **accuracy@1**, **accuracy@3**, **citation correctness**,
and **abstention precision**. Fix the two worst failures, then stop tuning.

### Freeze checklist — the night before

- [ ] `manak.db` and `vectors.npy` committed. Nothing fetches from the network at demo time except Bhashini.
- [ ] WhatsApp session pre-linked and the process running.
- [ ] Ollama model pulled on the *demo laptop*, not just on a developer's.
- [ ] A fallback video recorded of all six beats.
- [ ] The six-beat demo rehearsed end to end three times, including the refusal.
- [ ] Git tag it. **No commits after the freeze.**

> **FINAL CHECKPOINT** — Clone the repo into a fresh directory, run `uvicorn main:app`, and
> complete all six beats without touching anything else. If that works, you are done.

---

## If you fall behind

Cut in this order, and cut early rather than half-finishing two things:

1. The Ministry dashboard (step 18b) — it is the closer, not the product
2. Browser voice (step 17b) — text Hindi still demonstrates multilingual
3. WhatsApp (step 17a) — painful to lose, but survivable
4. Mark OCR (step 18a) — keep the typed-code path, drop the camera

**Never cut:** step 8's verification hour, step 13's abstention path, step 16's Passport,
or the rehearsal in step 20. Those four are the difference between a demo that wins and a
demo that works.

---

*Execution runbook for the Manak Mitra demo cut. Twenty steps, nine files, three days.
Read alongside the demo-cut plan for the reasoning behind each simplification, and the
wiring map for what the production version would look like.*
