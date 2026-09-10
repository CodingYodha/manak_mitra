# Manak Mitra — Whole-System Architecture

This is the single-slide, executive view of the complete platform. It is
designed for a presentation: access sits on the left, product experiences and
the intelligence platform sit in the middle, and the trusted knowledge base is
on the right. It intentionally avoids a step-by-step user flow.

![Whole-system architecture](architecture-whole-system.svg)

The editable landscape canvas is available as
[architecture-whole-system.excalidraw](architecture-whole-system.excalidraw).

## Slide-ready whole-system view

```mermaid
flowchart TB
    classDef channel fill:#fff7ed,stroke:#ea580c,color:#7c2d12
    classDef experience fill:#eff6ff,stroke:#2563eb,color:#172554
    classDef service fill:#f0fdf4,stroke:#16a34a,color:#14532d
    classDef data fill:#f5f3ff,stroke:#7c3aed,color:#3b0764
    classDef external fill:#f8fafc,stroke:#64748b,color:#334155

    subgraph Channels[How people access Manak Mitra]
        Web[Web application<br/>English + Hindi + voice]:::channel
        WhatsApp[WhatsApp assistant<br/>optional channel]:::channel
    end

    subgraph Experiences[What people can do]
        AI[Ask the AI assistant<br/>standards, QCOs, schemes and labs]:::experience
        Journey[Plan a compliance journey<br/>product + city checklist]:::experience
        Passport[Create a compliance passport<br/>evidence-gated dossier]:::experience
        Mark[Verify a mark format<br/>HUID, ISI licence or CRS number]:::experience
        Schemes[Explore certification schemes<br/>steps, fees and timelines]:::experience
        Labs[Find testing labs<br/>directory + map + scope]:::experience
        Graph[Explore the standards graph<br/>products, standards, QCOs and labs]:::experience
        Analytics[View ministry analytics<br/>usage, coverage and abstentions]:::experience
    end

    subgraph Platform[Manak Mitra service layer]
        API[Compliance API<br/>one entry point for web and WhatsApp]:::service
        Router[Question routing and safety gate<br/>chooses the right evidence path<br/>or safely abstains]:::service
        Retrieval[Standards discovery<br/>searches the standards catalogue]:::service
        Compliance[Compliance services<br/>QCO, passport, scheme, lab and mark checks]:::service
        Knowledge[Knowledge graph service<br/>relationships and nearby labs]:::service
        Insights[Usage insights service<br/>aggregated, privacy-aware metrics]:::service
    end

    subgraph KnowledgeBase[Curated compliance knowledge]
        QCO[QCO and regulated-product records]:::data
        Standards[23,573 Indian Standards catalogue<br/>and semantic search index]:::data
        SchemeData[Certification scheme guidance<br/>fees, steps and decision trees]:::data
        LabData[BIS LIMS laboratory directory<br/>and verified scope mappings]:::data
        MarkRules[Mark-format rules<br/>HUID, ISI and CRS]:::data
        GraphData[Product–standard–QCO–lab graph]:::data
        Metrics[De-identified query and outcome metrics]:::data
    end

    subgraph OfficialSources[Source and verification destinations]
        Gazette[e-Gazette / notified QCO sources]:::external
        BIS[BIS, standards catalogue and LIMS]:::external
        MarkPortal[BIS CARE / official mark lookup]:::external
        Bhashini[Bhashini language service<br/>when configured]:::external
    end

    Web --> Experiences
    WhatsApp --> API
    Experiences --> API
    API --> Router
    Router --> Retrieval
    Router --> Compliance
    Router --> Knowledge
    API --> Insights

    Retrieval --> Standards
    Compliance --> QCO
    Compliance --> SchemeData
    Compliance --> LabData
    Compliance --> MarkRules
    Knowledge --> GraphData
    Insights --> Metrics

    QCO -.source links.-> Gazette
    Standards -.source links.-> BIS
    LabData -.verify live scope.-> BIS
    MarkRules -.handoff.-> MarkPortal
    Web -.optional translation.-> Bhashini
```

## Slide message

**Manak Mitra turns trusted BIS compliance knowledge into one bilingual
experience for citizens, businesses, labs and ministries—across answers,
compliance actions and decision-support analytics.**

## Presentational boundary

A catalogue match is **discovery**, not an automatic legal conclusion. A
Compliance Passport is evidence-gated, and mark verification checks format
before directing users to the official registry for live confirmation.
