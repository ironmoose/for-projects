#!/usr/bin/env bash
# simulate-traffic.sh — exercise the full API surface for WebSocket traffic testing
# Creates realistic project management data with high-quality markdown content
set -euo pipefail

# ─── Options ───────────────────────────────────────────────────────────────────

DELAY=1  # seconds between requests; override with -d/--delay flag
BASE="http://localhost:3000"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--delay) DELAY="$2"; shift 2 ;;
    *)          BASE="$1";  shift   ;;
  esac
done

API="$BASE/api"
COUNT=0

# ─── Helpers ───────────────────────────────────────────────────────────────────

pause() { sleep "$DELAY"; }
post()  { COUNT=$((COUNT+1)); pause; curl -sf -X POST  -H 'Content-Type: application/json' -d "$2" "$1"; }
patch() { COUNT=$((COUNT+1)); pause; curl -sf -X PATCH -H 'Content-Type: application/json' -d "$2" "$1"; }
get()   { COUNT=$((COUNT+1)); pause; curl -sf "$1"; }
jid()   { echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

section() { echo ""; echo "━━━ $1 ━━━"; }

# ─── Health Check ──────────────────────────────────────────────────────────────

section "Health Check"
get "$API/health" > /dev/null
echo "  ✓ GET /api/health"

# ─── Create Actions (goal/design/requirements/implementation/validation) ──────
# Actions must exist before they can be linked to projects and tasks.

section "Creating Actions — Project 1: AI-Powered Code Review Platform"

A_P1_GOAL=$(post "$API/actions" '{
  "prompt": "## Goal Definition\n\nDefine the north-star goal for the AI-Powered Code Review Platform.\n\n### Context\n\nEngineering teams waste 30-40% of code review time on mechanical checks — style violations, missing null guards, inconsistent naming. Meanwhile, the high-value feedback (architecture concerns, subtle bugs, security implications) gets buried or skipped because reviewers are fatigued.\n\n### Deliverable\n\nA clear, measurable goal statement that:\n- Identifies the specific pain point we are solving\n- Defines success metrics (cycle time reduction, defect escape rate)\n- Establishes non-goals to prevent scope creep\n- Sets a 6-month milestone that proves or disproves the thesis",
  "agent": "research"
}')
A_P1_GOAL_ID=$(jid "$A_P1_GOAL")
echo "  ✓ Action (P1 goal): $A_P1_GOAL_ID"

A_P1_DESIGN=$(post "$API/actions" '{
  "prompt": "## System Design\n\nArchitect the core review engine for the AI-Powered Code Review Platform.\n\n### Requirements\n\n1. **Diff ingestion** — Parse unified diffs from GitHub/GitLab webhooks, supporting mono-repos up to 500 changed files per PR\n2. **Context window management** — Build semantic context from the surrounding codebase (imports, type definitions, recent changes to touched files) without exceeding model token limits\n3. **Review generation** — Produce line-level comments categorized as: `critical`, `suggestion`, `nitpick`, `question`\n4. **Feedback loop** — Track which AI comments developers accept, dismiss, or modify to build a per-repo quality signal\n\n### Constraints\n\n- P95 latency under 45 seconds for PRs with ≤50 changed files\n- Must operate on-prem for enterprises with air-gapped environments\n- No training on customer code — inference only, with retrieval augmentation",
  "agent": "design"
}')
A_P1_DESIGN_ID=$(jid "$A_P1_DESIGN")
echo "  ✓ Action (P1 design): $A_P1_DESIGN_ID"

A_P1_REQS=$(post "$API/actions" '{
  "prompt": "## Requirements Specification\n\nDocument the functional and non-functional requirements for v1.0 of the Code Review Platform.\n\n### Functional Requirements\n\n| ID | Requirement | Priority | Acceptance Criteria |\n|----|------------|----------|--------------------|\n| FR-01 | Ingest GitHub PR webhooks | P0 | Receives `pull_request.opened` and `pull_request.synchronize` events, parses diff within 5s |\n| FR-02 | Generate line-level review comments | P0 | Produces ≥1 comment per PR with severity classification |\n| FR-03 | Post comments back to GitHub | P0 | Comments appear as a review on the PR within 60s of webhook receipt |\n| FR-04 | Support `.reviewignore` file | P1 | Respects glob patterns for files/directories to skip |\n| FR-05 | Dashboard showing review acceptance rate | P1 | Displays per-repo and per-reviewer metrics with 7/30/90 day windows |\n\n### Non-Functional Requirements\n\n- **Availability**: 99.9% uptime (8.7h downtime/year)\n- **Scalability**: Handle 10,000 PRs/day per tenant\n- **Security**: SOC 2 Type II compliant, no customer code persisted beyond processing window\n- **Observability**: Structured logging, distributed tracing, latency histograms per pipeline stage",
  "agent": "research"
}')
A_P1_REQS_ID=$(jid "$A_P1_REQS")
echo "  ✓ Action (P1 requirements): $A_P1_REQS_ID"

section "Creating Actions — Project 2: Real-Time Collaboration Engine"

A_P2_GOAL=$(post "$API/actions" '{
  "prompt": "## Goal Definition\n\nDefine the product goal for the Real-Time Collaboration Engine.\n\n### Problem Statement\n\nExisting collaborative editing solutions (Google Docs, Notion) work well for documents but fail catastrophically for structured data — spreadsheets with formulas, kanban boards with automations, database views with filters. The moment two users edit conflicting cells or move the same card, the UX degrades to \"last write wins\" or produces confusing ghost states.\n\n### Thesis\n\nA CRDT-based collaboration engine, purpose-built for structured and semi-structured data, can deliver Google-Docs-level real-time editing for any data type — with mathematically guaranteed conflict resolution.\n\n### Success Criteria\n\n- Merge conflicts resolved automatically in 100% of cases (no manual resolution dialogs)\n- Cursor presence and edits visible to collaborators within 100ms on same-region connections\n- SDK adoption by ≥3 internal product teams within 6 months",
  "agent": "research"
}')
A_P2_GOAL_ID=$(jid "$A_P2_GOAL")
echo "  ✓ Action (P2 goal): $A_P2_GOAL_ID"

A_P2_DESIGN=$(post "$API/actions" '{
  "prompt": "## Architecture Design\n\nDesign the distributed systems architecture for the Real-Time Collaboration Engine.\n\n### Core Components\n\n```\n┌─────────────┐     ┌──────────────┐     ┌─────────────────┐\n│   Client SDK │────▶│  WebSocket   │────▶│  CRDT Engine    │\n│  (JS/Swift/  │◀────│  Gateway     │◀────│  (Automerge)    │\n│   Kotlin)    │     │  (Cloudflare │     │                 │\n│              │     │   Workers)   │     │  Merge + Persist│\n└─────────────┘     └──────────────┘     └────────┬────────┘\n                                                   │\n                                          ┌────────▼────────┐\n                                          │  Document Store  │\n                                          │  (FoundationDB)  │\n                                          └─────────────────┘\n```\n\n### Key Decisions\n\n1. **Automerge over Yjs** — Better support for nested maps/lists which structured data requires. Yjs wins on text, but we are not building a text editor.\n2. **Cloudflare Workers for WebSocket** — Durable Objects give us extractly-once routing to the authoritative CRDT doc. No coordination layer needed.\n3. **FoundationDB for persistence** — Serializable transactions for snapshot writes. CRDT merge is commutative so we only snapshot periodically, not on every op.\n\n### Latency Budget\n\n| Segment | Target | Notes |\n|---------|--------|-------|\n| Client → Gateway | 20ms | Edge-routed, same region |\n| Gateway → CRDT merge | 5ms | In-memory, Durable Object co-located |\n| Broadcast to peers | 15ms | Fan-out via WebSocket |\n| **Total (same region)** | **40ms** | Well under 100ms target |",
  "agent": "design"
}')
A_P2_DESIGN_ID=$(jid "$A_P2_DESIGN")
echo "  ✓ Action (P2 design): $A_P2_DESIGN_ID"

A_P2_REQS=$(post "$API/actions" '{
  "prompt": "## Requirements Document\n\nCapture the full requirements for the Real-Time Collaboration Engine SDK.\n\n### SDK API Surface\n\n```typescript\ninterface CollabEngine {\n  connect(docId: string, token: string): CollabSession;\n}\n\ninterface CollabSession {\n  readonly state: ReadonlySignal<DocState>;\n  readonly peers: ReadonlySignal<Peer[]>;\n  readonly status: ReadonlySignal<\"connecting\" | \"connected\" | \"reconnecting\" | \"disconnected\">;\n\n  apply(changeFn: (doc: Mutable<DocState>) => void): void;\n  subscribe(path: string, cb: (value: unknown) => void): Unsubscribe;\n  disconnect(): void;\n}\n```\n\n### Protocol Requirements\n\n- **Reconnection**: Exponential backoff with jitter, 1s → 30s max. Resume from last known vector clock — no full re-sync.\n- **Offline support**: Queue local ops in IndexedDB. Merge on reconnect. Cap offline queue at 10MB; surface warning at 8MB.\n- **Auth**: Short-lived JWTs (15 min). Refresh transparently. Revocation checked on WebSocket upgrade only (acceptable tradeoff for latency).\n\n### Compatibility Matrix\n\n| Platform | Min Version | Bundle Size Target |\n|----------|-------------|-------------------|\n| Chrome/Edge | 90+ | ≤45KB gzipped |\n| Safari | 15+ | ≤45KB gzipped |\n| Firefox | 95+ | ≤45KB gzipped |\n| React Native | 0.72+ | ≤60KB |\n| Swift (iOS) | iOS 16+ | ≤200KB |",
  "agent": "research"
}')
A_P2_REQS_ID=$(jid "$A_P2_REQS")
echo "  ✓ Action (P2 requirements): $A_P2_REQS_ID"

section "Creating Actions — Project 3: Observability Pipeline Overhaul"

A_P3_GOAL=$(post "$API/actions" '{
  "prompt": "## Goal Definition\n\nDefine the goal for the Observability Pipeline Overhaul.\n\n### Current State\n\nWe run three separate observability stacks:\n- **Metrics**: Prometheus + Thanos (self-hosted, 14-day retention)\n- **Logs**: ELK stack (self-hosted, 7-day retention, frequently OOMs)\n- **Traces**: Jaeger (self-hosted, 3-day retention, sampling at 1%)\n\nTotal cost: ~$48K/month in compute. Mean time to correlate across signals during an incident: 12 minutes. Engineers routinely context-switch between 3 UIs, mentally joining data that should be joined for them.\n\n### Target State\n\nA unified pipeline built on OpenTelemetry that:\n1. Ingests all three signals through a single collector fleet\n2. Correlates traces ↔ logs ↔ metrics via shared resource attributes and trace IDs\n3. Reduces total observability compute cost by 40%\n4. Cuts mean-time-to-correlate from 12 minutes to under 2 minutes\n\n### Anti-Goals\n\n- We are NOT replacing Grafana as the visualization layer\n- We are NOT building a custom storage backend — we will use managed services (Grafana Cloud or similar)\n- We are NOT instrumenting application code in this phase — only pipeline infrastructure",
  "agent": "research"
}')
A_P3_GOAL_ID=$(jid "$A_P3_GOAL")
echo "  ✓ Action (P3 goal): $A_P3_GOAL_ID"

A_P3_DESIGN=$(post "$API/actions" '{
  "prompt": "## Pipeline Architecture\n\nDesign the OpenTelemetry-based observability pipeline.\n\n### Collector Topology\n\n```\n                    ┌─────────────────────────┐\n  App Pods ────────▶│  OTel Collector (Agent)  │──── per node, DaemonSet\n                    │  - Batch processor       │\n                    │  - Resource detection     │\n                    │  - K8s attributes         │\n                    └───────────┬──────────────┘\n                                │\n                    ┌───────────▼──────────────┐\n                    │  OTel Collector (Gateway) │──── 3 replicas, HPA\n                    │  - Tail sampling          │\n                    │  - Metrics aggregation    │\n                    │  - Log parsing/transform  │\n                    │  - Export routing         │\n                    └───┬───────┬──────────┬───┘\n                        │       │          │\n                   ┌────▼──┐ ┌──▼────┐ ┌───▼────┐\n                   │Metrics│ │ Logs  │ │ Traces │\n                   │(Mimir)│ │(Loki) │ │(Tempo) │\n                   └───────┘ └───────┘ └────────┘\n```\n\n### Tail Sampling Strategy\n\nReplace head-based 1% sampling with tail sampling:\n- **Always keep**: Traces with error status, traces with latency > P99, traces touching critical paths (checkout, auth)\n- **Probabilistic**: 10% of remaining traces (10x improvement over current 1%)\n- **Expected volume reduction**: 60% fewer stored spans vs keeping everything, while capturing 100% of interesting traces\n\n### Migration Plan\n\n1. **Week 1-2**: Deploy OTel collector agents alongside existing exporters (dual-write)\n2. **Week 3-4**: Validate parity — compare OTel-routed data against legacy pipeline\n3. **Week 5**: Cut over metrics (lowest risk, easiest to validate)\n4. **Week 6**: Cut over traces (highest value, tail sampling enables immediately)\n5. **Week 7-8**: Cut over logs (highest volume, most complex parsing rules to migrate)",
  "agent": "design"
}')
A_P3_DESIGN_ID=$(jid "$A_P3_DESIGN")
echo "  ✓ Action (P3 design): $A_P3_DESIGN_ID"

A_P3_REQS=$(post "$API/actions" '{
  "prompt": "## Requirements\n\nCapture requirements for the Observability Pipeline Overhaul.\n\n### Functional Requirements\n\n| ID | Requirement | Priority |\n|----|------------|----------|\n| OBS-01 | Ingest OTLP/gRPC and OTLP/HTTP from all application pods | P0 |\n| OBS-02 | Enrich all signals with k8s metadata (namespace, pod, node, deployment) | P0 |\n| OBS-03 | Tail-sample traces: keep 100% of errors + high-latency, 10% probabilistic | P0 |\n| OBS-04 | Parse unstructured logs into structured events using OTel transform processor | P1 |\n| OBS-05 | Generate span metrics (RED metrics derived from traces) to reduce custom instrumentation | P1 |\n| OBS-06 | Support multi-tenant routing (dev/staging/prod to separate backends) | P2 |\n\n### Capacity Planning\n\n| Signal | Current Volume | Projected After Migration |\n|--------|---------------|-------------------------|\n| Metrics | 2.1M active series | 2.1M (no change) |\n| Logs | 850GB/day | 600GB/day (after parsing dedup) |\n| Traces | 12M spans/day (1% sampled) | 180M spans/day ingested → 25M stored (tail sampled) |\n\n### Rollback Criteria\n\n- If >0.1% data loss detected in any signal during dual-write phase, halt migration\n- If P99 collector latency exceeds 500ms for >5 minutes, auto-rollback via feature flag\n- Legacy pipeline remains warm (receiving data) for 2 weeks post-cutover",
  "agent": "research"
}')
A_P3_REQS_ID=$(jid "$A_P3_REQS")
echo "  ✓ Action (P3 requirements): $A_P3_REQS_ID"

section "Creating Actions — Project 4: Developer Portal & API Gateway"

A_P4_GOAL=$(post "$API/actions" '{
  "prompt": "## Goal Definition\n\nDefine the goal for the internal Developer Portal and API Gateway consolidation.\n\n### Problem\n\nWe have 47 internal microservices. Each team manages their own API documentation (or does not document at all). There is no central registry, no consistent authentication pattern, and no way to discover what APIs exist without asking in Slack. New engineers spend their first 2 weeks just figuring out what services exist and how to call them.\n\n### Goal\n\nBuild a self-service developer portal backed by a unified API gateway that:\n- Auto-discovers services via OpenAPI specs in each repo\n- Provides a single authentication and authorization layer (OAuth2 + RBAC)\n- Offers a \"try it\" playground for every endpoint\n- Tracks API usage, latency, and error rates per consumer\n\n### Success Metrics\n\n- 100% of internal APIs registered within 3 months of launch\n- New engineer onboarding time reduced from 2 weeks to 2 days (measured via onboarding survey)\n- Zero direct service-to-service auth implementations — all traffic routed through gateway",
  "agent": "research"
}')
A_P4_GOAL_ID=$(jid "$A_P4_GOAL")
echo "  ✓ Action (P4 goal): $A_P4_GOAL_ID"

A_P4_DESIGN=$(post "$API/actions" '{
  "prompt": "## Architecture Design\n\nDesign the Developer Portal and API Gateway.\n\n### Component Overview\n\n```\n┌──────────────────────────────────────────────────────┐\n│                  Developer Portal (React)             │\n│  ┌──────────┐  ┌───────────┐  ┌────────────────────┐ │\n│  │ API Docs  │  │ Playground │  │ Usage Dashboard   │ │\n│  │ (Redoc)   │  │ (Monaco)   │  │ (Recharts)        │ │\n│  └──────────┘  └───────────┘  └────────────────────┘ │\n└───────────────────────┬──────────────────────────────┘\n                        │\n┌───────────────────────▼──────────────────────────────┐\n│                  API Gateway (Envoy)                   │\n│  - JWT validation          - Rate limiting             │\n│  - Request routing          - Circuit breaking          │\n│  - Access logging           - Request transformation    │\n└───────────────────────┬──────────────────────────────┘\n                        │\n         ┌──────────────┼──────────────┐\n    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐\n    │ Svc A   │   │ Svc B   │   │ Svc C   │\n    │ (users) │   │ (orders)│   │ (notify)│\n    └─────────┘   └─────────┘   └─────────┘\n```\n\n### Spec Discovery Pipeline\n\n1. CI publishes OpenAPI spec to S3 on merge to main\n2. Portal scrapes S3 bucket every 5 minutes\n3. Spec validator rejects invalid specs with PR comment\n4. Gateway routes auto-generated from spec `servers[0].url`\n\n### Auth Flow\n\n1. Developer creates API key in portal → maps to OAuth2 client credentials\n2. Gateway validates JWT on every request (< 1ms with JWKS caching)\n3. RBAC policies defined per-service in portal, enforced at gateway\n4. Service mesh mTLS between gateway and backends (zero-trust internal)",
  "agent": "design"
}')
A_P4_DESIGN_ID=$(jid "$A_P4_DESIGN")
echo "  ✓ Action (P4 design): $A_P4_DESIGN_ID"

A_P4_REQS=$(post "$API/actions" '{
  "prompt": "## Requirements\n\nFull requirements for the Developer Portal & API Gateway.\n\n### Portal Requirements\n\n| ID | Requirement | Priority |\n|----|------------|----------|\n| DP-01 | Render OpenAPI 3.0/3.1 specs with interactive documentation | P0 |\n| DP-02 | API playground with auth auto-injection and response visualization | P0 |\n| DP-03 | Full-text search across all API endpoints, descriptions, and schemas | P0 |\n| DP-04 | Usage analytics dashboard (requests/min, P50/P95/P99 latency, error rate) | P1 |\n| DP-05 | API changelog generated from spec diffs between versions | P1 |\n| DP-06 | SDK generation (TypeScript, Python, Go) from OpenAPI specs | P2 |\n\n### Gateway Requirements\n\n| ID | Requirement | Priority |\n|----|------------|----------|\n| GW-01 | Route requests to backend services based on OpenAPI spec paths | P0 |\n| GW-02 | JWT validation with JWKS endpoint rotation | P0 |\n| GW-03 | Per-consumer rate limiting (token bucket, configurable per service) | P0 |\n| GW-04 | Circuit breaker with configurable thresholds and half-open recovery | P1 |\n| GW-05 | Request/response transformation (header injection, body mapping) | P2 |",
  "agent": "research"
}')
A_P4_REQS_ID=$(jid "$A_P4_REQS")
echo "  ✓ Action (P4 requirements): $A_P4_REQS_ID"

section "Creating Actions — Project 5: Mobile App Performance Optimization"

A_P5_GOAL=$(post "$API/actions" '{
  "prompt": "## Goal Definition\n\nDefine the performance optimization goals for the mobile application.\n\n### Current Performance Profile\n\nBased on production telemetry (last 30 days, P50 values):\n\n| Metric | iOS | Android | Target |\n|--------|-----|---------|--------|\n| Cold start | 3.2s | 4.1s | <1.5s |\n| TTI (home screen) | 2.8s | 3.5s | <1.0s |\n| JS bundle size | 2.4MB | 2.4MB | <800KB |\n| Memory (steady state) | 180MB | 220MB | <120MB |\n| Crash-free sessions | 99.1% | 98.3% | >99.5% |\n| Battery drain (1h active) | 8% | 12% | <5% |\n\n### Root Cause Analysis\n\n1. **Bundle size**: 67% of the bundle is three libraries — `moment.js` (330KB, replaceable with `date-fns`), `lodash` full import (540KB, tree-shakeable), and an unused analytics SDK (280KB)\n2. **Cold start**: Synchronous initialization of 12 providers in the app root. Only 3 are needed before first paint.\n3. **Memory**: Image caching is unbounded. No eviction policy. Users with long sessions accumulate 500+ cached images.\n4. **Crash rate**: 73% of crashes are `NullPointerException` on Android from unguarded nullable API responses\n\n### Goal\n\nHit all target metrics within 8 weeks through targeted fixes (no rewrite). Every fix must be A/B tested with rollback capability.",
  "agent": "research"
}')
A_P5_GOAL_ID=$(jid "$A_P5_GOAL")
echo "  ✓ Action (P5 goal): $A_P5_GOAL_ID"

A_P5_DESIGN=$(post "$API/actions" '{
  "prompt": "## Technical Design\n\nDesign the performance optimization strategy for the mobile app.\n\n### Phase 1: Bundle Diet (Week 1-2)\n\n```\nCurrent: 2.4MB\n├── moment.js ────────── 330KB → date-fns/fp (28KB)     = -302KB\n├── lodash (full) ────── 540KB → lodash-es (tree-shake) = -410KB\n├── unused-analytics ─── 280KB → remove                 = -280KB\n├── react-native-maps ── 190KB → lazy load               = -190KB (deferred)\n└── remaining ──────────1060KB → code-split by route     = -200KB (initial)\nTarget: ~700KB initial load\n```\n\n### Phase 2: Startup Sequencing (Week 3-4)\n\nCurrent initialization (all synchronous, blocking):\n```\nApp mount → Auth → Analytics → FeatureFlags → Notifications → DeepLinks\n          → Payments → Maps → Chat → Search → Recommendations → Cache\n```\n\nProposed (3-tier):\n```\nTier 0 (blocking):  Auth, FeatureFlags, Cache         → 400ms\nTier 1 (async):     Analytics, Notifications, DeepLinks → background\nTier 2 (on-demand): Payments, Maps, Chat, Search, Recs  → lazy init\n```\n\n### Phase 3: Memory Management (Week 5-6)\n\n- Implement LRU image cache with 100MB cap and 80MB eviction trigger\n- Add `onMemoryWarning` handler that drops Tier 2 services\n- Profile and fix 3 known retain cycles in navigation stack\n\n### Phase 4: Crash Hardening (Week 7-8)\n\n- Generate strict TypeScript types from OpenAPI specs (eliminates nullable guessing)\n- Add Zod runtime validation at API boundary\n- Implement global error boundary with Sentry breadcrumb context",
  "agent": "design"
}')
A_P5_DESIGN_ID=$(jid "$A_P5_DESIGN")
echo "  ✓ Action (P5 design): $A_P5_DESIGN_ID"

A_P5_REQS=$(post "$API/actions" '{
  "prompt": "## Requirements\n\nPerformance optimization requirements and acceptance criteria.\n\n### Acceptance Criteria (per phase)\n\n**Phase 1 — Bundle Diet**\n- [ ] `moment.js` replaced with `date-fns` — all 47 date formatting call sites migrated\n- [ ] `lodash` switched to `lodash-es` with per-function imports verified via bundle analyzer\n- [ ] Unused analytics SDK removed, no runtime references remain\n- [ ] Initial JS bundle ≤ 800KB (measured via `react-native-bundle-visualizer`)\n- [ ] All existing E2E tests pass\n\n**Phase 2 — Startup Sequencing**\n- [ ] Cold start under 1.5s on iPhone 12 and Pixel 6 (measured via Flipper)\n- [ ] TTI under 1.0s — home feed visible and scrollable\n- [ ] Tier 2 services initialize within 5s of app launch (not blocking UX)\n- [ ] Deep links still resolve correctly when invoked during Tier 1 init\n\n**Phase 3 — Memory Management**\n- [ ] Steady-state memory under 120MB after 30 minutes of active use\n- [ ] Image cache respects 100MB cap — verified with 1000-image scroll test\n- [ ] No OOM crashes in 4-hour soak test on low-memory devices (4GB RAM)\n\n**Phase 4 — Crash Hardening**\n- [ ] Crash-free session rate ≥ 99.5% (7-day rolling average)\n- [ ] Zero `NullPointerException` crashes from API response handling\n- [ ] Zod validation errors logged with full request context for debugging",
  "agent": "research"
}')
A_P5_REQS_ID=$(jid "$A_P5_REQS")
echo "  ✓ Action (P5 requirements): $A_P5_REQS_ID"

# ─── Task-level actions (implementation + validation) ─────────────────────────

section "Creating Actions — Task Implementation & Validation"

# P1 Task actions
A_T1_IMPL=$(post "$API/actions" '{
  "prompt": "## Implementation Plan\n\nImplement the diff parsing engine.\n\n### Approach\n\n1. Use `parse-diff` npm package as the foundation — handles unified diff format, tested against 10K+ real GitHub diffs\n2. Build an enrichment layer that resolves file paths to repo-relative locations and fetches surrounding context (±50 lines) from the base branch\n3. Implement a `DiffChunk` abstraction that groups related hunks by semantic proximity (e.g., changes to a function signature and its call sites)\n4. Output a structured `ReviewableUnit[]` array ready for LLM consumption\n\n### Edge Cases\n\n- Binary files: detect via magic bytes, skip with `binary_file_skipped` annotation\n- Renamed files: track via `similarity index` in diff header, present as single unit\n- Large diffs (>500 files): process in batches of 50, prioritize files with most additions\n- Submodule changes: skip with `submodule_change` annotation",
  "agent": "implementation"
}')
A_T1_IMPL_ID=$(jid "$A_T1_IMPL")
echo "  ✓ Action (T1 implementation): $A_T1_IMPL_ID"

A_T1_VAL=$(post "$API/actions" '{
  "prompt": "## Validation Plan\n\nValidate the diff parsing engine against real-world data.\n\n### Test Strategy\n\n1. **Unit tests**: 100% branch coverage on `DiffChunk` grouping logic\n2. **Snapshot tests**: 50 real GitHub diffs (from public repos) with expected parse output\n3. **Fuzz testing**: `fast-check` property-based tests verifying:\n   - Parsed line count equals original diff line count\n   - No file path contains `..` traversal\n   - Every `ReviewableUnit` has at least one hunk\n4. **Performance benchmark**: Parse a 500-file diff in under 2 seconds on CI hardware\n\n### Acceptance Gate\n\n- All tests green\n- No regressions in existing integration tests\n- Benchmark results committed to `benchmarks/` for future comparison",
  "agent": "review"
}')
A_T1_VAL_ID=$(jid "$A_T1_VAL")
echo "  ✓ Action (T1 validation): $A_T1_VAL_ID"

A_T2_IMPL=$(post "$API/actions" '{
  "prompt": "## Implementation Plan\n\nImplement the context window builder for LLM-based code review.\n\n### Token Budget Strategy\n\n```\nTotal budget: 128K tokens\n├── System prompt + review instructions:  2K tokens (fixed)\n├── Diff content:                        30K tokens (variable, truncate if needed)\n├── File-level context:                  40K tokens (surrounding code)\n├── Type definitions + imports:          20K tokens (dependency context)\n├── Recent changes to same files:        16K tokens (git log context)\n└── Response budget:                     20K tokens (reserved for output)\n```\n\n### Priority-Based Context Selection\n\nWhen total context exceeds budget:\n1. Always include: the diff itself (truncate largest files first)\n2. High priority: type definitions imported by changed files\n3. Medium priority: surrounding functions in changed files\n4. Low priority: recent git history for changed files\n5. Drop first: comments, whitespace-only context lines\n\n### Implementation Notes\n\n- Use `tiktoken` for accurate token counting (cl100k_base encoding)\n- Cache parsed ASTs per file to avoid re-parsing across chunks\n- Emit telemetry: `context_tokens_used`, `context_files_included`, `context_truncation_count`",
  "agent": "implementation"
}')
A_T2_IMPL_ID=$(jid "$A_T2_IMPL")
echo "  ✓ Action (T2 implementation): $A_T2_IMPL_ID"

A_T2_VAL=$(post "$API/actions" '{
  "prompt": "## Validation Plan\n\nValidate the context window builder.\n\n### Test Cases\n\n| Scenario | Input | Expected Behavior |\n|----------|-------|-------------------|\n| Small diff (10 files) | Real PR diff | All context fits, no truncation |\n| Large diff (200 files) | Generated diff | Truncation applied, high-priority context preserved |\n| Token limit exact | Crafted input at boundary | No overflow, response budget preserved |\n| Binary files in diff | Diff with `.png` changes | Binary files excluded from context, annotated |\n| Circular imports | A imports B imports A | No infinite loop, each file included once |\n\n### Performance Criteria\n\n- Context assembly < 5 seconds for 200-file diff\n- Token count accuracy within 1% of actual model tokenization\n- Memory usage < 500MB during context assembly",
  "agent": "review"
}')
A_T2_VAL_ID=$(jid "$A_T2_VAL")
echo "  ✓ Action (T2 validation): $A_T2_VAL_ID"

A_T3_IMPL=$(post "$API/actions" '{
  "prompt": "## Implementation Plan\n\nBuild the CRDT document synchronization layer.\n\n### Core Loop\n\n```typescript\nasync function syncLoop(session: CollabSession) {\n  const doc = Automerge.init<DocState>();\n  const ws = new WebSocket(gatewayUrl);\n\n  // Local changes → encode and send\n  session.onLocalChange((changeFn) => {\n    const newDoc = Automerge.change(doc, changeFn);\n    const patch = Automerge.getLastLocalChange(newDoc);\n    ws.send(encodePatch(patch));\n    doc = newDoc;\n  });\n\n  // Remote changes → apply and notify\n  ws.onmessage((msg) => {\n    const patch = decodePatch(msg.data);\n    const [newDoc] = Automerge.applyChanges(doc, [patch]);\n    doc = newDoc;\n    session.notifySubscribers(Automerge.diff(doc, newDoc));\n  });\n}\n```\n\n### Conflict Resolution Rules\n\n1. **Concurrent field edits**: Last-writer-wins per field (Automerge default)\n2. **Concurrent list inserts**: Maintain both, ordered by actor ID (deterministic)\n3. **Delete vs. edit conflict**: Delete wins (prevent zombie elements)\n4. **Move vs. edit conflict**: Move wins, edit applied at new position",
  "agent": "implementation"
}')
A_T3_IMPL_ID=$(jid "$A_T3_IMPL")
echo "  ✓ Action (T3 implementation): $A_T3_IMPL_ID"

A_T3_VAL=$(post "$API/actions" '{
  "prompt": "## Validation Plan\n\nValidate CRDT synchronization correctness and performance.\n\n### Correctness Tests\n\n1. **Convergence**: 5 clients make concurrent edits for 60 seconds, all disconnect, all reconnect — final state must be identical across all clients\n2. **Ordering**: Insert items A, B, C concurrently from 3 clients — resulting list must be deterministic regardless of message arrival order\n3. **Offline merge**: Client goes offline, makes 100 edits, comes back — all edits applied, no data loss\n4. **Conflict scenarios**: All 4 conflict types exercised with assertions on resolution\n\n### Load Tests\n\n- 50 concurrent clients on single document, 10 ops/second each\n- Measure: merge latency, memory growth, message size over time\n- Pass criteria: P99 merge < 50ms, memory growth < 1MB/minute, no unbounded growth",
  "agent": "review"
}')
A_T3_VAL_ID=$(jid "$A_T3_VAL")
echo "  ✓ Action (T3 validation): $A_T3_VAL_ID"

# Extra actions for various tasks
A_T4_IMPL=$(post "$API/actions" '{
  "prompt": "## Implementation Plan\n\nDeploy the OpenTelemetry collector fleet as a Kubernetes DaemonSet.\n\n### Collector Configuration\n\n```yaml\nreceivers:\n  otlp:\n    protocols:\n      grpc:\n        endpoint: 0.0.0.0:4317\n      http:\n        endpoint: 0.0.0.0:4318\n\nprocessors:\n  batch:\n    timeout: 5s\n    send_batch_size: 8192\n  resource:\n    attributes:\n      - key: k8s.cluster.name\n        value: production\n        action: upsert\n  k8sattributes:\n    extract:\n      metadata:\n        - k8s.namespace.name\n        - k8s.pod.name\n        - k8s.deployment.name\n        - k8s.node.name\n\nexporters:\n  otlphttp/gateway:\n    endpoint: http://otel-gateway.observability:4318\n    compression: zstd\n\nservice:\n  pipelines:\n    traces:\n      receivers: [otlp]\n      processors: [resource, k8sattributes, batch]\n      exporters: [otlphttp/gateway]\n    metrics:\n      receivers: [otlp]\n      processors: [resource, k8sattributes, batch]\n      exporters: [otlphttp/gateway]\n    logs:\n      receivers: [otlp]\n      processors: [resource, k8sattributes, batch]\n      exporters: [otlphttp/gateway]\n```\n\n### Rollout Strategy\n\n- Deploy to `staging` namespace first, run 48h burn-in\n- Canary to 5% of production nodes, monitor for 24h\n- Full rollout with PodDisruptionBudget (maxUnavailable: 10%)",
  "agent": "implementation"
}')
A_T4_IMPL_ID=$(jid "$A_T4_IMPL")
echo "  ✓ Action (T4 implementation): $A_T4_IMPL_ID"

A_T4_VAL=$(post "$API/actions" '{
  "prompt": "## Validation Plan\n\nValidate OTel collector deployment and data pipeline integrity.\n\n### Data Integrity Checks\n\n1. **Completeness**: Compare span count at collector ingress vs. gateway egress — drop rate must be < 0.01%\n2. **Attribute enrichment**: Sample 1000 spans, verify all have k8s metadata attributes\n3. **Latency**: Measure collector processing time — P99 must be < 100ms\n4. **Resource usage**: Collector pods must stay under 512MB memory, 0.5 CPU on steady state\n\n### Dual-Write Validation\n\n- Query same metric via old Prometheus and new Mimir — values must match within 0.1%\n- Compare log volume: old ELK daily count vs. new Loki daily count — within 1%\n- Trace sampling: verify tail sampler keeps 100% of error traces (inject known errors, verify presence)",
  "agent": "review"
}')
A_T4_VAL_ID=$(jid "$A_T4_VAL")
echo "  ✓ Action (T4 validation): $A_T4_VAL_ID"

A_T5_IMPL=$(post "$API/actions" '{
  "prompt": "## Implementation Plan\n\nBuild the API spec discovery and registration pipeline for the Developer Portal.\n\n### Pipeline Steps\n\n1. **CI Integration**: Add a shared CI step that extracts `openapi.yaml` from each repo and uploads to S3 at `s3://api-specs/{service-name}/{git-sha}.yaml`\n2. **Spec Watcher**: Lambda triggered by S3 PUT events — validates spec with `@readme/openapi-parser`, rejects invalid specs via GitHub status check\n3. **Registry Update**: Valid specs written to DynamoDB registry table with fields: `service_name`, `version`, `spec_url`, `endpoints[]`, `updated_at`\n4. **Portal Sync**: Portal polls registry every 60s, renders updated docs via Redoc\n\n### Schema\n\n```sql\nCREATE TABLE api_registry (\n  service_name   VARCHAR(255) PRIMARY KEY,\n  display_name   VARCHAR(255) NOT NULL,\n  team_owner     VARCHAR(255) NOT NULL,\n  spec_url       TEXT NOT NULL,\n  spec_version   VARCHAR(50) NOT NULL,\n  endpoint_count INTEGER NOT NULL DEFAULT 0,\n  last_updated   TIMESTAMP NOT NULL DEFAULT NOW(),\n  health_status  VARCHAR(20) DEFAULT 'unknown'\n);\n```",
  "agent": "implementation"
}')
A_T5_IMPL_ID=$(jid "$A_T5_IMPL")
echo "  ✓ Action (T5 implementation): $A_T5_IMPL_ID"

A_T5_VAL=$(post "$API/actions" '{
  "prompt": "## Validation Plan\n\nValidate the API spec discovery pipeline end-to-end.\n\n### Test Scenarios\n\n1. **Happy path**: Push valid OpenAPI spec → appears in portal within 2 minutes\n2. **Invalid spec**: Push spec with missing `info.version` → CI fails with clear error, not registered\n3. **Spec update**: Push updated spec → portal shows new version, old version accessible in changelog\n4. **Concurrent updates**: Two services push specs simultaneously → both registered, no race condition\n5. **Large spec**: Spec with 500+ endpoints → renders correctly, search indexes all endpoints\n\n### Load Test\n\n- Simulate 50 services pushing spec updates every 5 minutes for 1 hour\n- Portal must remain responsive (< 2s page load) throughout\n- Registry must be eventually consistent within 5 minutes of any push",
  "agent": "review"
}')
A_T5_VAL_ID=$(jid "$A_T5_VAL")
echo "  ✓ Action (T5 validation): $A_T5_VAL_ID"

# More standalone actions for extra traffic
A_EXTRA1=$(post "$API/actions" '{
  "prompt": "## Research: Database Migration Strategy\n\nInvestigate the safest approach to migrate from PostgreSQL 13 to PostgreSQL 16 with zero downtime.\n\n### Key Questions\n\n1. Can we use logical replication to stream changes during migration?\n2. What is the expected replication lag for our dataset (2.3TB, 450M rows in largest table)?\n3. Are there breaking changes in PG 16 that affect our `jsonb` query patterns?\n4. What is the rollback procedure if we discover issues post-cutover?\n\n### Constraints\n\n- Zero downtime — we serve 15K requests/second, SLA is 99.95%\n- Migration window: off-peak (Saturday 2AM-6AM UTC) for the final cutover\n- Must preserve all sequences, extensions, and custom types",
  "agent": "research"
}')
A_EXTRA1_ID=$(jid "$A_EXTRA1")
echo "  ✓ Action (extra research): $A_EXTRA1_ID"

A_EXTRA2=$(post "$API/actions" '{
  "prompt": "## Review: Security Audit Findings\n\nReview and prioritize the findings from the Q1 security audit.\n\n### Critical Findings\n\n1. **JWT secret rotation**: Signing key has not been rotated in 18 months. Implement automated rotation with 30-day cadence.\n2. **SQL injection in search**: The `/api/search` endpoint concatenates user input into a SQL query. Parameterize immediately.\n3. **SSRF via webhook URLs**: Webhook registration accepts arbitrary URLs including internal IPs. Add allowlist validation.\n\n### High Findings\n\n4. **Missing rate limiting on auth endpoints**: `/api/login` and `/api/register` have no rate limiting. Add token bucket (10 req/min per IP).\n5. **Verbose error messages in production**: Stack traces leaked in 500 responses. Sanitize error responses.\n6. **Outdated dependencies**: 12 packages with known CVEs. 3 are transitive dependencies requiring careful upgrade.\n\n### Recommended Priority Order\n\n1. SQL injection (#2) — exploitable now, fix today\n2. SSRF (#3) — exploitable, fix this week\n3. Rate limiting (#4) — brute force risk, fix this sprint\n4. JWT rotation (#1) — operational risk, schedule this sprint\n5. Error messages (#5) — info disclosure, next sprint\n6. Dependencies (#6) — known CVEs, next sprint",
  "agent": "review"
}')
A_EXTRA2_ID=$(jid "$A_EXTRA2")
echo "  ✓ Action (extra review): $A_EXTRA2_ID"

A_EXTRA3=$(post "$API/actions" '{
  "prompt": "## Design: Event-Driven Architecture Migration\n\nDesign the migration path from synchronous REST calls to event-driven architecture for the order processing pipeline.\n\n### Current Flow (Synchronous)\n\n```\nOrder API → Payment Service → Inventory Service → Shipping Service → Notification Service\n           (HTTP POST)        (HTTP POST)          (HTTP POST)        (HTTP POST)\n           timeout: 30s       timeout: 15s         timeout: 15s       timeout: 10s\n```\n\nTotal chain timeout: 70s. Single point of failure at each hop. Payment service downtime = entire order flow down.\n\n### Proposed Flow (Event-Driven)\n\n```\nOrder API → publishes OrderCreated\n  ├── Payment Service subscribes → publishes PaymentProcessed | PaymentFailed\n  ├── Inventory Service subscribes → publishes InventoryReserved | InventoryInsufficient  \n  └── (after both succeed) → Saga orchestrator publishes OrderConfirmed\n       ├── Shipping Service subscribes → publishes ShipmentScheduled\n       └── Notification Service subscribes → sends confirmation email\n```\n\n### Technology Choice: Kafka vs. SQS+SNS\n\n| Criteria | Kafka | SQS+SNS |\n|----------|-------|----------|\n| Ordering guarantee | Per-partition | FIFO queues (limited) |\n| Replay capability | Yes (retention-based) | No |\n| Operational burden | High (self-managed) | Low (managed) |\n| Cost at our scale | ~$2K/mo | ~$800/mo |\n| Team expertise | 2 engineers | Everyone |\n\n**Recommendation**: SQS+SNS for v1. We do not need replay or strict ordering for order events. Migrate to Kafka only if we hit SQS FIFO throughput limits (300 msg/s per queue).",
  "agent": "design"
}')
A_EXTRA3_ID=$(jid "$A_EXTRA3")
echo "  ✓ Action (extra design): $A_EXTRA3_ID"

A_EXTRA4=$(post "$API/actions" '{
  "prompt": "## Implementation: Feature Flag System\n\nImplement a lightweight feature flag system that supports gradual rollouts.\n\n### Data Model\n\n```typescript\ninterface FeatureFlag {\n  key: string;                    // e.g., \"new-checkout-flow\"\n  enabled: boolean;               // global kill switch\n  rolloutPercentage: number;      // 0-100, hash-based consistent assignment\n  allowlist: string[];            // user IDs that always get the feature\n  blocklist: string[];            // user IDs that never get the feature\n  metadata: Record<string, string>; // arbitrary key-value pairs for context\n  createdAt: string;\n  updatedAt: string;\n}\n```\n\n### Evaluation Logic\n\n```typescript\nfunction evaluate(flag: FeatureFlag, userId: string): boolean {\n  if (!flag.enabled) return false;\n  if (flag.blocklist.includes(userId)) return false;\n  if (flag.allowlist.includes(userId)) return true;\n  // Consistent hashing: same user always gets same result for same flag\n  const hash = murmur3(`${flag.key}:${userId}`) % 100;\n  return hash < flag.rolloutPercentage;\n}\n```\n\n### SDK Interface\n\n```typescript\nconst flags = new FeatureFlagClient({ endpoint: '/api/flags', refreshInterval: 30_000 });\n\nif (flags.isEnabled('new-checkout-flow', { userId: user.id })) {\n  renderNewCheckout();\n} else {\n  renderLegacyCheckout();\n}\n```",
  "agent": "implementation"
}')
A_EXTRA4_ID=$(jid "$A_EXTRA4")
echo "  ✓ Action (extra implementation): $A_EXTRA4_ID"

# ─── Create Projects ──────────────────────────────────────────────────────────

section "Creating Projects"

P1=$(post "$API/projects" "{
  \"name\": \"AI-Powered Code Review Platform\",
  \"description\": \"An intelligent code review system that uses LLMs to provide automated, context-aware feedback on pull requests. Integrates with GitHub and GitLab webhooks to analyze diffs, build semantic context from the surrounding codebase, and generate line-level review comments categorized by severity. Includes a feedback loop that tracks developer acceptance rates to continuously improve review quality per repository.\",
  \"goal_action_id\": \"$A_P1_GOAL_ID\",
  \"design_action_id\": \"$A_P1_DESIGN_ID\",
  \"requirements_action_id\": \"$A_P1_REQS_ID\"
}")
P1_ID=$(jid "$P1")
echo "  ✓ Project 1 (AI Code Review): $P1_ID"

P2=$(post "$API/projects" "{
  \"name\": \"Real-Time Collaboration Engine\",
  \"description\": \"A CRDT-based real-time collaboration SDK that enables Google-Docs-level collaborative editing for any structured data type — spreadsheets, kanban boards, database views, and more. Built on Automerge with WebSocket delivery via Cloudflare Durable Objects. Provides client SDKs for web, iOS, and Android with offline support, automatic conflict resolution, and sub-100ms edit propagation on same-region connections.\",
  \"goal_action_id\": \"$A_P2_GOAL_ID\",
  \"design_action_id\": \"$A_P2_DESIGN_ID\",
  \"requirements_action_id\": \"$A_P2_REQS_ID\"
}")
P2_ID=$(jid "$P2")
echo "  ✓ Project 2 (Collab Engine): $P2_ID"

P3=$(post "$API/projects" "{
  \"name\": \"Observability Pipeline Overhaul\",
  \"description\": \"Migrate from three siloed observability stacks (Prometheus/Thanos, ELK, Jaeger) to a unified OpenTelemetry-based pipeline. Deploys OTel collectors as a Kubernetes DaemonSet and gateway fleet, routes signals to Grafana Cloud backends (Mimir, Loki, Tempo), and implements tail-based trace sampling to capture 100% of interesting traces while reducing storage costs by 40%. Target: cut incident correlation time from 12 minutes to under 2 minutes.\",
  \"goal_action_id\": \"$A_P3_GOAL_ID\",
  \"design_action_id\": \"$A_P3_DESIGN_ID\",
  \"requirements_action_id\": \"$A_P3_REQS_ID\"
}")
P3_ID=$(jid "$P3")
echo "  ✓ Project 3 (Observability): $P3_ID"

P4=$(post "$API/projects" "{
  \"name\": \"Developer Portal & API Gateway\",
  \"description\": \"A self-service developer portal backed by Envoy API gateway that auto-discovers internal microservices via OpenAPI specs, provides interactive documentation with a built-in playground, and enforces consistent authentication (OAuth2 + RBAC) across all 47 internal services. Includes usage analytics, SDK generation, and API changelog tracking. Goal: reduce new engineer onboarding from 2 weeks to 2 days.\",
  \"goal_action_id\": \"$A_P4_GOAL_ID\",
  \"design_action_id\": \"$A_P4_DESIGN_ID\",
  \"requirements_action_id\": \"$A_P4_REQS_ID\"
}")
P4_ID=$(jid "$P4")
echo "  ✓ Project 4 (Dev Portal): $P4_ID"

P5=$(post "$API/projects" "{
  \"name\": \"Mobile App Performance Optimization\",
  \"description\": \"A targeted 8-week performance sprint to bring the mobile app within acceptable thresholds: cold start under 1.5s, initial bundle under 800KB, steady-state memory under 120MB, and crash-free sessions above 99.5%. Addresses root causes identified via production telemetry — oversized dependencies, synchronous initialization, unbounded image caching, and unguarded nullable API responses. Every optimization A/B tested with rollback capability.\",
  \"goal_action_id\": \"$A_P5_GOAL_ID\",
  \"design_action_id\": \"$A_P5_DESIGN_ID\",
  \"requirements_action_id\": \"$A_P5_REQS_ID\"
}")
P5_ID=$(jid "$P5")
echo "  ✓ Project 5 (Mobile Perf): $P5_ID"

# ─── Create Tasks ─────────────────────────────────────────────────────────────

section "Creating Tasks — Project 1: AI Code Review"

T1=$(post "$API/projects/$P1_ID/tasks" "{
  \"summary\": \"Build diff parsing engine with semantic chunking\",
  \"context\": \"Parse unified diffs from GitHub webhooks, group related hunks by semantic proximity, and produce structured ReviewableUnit arrays for LLM consumption. Must handle mono-repos with 500+ changed files, binary file detection, and renamed file tracking.\",
  \"implementation_action_id\": \"$A_T1_IMPL_ID\",
  \"validation_action_id\": \"$A_T1_VAL_ID\"
}")
T1_ID=$(jid "$T1")
echo "  ✓ Task: Diff parsing engine ($T1_ID)"

T2=$(post "$API/projects/$P1_ID/tasks" "{
  \"summary\": \"Implement context window builder with token budget management\",
  \"context\": \"Assemble LLM context from diff content, surrounding code, type definitions, imports, and recent git history. Manage a 128K token budget with priority-based selection — always include the diff, then type definitions, then surrounding functions, then git history. Use tiktoken for accurate counting.\",
  \"implementation_action_id\": \"$A_T2_IMPL_ID\",
  \"validation_action_id\": \"$A_T2_VAL_ID\"
}")
T2_ID=$(jid "$T2")
echo "  ✓ Task: Context window builder ($T2_ID)"

T3=$(post "$API/projects/$P1_ID/tasks" '{
  "summary": "Build review comment generation and severity classification",
  "context": "Generate line-level code review comments from LLM output. Each comment must include: file path, line range, severity (critical/suggestion/nitpick/question), comment body, and optional code suggestion. Implement structured output parsing with fallback to regex extraction for malformed LLM responses."
}')
T3_ID=$(jid "$T3")
echo "  ✓ Task: Comment generation ($T3_ID)"

T4=$(post "$API/projects/$P1_ID/tasks" '{
  "summary": "Implement GitHub PR comment posting via REST API",
  "context": "Post generated review comments back to GitHub PRs using the Checks API and Pull Request Reviews API. Batch comments into a single review to avoid notification spam. Handle rate limiting (5000 req/hr), token refresh, and graceful degradation when GitHub is unavailable."
}')
T4_ID=$(jid "$T4")
echo "  ✓ Task: GitHub integration ($T4_ID)"

T5=$(post "$API/projects/$P1_ID/tasks" '{
  "summary": "Build feedback tracking dashboard",
  "context": "Track which AI-generated review comments developers accept (resolve), dismiss, or modify. Store events in a time-series table. Build a dashboard showing acceptance rate by severity, by repository, and by reviewer. Use this signal to tune review generation prompts per-repo."
}')
T5_ID=$(jid "$T5")
echo "  ✓ Task: Feedback dashboard ($T5_ID)"

section "Creating Tasks — Project 2: Collab Engine"

T6=$(post "$API/projects/$P2_ID/tasks" "{
  \"summary\": \"Implement Automerge CRDT document synchronization\",
  \"context\": \"Build the core sync loop: local changes encoded and sent via WebSocket, remote changes applied and notified to subscribers. Handle all conflict resolution cases — concurrent field edits (LWW), concurrent list inserts (ordered by actor ID), delete-vs-edit (delete wins), move-vs-edit (move wins).\",
  \"implementation_action_id\": \"$A_T3_IMPL_ID\",
  \"validation_action_id\": \"$A_T3_VAL_ID\"
}")
T6_ID=$(jid "$T6")
echo "  ✓ Task: CRDT sync layer ($T6_ID)"

T7=$(post "$API/projects/$P2_ID/tasks" '{
  "summary": "Build WebSocket gateway on Cloudflare Durable Objects",
  "context": "Deploy a WebSocket gateway using Cloudflare Workers + Durable Objects. Each document maps to exactly one Durable Object instance, providing single-writer semantics for the authoritative CRDT state. Handle connection upgrades, heartbeat/keepalive, and graceful shutdown on Durable Object eviction."
}')
T7_ID=$(jid "$T7")
echo "  ✓ Task: WS gateway ($T7_ID)"

T8=$(post "$API/projects/$P2_ID/tasks" '{
  "summary": "Implement offline queue with IndexedDB persistence",
  "context": "When the WebSocket connection drops, queue local operations in IndexedDB. On reconnect, replay queued ops and merge with remote state using vector clocks. Cap offline queue at 10MB with user-facing warning at 8MB. Implement exponential backoff with jitter for reconnection (1s initial, 30s max)."
}')
T8_ID=$(jid "$T8")
echo "  ✓ Task: Offline support ($T8_ID)"

T9=$(post "$API/projects/$P2_ID/tasks" '{
  "summary": "Build presence system for cursor tracking and user awareness",
  "context": "Implement ephemeral presence state (not persisted in CRDT) showing each collaborator cursor position, selection range, and display name. Broadcast presence updates via WebSocket side-channel. Render colored cursors with name labels. Handle stale presence cleanup when users disconnect without clean close."
}')
T9_ID=$(jid "$T9")
echo "  ✓ Task: Presence system ($T9_ID)"

section "Creating Tasks — Project 3: Observability"

T10=$(post "$API/projects/$P3_ID/tasks" "{
  \"summary\": \"Deploy OTel collector DaemonSet with k8s attribute enrichment\",
  \"context\": \"Deploy OpenTelemetry collectors as a Kubernetes DaemonSet. Configure OTLP receivers (gRPC + HTTP), batch processor, resource detection, and k8s attribute enrichment. Export to gateway collectors via OTLP/HTTP with zstd compression. Target: all application pods can emit telemetry via localhost:4317.\",
  \"implementation_action_id\": \"$A_T4_IMPL_ID\",
  \"validation_action_id\": \"$A_T4_VAL_ID\"
}")
T10_ID=$(jid "$T10")
echo "  ✓ Task: OTel DaemonSet ($T10_ID)"

T11=$(post "$API/projects/$P3_ID/tasks" '{
  "summary": "Implement tail-based trace sampling in gateway collector",
  "context": "Replace head-based 1% sampling with tail-based sampling at the gateway level. Always keep: traces with error status, traces exceeding P99 latency, traces touching critical paths (checkout, auth, payment). Probabilistic 10% for everything else. Expected: 60% storage reduction while capturing 100% of interesting traces."
}')
T11_ID=$(jid "$T11")
echo "  ✓ Task: Tail sampling ($T11_ID)"

T12=$(post "$API/projects/$P3_ID/tasks" '{
  "summary": "Build dual-write validation framework",
  "context": "During migration, both legacy and new pipelines receive identical data. Build a validation framework that compares: metric values (within 0.1%), log event counts (within 1%), and trace completeness (100% of error traces present in both). Run validation hourly. Auto-halt migration if discrepancy exceeds thresholds."
}')
T12_ID=$(jid "$T12")
echo "  ✓ Task: Dual-write validation ($T12_ID)"

T13=$(post "$API/projects/$P3_ID/tasks" '{
  "summary": "Migrate log parsing rules from Logstash to OTel transform processor",
  "context": "Translate 23 Logstash grok patterns into OTel transform processor OTTL statements. Cover: nginx access logs, application JSON logs, PostgreSQL slow query logs, and Kubernetes audit logs. Verify parsed output matches legacy pipeline field-by-field for 1000 sample log lines per pattern."
}')
T13_ID=$(jid "$T13")
echo "  ✓ Task: Log parsing migration ($T13_ID)"

section "Creating Tasks — Project 4: Dev Portal"

T14=$(post "$API/projects/$P4_ID/tasks" "{
  \"summary\": \"Build API spec discovery and registration pipeline\",
  \"context\": \"Create a CI step that extracts OpenAPI specs from repos and uploads to S3. Build a Lambda-based spec watcher that validates and registers specs in DynamoDB. Portal polls registry every 60s for updates. Invalid specs rejected with clear GitHub status check feedback.\",
  \"implementation_action_id\": \"$A_T5_IMPL_ID\",
  \"validation_action_id\": \"$A_T5_VAL_ID\"
}")
T14_ID=$(jid "$T14")
echo "  ✓ Task: Spec discovery ($T14_ID)"

T15=$(post "$API/projects/$P4_ID/tasks" '{
  "summary": "Implement OAuth2 + RBAC authentication layer in Envoy gateway",
  "context": "Configure Envoy external authorization filter to validate JWTs on every request. Implement JWKS endpoint caching with automatic rotation detection. Build RBAC policy engine: per-service access rules defined in portal UI, enforced at gateway. Support service-to-service auth via client credentials grant."
}')
T15_ID=$(jid "$T15")
echo "  ✓ Task: Auth layer ($T15_ID)"

T16=$(post "$API/projects/$P4_ID/tasks" '{
  "summary": "Build interactive API playground with Monaco editor",
  "context": "Create a browser-based API testing playground embedded in the developer portal. Auto-populate request templates from OpenAPI specs. Inject authentication headers automatically. Display responses with syntax highlighting, timing information, and response schema validation. Support environment switching (dev/staging/prod)."
}')
T16_ID=$(jid "$T16")
echo "  ✓ Task: API playground ($T16_ID)"

T17=$(post "$API/projects/$P4_ID/tasks" '{
  "summary": "Implement per-consumer usage analytics dashboard",
  "context": "Track API usage per consumer (identified by API key): requests/minute, P50/P95/P99 latency, error rate by status code. Store in ClickHouse with 90-day retention. Build dashboard with Recharts showing time-series graphs, top consumers, slowest endpoints, and error hotspots. Support 7/30/90 day windows."
}')
T17_ID=$(jid "$T17")
echo "  ✓ Task: Usage analytics ($T17_ID)"

section "Creating Tasks — Project 5: Mobile Perf"

T18=$(post "$API/projects/$P5_ID/tasks" '{
  "summary": "Replace moment.js with date-fns and tree-shake lodash",
  "context": "Migrate all 47 date formatting call sites from moment.js (330KB) to date-fns/fp (28KB). Switch lodash full import (540KB) to lodash-es with per-function imports. Remove unused analytics SDK (280KB). Verify with react-native-bundle-visualizer that initial bundle is under 800KB. All E2E tests must pass."
}')
T18_ID=$(jid "$T18")
echo "  ✓ Task: Bundle diet ($T18_ID)"

T19=$(post "$API/projects/$P5_ID/tasks" '{
  "summary": "Implement 3-tier startup sequencing for cold start optimization",
  "context": "Restructure app initialization from synchronous 12-provider blocking chain to 3-tier async model. Tier 0 (blocking, 400ms budget): Auth, FeatureFlags, Cache. Tier 1 (async, background): Analytics, Notifications, DeepLinks. Tier 2 (on-demand, lazy): Payments, Maps, Chat, Search, Recommendations. Target: cold start under 1.5s on iPhone 12 and Pixel 6."
}')
T19_ID=$(jid "$T19")
echo "  ✓ Task: Startup sequencing ($T19_ID)"

T20=$(post "$API/projects/$P5_ID/tasks" '{
  "summary": "Implement LRU image cache with memory pressure handling",
  "context": "Replace unbounded image cache with LRU eviction policy. 100MB hard cap, eviction trigger at 80MB. Implement onMemoryWarning handler that drops Tier 2 services and aggressively evicts cached images. Profile and fix 3 known retain cycles in the navigation stack. Target: steady-state memory under 120MB after 30 minutes of active use."
}')
T20_ID=$(jid "$T20")
echo "  ✓ Task: Memory management ($T20_ID)"

T21=$(post "$API/projects/$P5_ID/tasks" '{
  "summary": "Generate strict TypeScript types from OpenAPI specs and add Zod validation",
  "context": "Eliminate NullPointerException crashes (73% of Android crashes) by generating strict TypeScript types from backend OpenAPI specs. Add Zod runtime validation at every API response boundary. Implement global error boundary with Sentry breadcrumb context. Target: crash-free session rate above 99.5% and zero nullable-related crashes."
}')
T21_ID=$(jid "$T21")
echo "  ✓ Task: Crash hardening ($T21_ID)"

# ─── Action Status Transitions ────────────────────────────────────────────────
# Valid: todo → in_progress → complete|failed, failed → todo

section "Action Status Transitions"

# Move several actions through the full lifecycle
for AID in "$A_P1_GOAL_ID" "$A_P1_DESIGN_ID" "$A_P1_REQS_ID" "$A_T1_IMPL_ID" "$A_T1_VAL_ID"; do
  patch "$API/actions/$AID/status" '{"status":"in_progress"}' > /dev/null
  echo "  ✓ $AID: todo → in_progress"
done

# Complete some
for AID in "$A_P1_GOAL_ID" "$A_P1_DESIGN_ID" "$A_P1_REQS_ID"; do
  patch "$API/actions/$AID/status" '{"status":"complete"}' > /dev/null
  echo "  ✓ $AID: in_progress → complete"
done

# Fail one and retry
patch "$API/actions/$A_T1_IMPL_ID/status" '{"status":"failed"}' > /dev/null
echo "  ✓ $A_T1_IMPL_ID: in_progress → failed"
patch "$API/actions/$A_T1_IMPL_ID/status" '{"status":"todo"}' > /dev/null
echo "  ✓ $A_T1_IMPL_ID: failed → todo (retry)"
patch "$API/actions/$A_T1_IMPL_ID/status" '{"status":"in_progress"}' > /dev/null
echo "  ✓ $A_T1_IMPL_ID: todo → in_progress (attempt 2)"
patch "$API/actions/$A_T1_IMPL_ID/status" '{"status":"complete"}' > /dev/null
echo "  ✓ $A_T1_IMPL_ID: in_progress → complete"

# Complete T1 validation
patch "$API/actions/$A_T1_VAL_ID/status" '{"status":"complete"}' > /dev/null
echo "  ✓ $A_T1_VAL_ID: in_progress → complete"

# Start P2 actions
for AID in "$A_P2_GOAL_ID" "$A_P2_DESIGN_ID"; do
  patch "$API/actions/$AID/status" '{"status":"in_progress"}' > /dev/null
  echo "  ✓ $AID: todo → in_progress"
done
patch "$API/actions/$A_P2_GOAL_ID/status" '{"status":"complete"}' > /dev/null
echo "  ✓ $A_P2_GOAL_ID: in_progress → complete"

# Start and fail P3 design (realistic — first attempt didn't meet constraints)
patch "$API/actions/$A_P3_DESIGN_ID/status" '{"status":"in_progress"}' > /dev/null
echo "  ✓ $A_P3_DESIGN_ID: todo → in_progress"
patch "$API/actions/$A_P3_DESIGN_ID/status" '{"status":"failed"}' > /dev/null
echo "  ✓ $A_P3_DESIGN_ID: in_progress → failed (constraints not met)"

# Start some task-level actions
for AID in "$A_T3_IMPL_ID" "$A_T4_IMPL_ID" "$A_EXTRA1_ID" "$A_EXTRA4_ID"; do
  patch "$API/actions/$AID/status" '{"status":"in_progress"}' > /dev/null
  echo "  ✓ $AID: todo → in_progress"
done

patch "$API/actions/$A_EXTRA1_ID/status" '{"status":"complete"}' > /dev/null
echo "  ✓ $A_EXTRA1_ID: in_progress → complete"

# ─── Update Actions with Output ──────────────────────────────────────────────

section "Updating Actions with Output"

patch "$API/actions/$A_P1_GOAL_ID" '{
  "output": "## Goal Statement\n\n**Reduce code review cycle time by 60% and defect escape rate by 40% through AI-assisted automated review.**\n\n### North Star Metric\n\nMedian time from PR opened to first substantive review comment: currently 4.2 hours → target 1.7 hours.\n\n### Success Criteria (6-month milestone)\n\n1. **Adoption**: ≥80% of PRs in 3 pilot repos receive AI review within 5 minutes of opening\n2. **Quality**: AI comment acceptance rate ≥45% (developers resolve or act on the comment)\n3. **Speed**: Median time-to-first-review reduced by 60%\n4. **Defect escape**: Critical bugs found in production reduced by 40% (measured via post-mortem tagging)\n\n### Non-Goals\n\n- Replacing human reviewers (AI is a first pass, not the final word)\n- Enforcing style rules (that is what linters are for)\n- Reviewing documentation-only changes\n- Supporting languages beyond TypeScript, Python, and Go in v1"
}' > /dev/null
echo "  ✓ Updated P1 goal action with output"

patch "$API/actions/$A_P1_DESIGN_ID" '{
  "output": "## Architecture Decision Record\n\n### Status: Accepted\n\n### Context\n\nWe need a system that ingests GitHub PR diffs, builds semantic context, generates review comments via LLM, and posts them back — all within 45 seconds for typical PRs.\n\n### Decision\n\n**Three-stage pipeline architecture:**\n\n1. **Ingestion Service** (Hono on Cloudflare Workers)\n   - Receives GitHub webhooks\n   - Validates signatures\n   - Parses diffs into `ReviewableUnit[]`\n   - Enqueues to SQS\n\n2. **Review Engine** (ECS Fargate)\n   - Dequeues from SQS\n   - Builds context window (token-budgeted)\n   - Calls Claude API with structured output\n   - Parses and validates review comments\n\n3. **Delivery Service** (Lambda)\n   - Receives completed reviews from SQS\n   - Batches comments into single GitHub review\n   - Handles rate limiting and retries\n\n### Consequences\n\n- **Good**: Each stage scales independently. Ingestion handles webhook bursts, review engine scales with GPU/API capacity, delivery handles GitHub rate limits.\n- **Bad**: Three services to deploy and monitor. Added latency from queue hops (~2-3s).\n- **Acceptable**: Queue latency is negligible compared to LLM inference time (~20-30s)."
}' > /dev/null
echo "  ✓ Updated P1 design action with output"

patch "$API/actions/$A_EXTRA1_ID" '{
  "output": "## Research Findings: PostgreSQL 13 → 16 Migration\n\n### Logical Replication Assessment\n\n✅ Logical replication is viable for our use case.\n\n**Setup**: Create publication on PG13, subscription on PG16. Initial table sync takes ~4 hours for our 2.3TB dataset (tested on staging with equivalent volume).\n\n**Replication lag**: Steady-state lag is 50-200ms under our write load (3K inserts/sec, 1.5K updates/sec). Spikes to 2-5 seconds during bulk operations (nightly ETL jobs).\n\n### Breaking Changes Affecting Us\n\n1. **`jsonb_path_query` behavior change**: PG16 is stricter about lax mode path expressions. 3 of our queries use implicit lax behavior that now requires explicit `.type()` method. **Impact: Low, 3 queries to update.**\n2. **`CREATE SUBSCRIPTION` requires superuser in PG16**: Our migration user needs elevated privileges. **Impact: None, migration user already has superuser.**\n3. **ICU collation now default**: New databases use ICU instead of libc collation. We must explicitly set `LC_COLLATE` to match PG13 behavior during migration. **Impact: Medium, must set in CREATE DATABASE.**\n\n### Recommended Rollback Procedure\n\n1. Keep PG13 running in read-only mode for 48 hours post-cutover\n2. If issues found: redirect application connection string back to PG13, drop PG16 subscription\n3. PG13 catches up from WAL within minutes\n4. After 48h clean window: decommission PG13 replica"
}' > /dev/null
echo "  ✓ Updated extra research action with output"

patch "$API/actions/$A_P2_GOAL_ID" '{
  "output": "## Goal: Zero-Conflict Real-Time Collaboration for Structured Data\n\n### One-Liner\n\nMake multiplayer editing work for data that is not just text — spreadsheets, boards, databases — with mathematically guaranteed consistency.\n\n### Why Now\n\nThree internal teams have independently built ad-hoc real-time sync (Notifications board, Sprint planner, Config editor). All three have conflict bugs. All three want to throw away their sync code. A shared engine pays for itself immediately.\n\n### 6-Month Milestone: Proof of Life\n\n1. SDK ships to npm with TypeScript client\n2. Notifications board migrated from custom WebSocket sync to CollabEngine (first internal customer)\n3. 50-user concurrent editing demo with zero visible conflicts\n4. P99 edit-to-visible latency under 100ms (same region)\n\n### Explicitly Out of Scope\n\n- Rich text editing (Yjs/ProseMirror owns this; we are not competing)\n- File/blob sync (use object storage)\n- Permissions/access control (handled by application layer, not the engine)"
}' > /dev/null
echo "  ✓ Updated P2 goal action with output"

# Update some action agents
patch "$API/actions/$A_EXTRA2_ID" '{"agent": "review"}' > /dev/null
echo "  ✓ Updated extra review action agent"

patch "$API/actions/$A_EXTRA3_ID" '{
  "output": "## Decision: SQS+SNS for Event-Driven Order Pipeline\n\n### Architecture Approved\n\nAfter evaluating Kafka vs SQS+SNS against our requirements, **SQS+SNS is the clear choice for v1**.\n\n### Key Factors\n\n1. **Team expertise**: Everyone knows AWS managed services. Only 2 engineers have Kafka experience. Operational risk of Kafka is the real cost, not the $2K/mo compute.\n2. **Ordering requirements are weak**: Order events do not need strict global ordering. Per-order ordering is achievable with SQS FIFO message groups keyed by order ID.\n3. **Throughput headroom**: Our peak is 800 orders/minute. SQS FIFO supports 300 msg/s per queue with batching — 18,000 msg/min. 22x headroom.\n4. **No replay needed (yet)**: The saga pattern handles retries. If we later need event replay for analytics, we can add Kinesis as a parallel consumer without changing producers.\n\n### Migration Plan\n\n- Week 1: Deploy SNS topics and SQS queues. Dual-write from Order API (REST + event).\n- Week 2: Migrate Payment Service to consume from SQS. Keep REST fallback.\n- Week 3: Migrate remaining services. Monitor for 48h.\n- Week 4: Remove REST endpoints. Clean up dead code."
}' > /dev/null
echo "  ✓ Updated extra design action with output"

# ─── Task Status Transitions ─────────────────────────────────────────────────

section "Task Status Transitions"

# P1 tasks — diff engine and context builder done, others in progress
patch "$API/projects/$P1_ID/tasks/$T1_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T1 (diff parser): todo → in_progress"
patch "$API/projects/$P1_ID/tasks/$T1_ID" '{"status":"done"}' > /dev/null
echo "  ✓ Task T1 (diff parser): in_progress → done"

patch "$API/projects/$P1_ID/tasks/$T2_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T2 (context builder): todo → in_progress"
patch "$API/projects/$P1_ID/tasks/$T2_ID" '{"status":"done"}' > /dev/null
echo "  ✓ Task T2 (context builder): in_progress → done"

patch "$API/projects/$P1_ID/tasks/$T3_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T3 (comment gen): todo → in_progress"

patch "$API/projects/$P1_ID/tasks/$T4_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T4 (GitHub integration): todo → in_progress"

# P2 tasks — CRDT sync in progress
patch "$API/projects/$P2_ID/tasks/$T6_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T6 (CRDT sync): todo → in_progress"

patch "$API/projects/$P2_ID/tasks/$T7_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T7 (WS gateway): todo → in_progress"
patch "$API/projects/$P2_ID/tasks/$T7_ID" '{"status":"done"}' > /dev/null
echo "  ✓ Task T7 (WS gateway): in_progress → done"

# P3 tasks — OTel DaemonSet done, others in progress
patch "$API/projects/$P3_ID/tasks/$T10_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T10 (OTel DaemonSet): todo → in_progress"
patch "$API/projects/$P3_ID/tasks/$T10_ID" '{"status":"done"}' > /dev/null
echo "  ✓ Task T10 (OTel DaemonSet): in_progress → done"

patch "$API/projects/$P3_ID/tasks/$T11_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T11 (tail sampling): todo → in_progress"

# P4 tasks
patch "$API/projects/$P4_ID/tasks/$T14_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T14 (spec discovery): todo → in_progress"
patch "$API/projects/$P4_ID/tasks/$T14_ID" '{"status":"done"}' > /dev/null
echo "  ✓ Task T14 (spec discovery): in_progress → done"

patch "$API/projects/$P4_ID/tasks/$T15_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T15 (auth layer): todo → in_progress"

# P5 tasks — bundle diet done, startup in progress
patch "$API/projects/$P5_ID/tasks/$T18_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T18 (bundle diet): todo → in_progress"
patch "$API/projects/$P5_ID/tasks/$T18_ID" '{"status":"done"}' > /dev/null
echo "  ✓ Task T18 (bundle diet): in_progress → done"

patch "$API/projects/$P5_ID/tasks/$T19_ID" '{"status":"in_progress"}' > /dev/null
echo "  ✓ Task T19 (startup seq): todo → in_progress"

# ─── Update Projects ─────────────────────────────────────────────────────────

section "Updating Projects"

patch "$API/projects/$P1_ID" '{"description":"An intelligent code review system that uses LLMs to provide automated, context-aware feedback on pull requests. Phase 1 (diff parsing and context building) complete. Phase 2 (comment generation and GitHub integration) in progress. Tracking 47% comment acceptance rate in pilot repo, exceeding 45% target."}' > /dev/null
echo "  ✓ Updated P1 description (progress update)"

patch "$API/projects/$P3_ID" '{"name":"Observability Pipeline Overhaul (Phase 1: Metrics Cutover)"}' > /dev/null
echo "  ✓ Updated P3 name (scoped to current phase)"

# Archive P4 temporarily
patch "$API/projects/$P4_ID" '{"status":"archived"}' > /dev/null
echo "  ✓ Archived P4 (deprioritized)"

# Unarchive it
patch "$API/projects/$P4_ID" '{"status":"active"}' > /dev/null
echo "  ✓ Reactivated P4"

# ─── Update Tasks ─────────────────────────────────────────────────────────────

section "Updating Tasks"

patch "$API/projects/$P1_ID/tasks/$T3_ID" '{"context":"Generate line-level code review comments from LLM output. Each comment must include: file path, line range, severity (critical/suggestion/nitpick/question), comment body, and optional code suggestion. UPDATE: Using Claude structured output with tool_use for reliable parsing — eliminates need for regex fallback. Severity distribution target: 10% critical, 30% suggestion, 40% nitpick, 20% question."}' > /dev/null
echo "  ✓ Updated T3 context (implementation detail)"

patch "$API/projects/$P2_ID/tasks/$T8_ID" '{"summary":"Implement offline queue with IndexedDB persistence and 10MB cap","context":"When the WebSocket connection drops, queue local operations in IndexedDB. On reconnect, replay queued ops and merge with remote state using vector clocks. Cap offline queue at 10MB with user-facing warning at 8MB. Implement exponential backoff with jitter for reconnection (1s initial, 30s max). UPDATE: Added LZ4 compression for queued ops — reduces average queue size by 3x, effectively giving users 30MB of offline edits within the 10MB storage budget."}' > /dev/null
echo "  ✓ Updated T8 summary and context"

patch "$API/projects/$P3_ID/tasks/$T13_ID" '{"context":"Translate 23 Logstash grok patterns into OTel transform processor OTTL statements. Cover: nginx access logs, application JSON logs, PostgreSQL slow query logs, and Kubernetes audit logs. Verify parsed output matches legacy pipeline field-by-field for 1000 sample log lines per pattern. UPDATE: Discovered 4 additional undocumented grok patterns in the payments team Logstash config. Total is now 27 patterns to migrate."}' > /dev/null
echo "  ✓ Updated T13 context (scope increase)"

# ─── Update Action Prompts ────────────────────────────────────────────────────

section "Updating Action Prompts"

patch "$API/actions/$A_EXTRA4_ID" '{
  "prompt": "## Implementation: Feature Flag System (v2 — with Segments)\n\nImplement a feature flag system that supports gradual rollouts AND user segments.\n\n### Updated Data Model\n\n```typescript\ninterface FeatureFlag {\n  key: string;\n  enabled: boolean;\n  rolloutPercentage: number;\n  allowlist: string[];\n  blocklist: string[];\n  segments: Segment[];           // NEW: segment-based targeting\n  metadata: Record<string, string>;\n  createdAt: string;\n  updatedAt: string;\n}\n\ninterface Segment {\n  name: string;                  // e.g., \"beta-testers\", \"enterprise-plan\"\n  rules: SegmentRule[];          // AND logic within segment\n  rolloutPercentage: number;     // segment-specific rollout\n}\n\ninterface SegmentRule {\n  attribute: string;             // e.g., \"plan\", \"country\", \"created_at\"\n  operator: \"eq\" | \"neq\" | \"gt\" | \"lt\" | \"in\" | \"contains\";\n  value: string | string[];\n}\n```\n\n### Updated Evaluation Logic\n\n1. Check global kill switch\n2. Check blocklist (always deny)\n3. Check allowlist (always allow)\n4. Evaluate segments in order — first matching segment wins\n5. Fall back to global rollout percentage\n\nThis allows rules like: \"Roll out new checkout to 100% of enterprise plan users, 50% of pro plan users, and 5% of free plan users.\""
}' > /dev/null
echo "  ✓ Updated feature flag action prompt (v2 with segments)"

# ─── Comprehensive Read Queries ───────────────────────────────────────────────

section "Read Queries — Pagination"

get "$API/projects?limit=2&offset=0" > /dev/null
echo "  ✓ GET /api/projects?limit=2&offset=0"
get "$API/projects?limit=2&offset=2" > /dev/null
echo "  ✓ GET /api/projects?limit=2&offset=2"
get "$API/projects?limit=2&offset=4" > /dev/null
echo "  ✓ GET /api/projects?limit=2&offset=4"
get "$API/projects?limit=200" > /dev/null
echo "  ✓ GET /api/projects?limit=200 (max page)"

get "$API/projects/$P1_ID/tasks?limit=2&offset=0" > /dev/null
echo "  ✓ GET tasks page 1"
get "$API/projects/$P1_ID/tasks?limit=2&offset=2" > /dev/null
echo "  ✓ GET tasks page 2"
get "$API/projects/$P1_ID/tasks?limit=2&offset=4" > /dev/null
echo "  ✓ GET tasks page 3"
get "$API/projects/$P1_ID/tasks?limit=500" > /dev/null
echo "  ✓ GET tasks max page"

get "$API/actions?limit=5&offset=0" > /dev/null
echo "  ✓ GET actions page 1"
get "$API/actions?limit=5&offset=5" > /dev/null
echo "  ✓ GET actions page 2"
get "$API/actions?limit=5&offset=10" > /dev/null
echo "  ✓ GET actions page 3"
get "$API/actions?limit=5&offset=15" > /dev/null
echo "  ✓ GET actions page 4"
get "$API/actions?limit=5&offset=20" > /dev/null
echo "  ✓ GET actions page 5"

section "Read Queries — Filters"

get "$API/projects?status=active" > /dev/null
echo "  ✓ GET /api/projects?status=active"
get "$API/projects?status=archived" > /dev/null
echo "  ✓ GET /api/projects?status=archived"

get "$API/projects/$P1_ID/tasks?status=todo" > /dev/null
echo "  ✓ GET P1 tasks?status=todo"
get "$API/projects/$P1_ID/tasks?status=in_progress" > /dev/null
echo "  ✓ GET P1 tasks?status=in_progress"
get "$API/projects/$P1_ID/tasks?status=done" > /dev/null
echo "  ✓ GET P1 tasks?status=done"

get "$API/projects/$P2_ID/tasks?status=todo" > /dev/null
echo "  ✓ GET P2 tasks?status=todo"
get "$API/projects/$P2_ID/tasks?status=in_progress" > /dev/null
echo "  ✓ GET P2 tasks?status=in_progress"
get "$API/projects/$P2_ID/tasks?status=done" > /dev/null
echo "  ✓ GET P2 tasks?status=done"

get "$API/projects/$P3_ID/tasks?status=todo" > /dev/null
echo "  ✓ GET P3 tasks?status=todo"
get "$API/projects/$P3_ID/tasks?status=done" > /dev/null
echo "  ✓ GET P3 tasks?status=done"

get "$API/projects/$P4_ID/tasks?status=todo" > /dev/null
echo "  ✓ GET P4 tasks?status=todo"
get "$API/projects/$P4_ID/tasks?status=done" > /dev/null
echo "  ✓ GET P4 tasks?status=done"

get "$API/projects/$P5_ID/tasks?status=todo" > /dev/null
echo "  ✓ GET P5 tasks?status=todo"
get "$API/projects/$P5_ID/tasks?status=done" > /dev/null
echo "  ✓ GET P5 tasks?status=done"

get "$API/actions?status=todo" > /dev/null
echo "  ✓ GET actions?status=todo"
get "$API/actions?status=in_progress" > /dev/null
echo "  ✓ GET actions?status=in_progress"
get "$API/actions?status=complete" > /dev/null
echo "  ✓ GET actions?status=complete"
get "$API/actions?status=failed" > /dev/null
echo "  ✓ GET actions?status=failed"

get "$API/actions?agent=research" > /dev/null
echo "  ✓ GET actions?agent=research"
get "$API/actions?agent=design" > /dev/null
echo "  ✓ GET actions?agent=design"
get "$API/actions?agent=implementation" > /dev/null
echo "  ✓ GET actions?agent=implementation"
get "$API/actions?agent=review" > /dev/null
echo "  ✓ GET actions?agent=review"

# Combined filters
get "$API/actions?status=complete&agent=research" > /dev/null
echo "  ✓ GET actions?status=complete&agent=research"
get "$API/actions?status=in_progress&agent=implementation" > /dev/null
echo "  ✓ GET actions?status=in_progress&agent=implementation"
get "$API/actions?status=todo&agent=review" > /dev/null
echo "  ✓ GET actions?status=todo&agent=review"

section "Read Queries — Individual Resources"

# Read every project
for PID in "$P1_ID" "$P2_ID" "$P3_ID" "$P4_ID" "$P5_ID"; do
  get "$API/projects/$PID" > /dev/null
  echo "  ✓ GET /api/projects/$PID"
done

# Read every task
for PAIR in \
  "$P1_ID:$T1_ID" "$P1_ID:$T2_ID" "$P1_ID:$T3_ID" "$P1_ID:$T4_ID" "$P1_ID:$T5_ID" \
  "$P2_ID:$T6_ID" "$P2_ID:$T7_ID" "$P2_ID:$T8_ID" "$P2_ID:$T9_ID" \
  "$P3_ID:$T10_ID" "$P3_ID:$T11_ID" "$P3_ID:$T12_ID" "$P3_ID:$T13_ID" \
  "$P4_ID:$T14_ID" "$P4_ID:$T15_ID" "$P4_ID:$T16_ID" "$P4_ID:$T17_ID" \
  "$P5_ID:$T18_ID" "$P5_ID:$T19_ID" "$P5_ID:$T20_ID" "$P5_ID:$T21_ID"; do
  PID="${PAIR%%:*}"
  TID="${PAIR##*:}"
  get "$API/projects/$PID/tasks/$TID" > /dev/null
  echo "  ✓ GET task $TID"
done

# Read every action
for AID in \
  "$A_P1_GOAL_ID" "$A_P1_DESIGN_ID" "$A_P1_REQS_ID" \
  "$A_P2_GOAL_ID" "$A_P2_DESIGN_ID" "$A_P2_REQS_ID" \
  "$A_P3_GOAL_ID" "$A_P3_DESIGN_ID" "$A_P3_REQS_ID" \
  "$A_P4_GOAL_ID" "$A_P4_DESIGN_ID" "$A_P4_REQS_ID" \
  "$A_P5_GOAL_ID" "$A_P5_DESIGN_ID" "$A_P5_REQS_ID" \
  "$A_T1_IMPL_ID" "$A_T1_VAL_ID" "$A_T2_IMPL_ID" "$A_T2_VAL_ID" \
  "$A_T3_IMPL_ID" "$A_T3_VAL_ID" "$A_T4_IMPL_ID" "$A_T4_VAL_ID" \
  "$A_T5_IMPL_ID" "$A_T5_VAL_ID" \
  "$A_EXTRA1_ID" "$A_EXTRA2_ID" "$A_EXTRA3_ID" "$A_EXTRA4_ID"; do
  get "$API/actions/$AID" > /dev/null
  echo "  ✓ GET action $AID"
done

# ─── Final reads for max WebSocket chatter ────────────────────────────────────

section "Final Reads — WebSocket Exercise"

get "$API/health" > /dev/null
echo "  ✓ GET /api/health"
get "$API/projects" > /dev/null
echo "  ✓ GET /api/projects (all)"
get "$API/actions" > /dev/null
echo "  ✓ GET /api/actions (all)"

# Read all tasks for all projects
for PID in "$P1_ID" "$P2_ID" "$P3_ID" "$P4_ID" "$P5_ID"; do
  get "$API/projects/$PID/tasks" > /dev/null
  echo "  ✓ GET /api/projects/$PID/tasks"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Traffic simulation complete."
echo "  Total API requests: $COUNT"
echo ""
echo "  Created: 5 projects, 21 tasks, 26 actions"
echo "  Status transitions: ~25 action transitions, ~18 task transitions"
echo "  Updates: 4 project updates, 3 task updates, 5 action output updates"
echo "  Read queries: ~80 GET requests (pagination, filters, individual)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
