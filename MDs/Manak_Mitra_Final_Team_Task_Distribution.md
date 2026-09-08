# Manak Mitra — Final Team Task Distribution

Based on the **Manak Mitra Execution Runbook**, this division gives each person a clear ownership area while keeping dependencies between workstreams minimal.

## 1. Rudra — Backend, API, Guards & Core Integration

### Tasks
- Maintain the backend project structure and shared backend conventions.
- Own `api/store.py` and the database interface.
- Implement database initialization and seeded development data.
- Build and maintain `api/main.py`.
- Implement the API endpoints used by all channels.
- Integrate the answer/retrieval functions with the API.
- Implement `api/guard.py`.
- Implement IS-number validation and citation enforcement.
- Implement the abstention threshold and refusal response.
- Implement query logging.
- Integrate Ollama/Qwen with the backend for answer phrasing.
- Ensure generated answers only use retrieved facts.
- Integrate mandate, standards, scheme, lab and passport functions through the backend.
- Maintain the common API response structure.
- Perform final backend integration and debugging.
- Ensure the complete `/chat` flow works before final channel integration.

**Deliverable:** Stable FastAPI backend and backend integration.

---

## 2. Miya — Frontend, Routing, Language & Channels

### Frontend
- Scaffold the React + Vite application.
- Build the main chat interface.
- Connect the UI to `/chat`.
- Display citations under answers.
- Display abstention/refusal responses distinctly.
- Build the knowledge graph view.
- Build the laboratory map.
- Build the journey/procedure timeline.
- Connect `highlight_nodes` to graph animation/focus.
- Connect passport results/links to the UI.

### Routing & Language
- Implement the query routing layer.
- Classify incoming queries into the required intents.
- Connect intents to the appropriate backend functions.
- Implement the lightweight routing approach from the runbook.
- Implement the Bhashini/fallback language interface.
- Ensure Hindi questions can receive Hindi answers while preserving citations.
- Ensure the system works when Bhashini credentials are unavailable.

### WhatsApp
- Build `whatsapp.js`.
- Integrate Baileys.
- Maintain the WhatsApp authentication session.
- Forward incoming messages to `/chat`.
- Return backend answers to the user.
- Keep WhatsApp as a transport layer with no business logic.

### Browser Voice
- Implement Hindi voice input.
- Use browser speech recognition for the demo path.
- Implement spoken output using browser speech synthesis or Bhashini TTS.
- Ensure the Hindi voice demo works end-to-end.

**Deliverable:** Complete Web + Hindi interaction + WhatsApp + browser voice experience.

---

## 3. Shivaprasad — Standards Retrieval & Evaluation

### Tasks
- Prepare and validate `standards.csv`.
- Build `api/embed_job.py`.
- Generate embeddings for the standards catalogue.
- Maintain `vectors.npy` and `vectors_meta.json`.
- Build `api/search.py`.
- Implement cosine-similarity retrieval.
- Implement ICS-based filtering.
- Verify English and Hindi retrieval.
- Ensure the LED-bulb query retrieves the expected standard in the top results.
- Build the retrieval portion of `api/answers.py`.
- Implement standard recommendation/search responses.
- Prepare retrieval-related evaluation cases.
- Run the final evaluation.
- Report:
  - accuracy@1
  - accuracy@3
  - citation correctness
  - abstention precision
- Identify and fix the two worst retrieval failures.
- Own retrieval-related work during the final freeze.

**Deliverable:** Reliable standards retrieval and evaluation results.

---

## 4. Shinde — Mandate Data, QCO, HSN & Source Ingestion

### QCO / Mandate Data
- Collect QCO/product-list data.
- Collect the required gazette PDFs for the three demo products.
- Collect relevant PIB/QCO information for effective dates.
- Store raw QCO sources with source information.
- Build and maintain the QCO registry.
- Build `api/ingest.py`.
- Extract:
  - product description
  - HSN codes
  - IS number
  - scheme
  - effective date
- Load extracted data into the database.
- Inspect generated QCO output manually.
- Correct missing values, dates and invalid IS numbers.
- Ensure every extracted IS number exists in the standards catalogue.

### HSN / Supporting Data
- Maintain HSN mapping and product-name normalisation.
- Ensure product/HSN queries resolve correctly.
- Collect recognised laboratory data.
- Prepare `labs.csv`.
- Prepare the static city-coordinate mapping.
- Collect required BIS scheme pages and save them into the raw data directory.

**Deliverable:** Verified QCO/HSN data and required source datasets.

---

## 5. Jay — Schemes, Procedures, Mark Analysis & Compliance Passport

### Scheme Data
- Prepare `schemes.yaml`.
- Cover ISI, CRS, FMCS and Hallmarking.
- Convert scheme pages into structured decision trees.
- Define questions, branches, steps, fees and timelines.
- Verify every fee and duration against its source.
- Ensure every fee block contains `source_url` and `retrieved_on`.

### Procedure & Consumer
- Implement scheme lookup.
- Implement deterministic scheme decision-tree traversal.
- Implement laboratory lookup.
- Implement nearest-lab selection.
- Implement consumer/grievance routing where required.

### Mark Analysis
- Build `api/marks.py`.
- Integrate Tesseract/OCR.
- Build and maintain `marks.yaml`.
- Implement structural validation for HUID, purity codes, ISI licence numbers and CRS R-numbers.
- Support typed-code input as a fallback to camera/OCR input.
- Do not claim live HUID verification.

### Compliance Passport
- Implement passport generation.
- Compose:
  - mandate verdict
  - governing QCO
  - scheme
  - IS number
  - markings
  - nearest labs
  - indicative fee
  - timeline
  - next step
- Generate the one-page printable Compliance Passport.
- Verify all three demo products produce complete dossiers.

**Deliverable:** Procedure/mark-analysis layer and final Compliance Passport.

---

## 6. Shreya — SIH Presentation & Python Support

### SIH Presentation
- Rudra will provide an **AI-generated PPT containing the complete presentation content**.
- Transfer all relevant content from that AI-generated PPT into the **official SIH template PPT**.
- Ensure the final PPT follows the SIH template, layout and formatting requirements.
- Keep the final presentation ready for submission and judging.

### Python Development

Handle small, isolated Python tasks that can be developed independently and do not require advanced AI or backend knowledge.

- Build and maintain `eval/score.py`.
- Create a simple script to read `eval/golden40.jsonl` and calculate:
  - accuracy@1
  - accuracy@3
  - citation correctness
  - abstention precision
- Create small Python validation scripts for the curated data files.
- Validate that:
  - required CSV/YAML fields are present
  - IS numbers are not empty
  - IS numbers referenced by QCO data exist in `standards.csv`
  - scheme names use the allowed values
  - dates follow the expected format
- Create simple scripts to report missing or malformed records in the datasets.
- Help prepare and clean the golden evaluation questions.
- Run the evaluation scripts after changes and report the failing cases to the relevant owner.
- Create small utility scripts for formatting/converting data between simple CSV, JSON and YAML structures when required.
- Use AI/vibecoding to implement these scripts, with the responsibility of understanding and testing the generated code.



**Deliverable:** Final SIH-template PPT + Python evaluation/data-validation utilities.

# Critical Handoffs

- **Shinde → Shivaprasad:** Verified standards/QCO/source data.
- **Shinde → Rudra:** Populated data required for API responses.
- **Shivaprasad → Rudra:** Working standards retrieval/search functions and evaluation results.
- **Jay → Rudra:** Scheme, lab, mark-analysis and passport functions.
- **Rudra → Miya:** Stable API endpoints and response contract.
- **Rudra → Shreya:** AI-generated PPT content for transfer into the SIH template.
- **Miya → Team:** Integrated Web/WhatsApp/voice demo interface.

# Rules

1. Do not duplicate business logic in Web, WhatsApp or voice.
2. Use FastAPI as the integration boundary.
3. Use seeded data while development is in progress.
4. Never invent IS numbers, fees, deadlines or certification requirements.
5. The abstention/refusal path is mandatory.
6. Normal answers must retain citations.
7. Avoid network dependencies at demo time except explicitly required language services.
8. Freeze the system before the final demo and rehearse all six demo beats.

# Ownership Summary

| Person | Ownership | Final Deliverable |
|---|---|---|
| **Rudra** | Backend, API, guards, model integration | Stable backend |
| **Miya** | Frontend, routing, language, WhatsApp, browser voice | Complete user-facing demo |
| **Shivaprasad** | Standards retrieval & evaluation | Reliable standards search |
| **Shinde** | QCO, HSN & source data | Verified data foundation |
| **Jay** | Schemes, labs, marks & passport | Compliance intelligence + Passport |
| **Shreya** | SIH presentation | Final SIH-template PPT |
