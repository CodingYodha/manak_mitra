# SIH 2026 — PS 26107: AI-Powered Intelligent Assistant for Indian Standards & BIS Services
**Deep Research Brief** — Data sources, architecture, and open-source base repos

---

## 1. Reframing the Problem

Strip away the buzzwords and this PS is really **four sub-products wearing one chatbot UI**:

1. **Standards discovery** — "what IS number applies to my product?" (semantic search + classification over ~20,000 Indian Standards metadata)
2. **Scheme/process navigator** — certification schemes (ISI mark, CRS, FMCS, Hallmarking, ECO Mark), licensing steps, fees, timelines — this is mostly **structured procedural knowledge**, not deep retrieval
3. **Consumer-facing Q&A** — hallmarking (HUID), grievance redressal, how to verify a licence/genuine BIS mark, testing labs
4. **Multilingual conversational layer** on top of 1–3

Critically: **BIS does NOT give away the full text of Indian Standards for free.** They're sold commercially (via BSB Edge / e-Sale portal, ISO-style, since standards revenue funds BIS). This is the single biggest constraint on this project and most teams miss it until Day 2. Your data strategy has to work around it — see §3.

---

## 2. What's actually happening on the ground (BIS's real digital footprint)

| Surface | What it gives you | Free/scrapeable? |
|---|---|---|
| **bis.gov.in** | Static content: schemes, FAQs, Hallmarking rules, CRS/QCO explainer pages, press releases, Standard of the Week/Month, "Know Your Standard" tool | Yes — HTML/text, no license text |
| **standards.bis.gov.in** ("Know Your Standard" portal) | Search by IS number or keyword → returns **metadata**: title, ICS classification, technical committee, status (active/withdrawn/superseded), amendments, related standards | Metadata yes; **full PDF text is paid**, gated behind login/cart via BSB Edge |
| **e-Sale portal (standardsbis.in / BSB Edge)** | Commercial sale of IS/SP documents | No — paywalled, don't scrape |
| **CRS/QCO orders (Compulsory Registration/Quality Control Orders)** | Legally binding notifications listing which products need mandatory BIS certification, published on bis.gov.in and **e-Gazette (egazette.gov.in)** | Yes — these are government notifications, public domain |
| **BIS Care app / grievance portal** | Consumer complaint categories, licence verification (CM/L number lookup), ISI/hallmark authenticity check | Partial — app UI flows are public; use as reference for intents, not scraping |
| **Hallmarking data** | HUID scheme rules, list of Assaying & Hallmarking (A&H) centres, jewellers registered — published as PDFs/lists on bis.gov.in | Yes, structured lists |
| **Laboratory recognition list** | BIS-recognized testing labs by product category | Yes, published list (PDF/table) |
| **data.gov.in** | Search for "BIS", "hallmarking", "consumer affairs" datasets — sporadic but real datasets (e.g. licensee lists, QCO product lists) exist here in CSV | Yes, explicitly open data license |
| **PIB (pib.gov.in)** | Press releases on new QCOs, BIS policy changes — good for "recent updates" freshness | Yes |
| **archive.org** | A handful of specific IS documents (e.g., IT/telecom-related "legally binding" standards like IS 18003) have been uploaded under public-interest/right-to-know rationale — inconsistent coverage, don't rely on this as a systematic source | Case-by-case, legally grey for most standards |
| **National Building Code (NBC), some "free-of-cost" standards** | BIS explicitly lists select standards it releases free (see "Download Indigenous Indian Standards – Free of Cost" page) — a growing but limited set, often nation-building/infrastructure codes | Yes — this is your best source of *actual full standard text* for a working demo |

**Practical takeaway:** Build your knowledge base primarily from **metadata + scope/abstract + explainer/procedural content + QCO notifications + the officially free-of-cost standards list**, not from scraping paywalled PDFs. For the standards you can't get full text for, the assistant should retrieve title/scope/applicability/related-standards and **cite + link to the official purchase/download page** rather than fabricate clause text. This is also the legally defensible design — judges will specifically probe "where did you get the standard text from," and "we only index publicly released metadata and free standards, and link out for the rest" is the correct, fundable answer.

---

## 3. Multilingual layer — don't build this yourself

India already has a government-funded, free, open stack for exactly this:

- **Bhashini (bhashini.gov.in / MeitY)** — free REST APIs for ASR (speech-to-text), TTS, machine translation, and transliteration across 22 scheduled languages. Already powers UMANG, DigiLocker, CSCs. This is the "expected" multilingual backend for a Government of India SIH submission — using it (rather than Google Translate) is a strong bonus point with evaluators.
  - GitHub orgs: `github.com/bhashini-dibd` (ULCA — Universal Language Contribution APIs, data platform) and `github.com/ULCA-IN` (client SDKs: `anuvaad-client-sdk`, `language-transliteration`, `bhashadaan-chatbot` — a literal chatbot reference implementation)
- **AI4Bharat (IIT Madras)** — open-source IndicTrans2 (translation), IndicBERT, IndicASR/TTS models if you want to self-host instead of calling the Bhashini API (useful for offline/low-connectivity demo resilience).

Design pattern: keep your retrieval/knowledge base in English, translate the **user query in → Bhashini → English**, run RAG, translate the **answer out → Bhashini → user's language**. Much simpler than maintaining multilingual embeddings.

---

## 4. Suggested system architecture

```
User (web/app/WhatsApp) — query in any language
        │
   Bhashini ASR/Translation (if non-English or voice)
        │
   Intent Router (agent) ──┬─→ "Standard lookup / recommend" tool
                            ├─→ "Scheme/certification explainer" tool  
                            ├─→ "Licensing process" tool (step-by-step, structured, not RAG)
                            ├─→ "Hallmarking / HUID" tool
                            ├─→ "Lab locator" tool (structured DB lookup + geo)
                            └─→ "General FAQ / consumer grievance" tool
        │
   RAG layer: hybrid search (BM25 + embeddings) over curated corpus
   (IS metadata, scope/titles, QCOs, FAQs, free standards, scheme docs)
        │
   LLM generation WITH mandatory citation (IS number / clause / source URL)
   + confidence flag ("verify against official standard — link")
        │
   Bhashini translation back → response with sources
```

Key non-negotiables for judges: **every answer cites a source** (IS number, QCO gazette number, or BIS webpage URL), and the assistant explicitly says when it's giving *scope-level* guidance vs. pointing to a paid full standard.

---

## 5. Open-source base repos — what to actually fork/build on

Don't build a RAG pipeline from scratch; there is no need to reinvent retrieval, chunking, or citation UI. Best fits, roughly ranked for this use case:

| Repo | Why it fits |
|---|---|
| **`infiniflow/ragflow`** | Deep-doc parsing (handles PDFs/tables/scanned docs well — useful for QCO PDFs and scheme circulars), built-in citation grounding in the UI, agent/workflow builder for multi-intent routing (standards vs. schemes vs. hallmarking) out of the box |
| **`onyx-dot-app/onyx`** (formerly Danswer) | Enterprise-grade "chat over your own docs" with source citation, connectors for web/Confluence/etc. — good if you want to continuously ingest bis.gov.in pages and PIB releases as a live-updating index |
| **`deepset-ai/haystack`** | Most flexible Python RAG framework if your team wants custom pipelines (agent tools, structured + unstructured hybrid retrieval) rather than an off-the-shelf UI — good pick if you're also building the "recommend standard from product description" classifier as a custom component |
| **`Mintplex-Labs/anything-llm`** | Fastest to a working multi-tenant demo (workspace per domain: Standards / Certification / Hallmarking / Consumer), simple to self-host, supports multiple LLM backends including free/local models |
| **`weaviate/Verba`** | Clean reference implementation of citation-grounded RAG if you want to learn the pattern and reimplement custom, rather than adopt wholesale |
| **`ULCA-IN/bhashadaan-chatbot`** | Direct reference for wiring a chatbot to Bhashini APIs — reuse this glue code rather than reinventing the Bhashini integration |
| **`bhashini-dibd/ulca`, `ULCA-IN/anuvaad-client-sdk`** | Official SDKs/APIs for the translation layer described in §3 |

**Recommended combo for a SIH-timeline build:** `RAGFlow` or `AnythingLLM` for the retrieval+citation+admin backbone (fast, demoable), custom FastAPI agent layer on top for intent routing between "standards RAG" vs "structured scheme/process lookup" vs "hallmarking," and the Bhashini SDKs bolted on for the language layer. If your team is strong in Python and wants full control for judging on "technical depth," go Haystack instead of a pre-built UI tool.

---

## 6. Data pipeline you should actually build (in priority order)

1. **Structured "Know Your Standard" metadata scrape**: IS number, title, ICS code, technical committee, status, related/superseding standards — this is the backbone of "recommend applicable standard from product description."
2. **QCO/CRS product-to-mandatory-standard mapping** from egazette.gov.in + bis.gov.in QCO list — this answers "is my product's certification mandatory, and under which standard/scheme?" which is one of the most valuable and answerable parts of the PS.
3. **Scheme explainer knowledge base** (hand-curated from BIS FAQ pages): ISI mark process, Hallmarking (HUID) process, FMCS, product certification steps, fees, timelines — write these as clean Q&A/procedure docs yourself; don't rely on scraping messy nav-heavy HTML.
4. **Free-of-cost standards corpus** (the ones BIS explicitly releases in full) — your only source of genuine full-text clause-level RAG, good for demoing "source-backed, clause-referenced" answers convincingly.
5. **Lab recognition + A&H centre lists** — structured CSV/table → simple lookup tool (bonus: geo-filter by state).
6. **PIB feed for QCO/policy updates** — freshness signal so the assistant can say "as of [date], X standard was revised."

---

## 7. Things to flag explicitly in your presentation (judges will ask)

- **Copyright/IP handling**: how you avoid reproducing paywalled standard text, and how the assistant discloses this to users (this alone differentiates a naive team from a defensible solution).
- **Hallucination guardrails**: standard numbers and clause references must come from retrieval, never generated freeform — enforce with structured output/function-calling, not prompting alone.
- **Multilingual via Bhashini**, not a generic translation API — ties directly to Government of India's own digital public infrastructure, which SIH juries reward.
- **Update mechanism**: standards get revised/withdrawn; show a re-indexing/refresh pipeline, not a static one-time scrape.
- **Offline/low-bandwidth consideration** for MSMEs/rural users — mention WhatsApp/IVR channel via Bhashini ASR as a stretch goal.

---

## 8. Quick source list

- bis.gov.in — schemes, FAQs, free-standards list, hallmarking, training
- standards.bis.gov.in — "Know Your Standard" metadata search
- egazette.gov.in — QCO/CRS legal notifications
- data.gov.in — search "BIS", "hallmarking", "consumer affairs"
- pib.gov.in — BIS/DoCA press releases
- bhashini.gov.in, github.com/bhashini-dibd, github.com/ULCA-IN — multilingual stack
- github.com/AI4Bharat — IndicTrans2/IndicBERT if self-hosting translation
- github.com/infiniflow/ragflow, github.com/onyx-dot-app/onyx, github.com/deepset-ai/haystack, github.com/Mintplex-Labs/anything-llm, github.com/weaviate/Verba — RAG base frameworks
