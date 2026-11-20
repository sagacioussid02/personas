# Charter v1 — Twin

## Goal

Twin is an AI persona / digital twin platform that enables users to create, configure, and interact with persistent AI representations of themselves or defined personas — capturing voice, style, knowledge, and behavior so that the twin can respond on their behalf or serve as an interactive stand-in.

## Non-goals

- **Not a general-purpose chatbot or LLM wrapper.** Twin is not building yet another generic AI assistant; the core value is persona fidelity and persistence, not raw model capability.
- **Not a social media or content-publishing platform.** Twin does not aim to distribute or broadcast persona output to audiences; it is infrastructure for persona definition and interaction, not a consumer social product.
- **Not a real-time voice/video avatar system (at launch).** Lip-sync, deepfake video, or live voice cloning are out of scope unless explicitly added to the roadmap.
- **Not a data-harvesting or surveillance product.** Twin will not aggregate user data for sale or third-party profiling; persona data exists solely to power the user's own twin.

## Success Metrics

1. **Persona Consistency Score**  
   A defined evaluation (e.g., blind A/B test or automated embedding similarity) shows that twin responses match the configured persona's style and knowledge at a measurable threshold.  
   **Target:** ≥ 80% rater agreement or cosine similarity ≥ 0.85 on held-out prompts.  
   **Status:** Assumed threshold — operator must confirm.

2. **Time-to-First-Twin**  
   A new user can configure a functional persona and receive their first on-persona response within a defined time window of signup.  
   **Target:** ≤ 10 minutes.  
   **Status:** Assumed 10-minute target — operator must confirm acceptable onboarding time.

3. **Retention / Active Twin Rate**  
   Percentage of created twins queried at least once per week at a specified window post-creation, indicating ongoing utility rather than one-time curiosity.  
   **Target:** At least 60% of created twins.  
   **Window:** 30 days post-creation.  
   **Status:** Assumed 60% threshold and 30-day window — operator must confirm.

4. **Persona Coverage Breadth**  
   Each twin can accurately answer questions across distinct topic domains seeded during configuration, measurable via a standard topic-coverage evaluation suite.  
   **Target:** N distinct topic domains (operator must define N and the eval suite).  
   **Status:** Operator must define N and provide the evaluation suite.

5. **End-to-End Response Latency (p95)**  
   Response time for a twin query in text interactions.  
   **Target:** ≤ 3 seconds.  
   **Scope:** Text interactions at launch.

## Constraints

### Persona Data Privacy & Isolation

Each user's persona data must be strictly tenant-isolated with:
- Separate vector store namespaces per twin/user
- AES-256 encryption at rest
- Complete verifiable data deletion (GDPR/CCPA readiness from day one)

### LLM Provider Abstraction

The system must not be hard-coupled to a single LLM provider. All LLM calls go through an internal abstraction layer (`LLMClient` interface). No direct SDK calls scattered across business logic.

### Persona Consistency as a First-Class Concern

Offline evaluation pipelines must be supported from the start. Every persona configuration change must be testable against a held-out prompt suite before it affects live twin behavior. Evaluation harness must be part of the repo.

### Stateless API Layer, Stateful Persona Store

The API/application tier must be horizontally scalable and stateless. All persona state lives in dedicated persistence layers (vector DB + relational DB), never in application memory or local disk.

### Text-First, Modality-Agnostic Interface Contract

All persona interaction APIs must be designed around a modality-agnostic message schema from day one (e.g., `{ role, content, content_type, metadata }`). The contract must not bake in text-only assumptions.

### Dependency Hygiene

- No dependency may be added without a corresponding Decision Record entry.
- All third-party packages must have an OSI-approved license.
- Lock files are committed and CI enforces reproducible builds.

### Secret Management

Secrets are:
- Never hardcoded
- Never in committed `.env` files
- Never logged
- Always injected via environment variables sourced from a secrets manager (e.g., AWS Secrets Manager, Vault)

### CI Must Stay Green

`main` is always releasable. No PR merges unless:
- All automated tests pass
- Linting/type-checking passes
- No new high/critical CVEs are introduced
- At least one peer agent review is approved

### Observability from Sprint 0

Structured logging (JSON), distributed tracing (OpenTelemetry), and key metrics (request latency, persona retrieval hit rate, LLM error rate) must be instrumented before any feature is considered done.

## Risky Areas (Never Auto-Approved)

### 🔴 CRITICAL

- **`infra/**`** — Cloud infrastructure definitions (IaC). Wrong change = data loss, outage, runaway cost.
- **`**/migrations/`** — Database schema migrations are irreversible in production; a bad migration can corrupt all persona data.
- **`**/auth/`** — Authentication and authorization logic. Flaw = full account takeover or cross-tenant data leak.
- **`.github/workflows/`** — CI/CD pipeline config. Compromise here = supply chain attack vector.
- **`**/secrets/`** — Any secrets configuration, rotation scripts, or vault policy files.
- **`**/billing/`** — Billing integration and metering logic. Flaw = revenue loss or customer overcharge.

### 🟠 HIGH

- **`**/persona/store/`** — Core persona persistence layer — bugs here corrupt the primary product asset.
- **`**/persona/eval/`** — Evaluation harness — changes here can silently invalidate our consistency metrics.
- **`**/llm/client/`** — LLM abstraction layer — changes affect every twin interaction system-wide.
- **`**/api/routes/`** — Public API surface — breaking changes affect all integrators and clients.
- **`docker-compose*.yml`, `Dockerfile*`** — Container definitions affect reproducibility and production parity.
- **`**/config/production*`** — Production configuration files — wrong value = silent misbehavior at scale.

## Assumptions (Operator Confirmation Required)

| Item | Assumption | Status |
|------|-----------|--------|
| Interaction Modality | Text-first at launch. Description says 'AI persona' but does not specify text/voice/video. | Awaiting operator confirmation |
| Data Source | Persona data source is user-provided input (writing samples, Q&A, documents). No data ingestion method specified. | Awaiting operator confirmation |
| Target User | Individual professionals or creators. 'Digital twin' could mean enterprise/B2B or consumer. | Awaiting operator confirmation |
| Hosting/Deployment | Cloud SaaS. No infra details given in brief. | Awaiting operator confirmation |
| Persona Consistency Threshold | ≥ 80% rater agreement or cosine similarity ≥ 0.85 on held-out prompts. | Awaiting operator confirmation |
| Time-to-First-Twin Target | ≤ 10 minutes onboarding time. | Awaiting operator confirmation |
| Active Twin Retention | 60% of created twins queried at least once per week at 30 days post-creation. | Awaiting operator confirmation |
| Persona Coverage Breadth | Uses 'N distinct topic domains' — operator must define N and the eval suite. | Awaiting operator definition |

---

**Effective Date:** [Operator confirmation required]  
**Last Updated:** 2026-01-01  
**Maintained By:** Twin Engineering Team
