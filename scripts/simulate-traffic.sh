#!/usr/bin/env bash
# simulate-traffic.sh — exercise the full API surface for WebSocket traffic testing
# Creates realistic project management data with high-quality markdown content,
# agents, sessions, and run entries.
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
del()   { COUNT=$((COUNT+1)); pause; curl -sf -X DELETE -H 'Content-Type: application/json' -d "$2" "$1"; }
jid()   { echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }
jids()  { echo "$1" | grep -o '"id":"[^"]*"' | cut -d'"' -f4; }

section() { echo ""; echo "━━━ $1 ━━━"; }

# Helper: generate ISO timestamp N days ago
days_ago() {
  local days=$1
  if [[ "$(uname)" == "Darwin" ]]; then
    date -u -v-${days}d +%Y-%m-%dT%H:%M:%S.000Z
  else
    date -u -d "$days days ago" +%Y-%m-%dT%H:%M:%S.000Z
  fi
}

# Helper: generate ISO timestamp N days ago + M seconds later
days_ago_plus() {
  local days=$1
  local secs=$2
  if [[ "$(uname)" == "Darwin" ]]; then
    date -u -v-${days}d -v+${secs}S +%Y-%m-%dT%H:%M:%S.000Z
  else
    date -u -d "$days days ago + $secs seconds" +%Y-%m-%dT%H:%M:%S.000Z
  fi
}

# Helper: create run with backdated started_at, then complete it
# Args: agent_identifier entity_type entity_id days_back duration_secs [status] [output]
create_and_finish() {
  local agent_id=$1 entity_type=$2 entity_id=$3 days_back=$4 duration_secs=$5 status=${6:-done} output=${7:-}
  local started=$(days_ago "$days_back")
  local finished=$(days_ago_plus "$days_back" "$duration_secs")

  RUN=$(post "$API/runs" "[{
    \"agent\": \"$agent_id\",
    \"entity_type\": \"$entity_type\",
    \"entity_id\": \"$entity_id\",
    \"started_at\": \"$started\"
  }]")
  RUN_ID=$(jid "$RUN")

  if [ -n "$output" ]; then
    patch "$API/runs" "[{\"id\": \"$RUN_ID\", \"status\": \"$status\", \"output\": \"$output\", \"finished_at\": \"$finished\"}]" > /dev/null
  else
    patch "$API/runs" "[{\"id\": \"$RUN_ID\", \"status\": \"$status\", \"finished_at\": \"$finished\"}]" > /dev/null
  fi
  echo "  ✓ $entity_type/$entity_id: $agent_id ($status, ${duration_secs}s, ${days_back}d ago)"
}

# Helper: create run that stays running
create_running() {
  local agent_id=$1 entity_type=$2 entity_id=$3
  post "$API/runs" "[{
    \"agent\": \"$agent_id\",
    \"entity_type\": \"$entity_type\",
    \"entity_id\": \"$entity_id\"
  }]" > /dev/null
  echo "  ✓ $entity_type/$entity_id: $agent_id (running)"
}

# ─── Health Check ──────────────────────────────────────────────────────────────

section "Health Check"
get "$API/health" > /dev/null
echo "  ✓ GET /api/health"

# ─── Cleanup ──────────────────────────────────────────────────────────────────
# Wipe existing data so the script is idempotent on re-runs

section "Cleanup — removing existing data"

# Helper: extract IDs from a list endpoint (pipefail-safe)
extract_ids() { grep -o '"id":"[^"]*"' | cut -d'"' -f4 | tr '\n' ',' | sed 's/,$//'; }

# Delete runs first (references sessions and agents)
RUN_IDS=$(curl -sf "$API/runs?limit=200" | extract_ids || true)
if [ -n "$RUN_IDS" ]; then
  JSON_IDS=$(echo "$RUN_IDS" | awk -F',' '{for(i=1;i<=NF;i++) printf "\"%s\"%s", $i, (i<NF?",":""); print ""}')
  del "$API/runs" "{\"ids\":[$JSON_IDS]}" > /dev/null 2>&1 || true
  echo "  ✓ Deleted runs"
else
  echo "  ✓ No runs to delete"
fi

# Delete agents
AGENT_IDS=$(curl -sf "$API/agents?limit=200" | extract_ids || true)
if [ -n "$AGENT_IDS" ]; then
  JSON_IDS=$(echo "$AGENT_IDS" | awk -F',' '{for(i=1;i<=NF;i++) printf "\"%s\"%s", $i, (i<NF?",":""); print ""}')
  del "$API/agents" "{\"ids\":[$JSON_IDS]}" > /dev/null 2>&1 || true
  echo "  ✓ Deleted agents"
else
  echo "  ✓ No agents to delete"
fi

# Delete sessions (runs.session_id is SET NULL on cascade, so safe after runs)
SESS_IDS=$(curl -sf "$API/sessions?limit=200" | extract_ids || true)
if [ -n "$SESS_IDS" ]; then
  JSON_IDS=$(echo "$SESS_IDS" | awk -F',' '{for(i=1;i<=NF;i++) printf "\"%s\"%s", $i, (i<NF?",":""); print ""}')
  del "$API/sessions" "{\"ids\":[$JSON_IDS]}" > /dev/null 2>&1 || true
  echo "  ✓ Deleted sessions"
else
  echo "  ✓ No sessions to delete"
fi

# Delete tasks
TASK_IDS=$(curl -sf "$API/tasks?limit=200" | extract_ids || true)
if [ -n "$TASK_IDS" ]; then
  JSON_IDS=$(echo "$TASK_IDS" | awk -F',' '{for(i=1;i<=NF;i++) printf "\"%s\"%s", $i, (i<NF?",":""); print ""}')
  del "$API/tasks" "{\"ids\":[$JSON_IDS]}" > /dev/null 2>&1 || true
  echo "  ✓ Deleted tasks"
else
  echo "  ✓ No tasks to delete"
fi

# Delete projects
PROJ_IDS=$(curl -sf "$API/projects?limit=200" | extract_ids || true)
if [ -n "$PROJ_IDS" ]; then
  JSON_IDS=$(echo "$PROJ_IDS" | awk -F',' '{for(i=1;i<=NF;i++) printf "\"%s\"%s", $i, (i<NF?",":""); print ""}')
  del "$API/projects" "{\"ids\":[$JSON_IDS]}" > /dev/null 2>&1 || true
  echo "  ✓ Deleted projects"
else
  echo "  ✓ No projects to delete"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PROJECTS — bulk create with rich markdown in goal, requirements, design
# ═══════════════════════════════════════════════════════════════════════════════

section "Creating Projects (bulk)"

PROJECTS=$(post "$API/projects" '[
  {
    "title": "AI-Powered Code Review Platform",
    "goal": "## North Star\n\nReduce code review cycle time by 60% and defect escape rate by 40% through AI-assisted automated review.\n\n### Problem\n\nEngineering teams waste 30-40% of code review time on mechanical checks — style violations, missing null guards, inconsistent naming. High-value feedback (architecture concerns, subtle bugs, security implications) gets buried or skipped because reviewers are fatigued.\n\n### Success Criteria (6-month milestone)\n\n| Metric | Current | Target |\n|--------|---------|--------|\n| Median time-to-first-review | 4.2 hours | 1.7 hours |\n| AI comment acceptance rate | — | ≥45% |\n| PR coverage (pilot repos) | — | ≥80% |\n| Critical bugs escaping to prod | baseline | -40% |\n\n### Non-Goals\n\n- Replacing human reviewers — AI is a first pass, not the final word\n- Enforcing style rules — that is what linters are for\n- Supporting languages beyond TypeScript, Python, and Go in v1",
    "requirements": "## Functional Requirements\n\n| ID | Requirement | Priority | Acceptance Criteria |\n|----|------------|----------|--------------------|\n| FR-01 | Ingest GitHub PR webhooks | P0 | Receives `pull_request.opened` and `pull_request.synchronize` events, parses diff within 5s |\n| FR-02 | Generate line-level review comments | P0 | Produces ≥1 comment per PR with severity classification |\n| FR-03 | Post comments back to GitHub | P0 | Comments appear as a review on the PR within 60s of webhook receipt |\n| FR-04 | Support `.reviewignore` file | P1 | Respects glob patterns for files/directories to skip |\n| FR-05 | Dashboard showing review acceptance rate | P1 | Displays per-repo and per-reviewer metrics with 7/30/90 day windows |\n\n## Non-Functional Requirements\n\n- **Availability**: 99.9% uptime (8.7h downtime/year)\n- **Scalability**: Handle 10,000 PRs/day per tenant\n- **Security**: SOC 2 Type II compliant, no customer code persisted beyond processing window\n- **Observability**: Structured logging, distributed tracing, latency histograms per pipeline stage\n- **Latency**: P95 under 45 seconds for PRs with ≤50 changed files",
    "design": "## Architecture Decision Record\n\n### Status: Accepted\n\n### Decision\n\n**Three-stage pipeline architecture:**\n\n```\n┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐\n│  Ingestion Svc   │────▶│  Review Engine    │────▶│  Delivery Svc    │\n│  (Hono/CF Workers)│     │  (ECS Fargate)    │     │  (Lambda)        │\n│                  │     │                  │     │                  │\n│  - Webhook recv  │     │  - Context build  │     │  - Batch comments│\n│  - Diff parse    │     │  - LLM inference  │     │  - GitHub API    │\n│  - SQS enqueue   │     │  - Output parse   │     │  - Rate limiting │\n└──────────────────┘     └──────────────────┘     └──────────────────┘\n```\n\n### Key Decisions\n\n1. **Cloudflare Workers for ingestion** — edge-deployed, handles webhook burst traffic without scaling config\n2. **SQS between stages** — decouples ingestion from inference; queue absorbs latency variance from LLM calls\n3. **Claude structured output** — `tool_use` for reliable comment parsing, eliminates regex fallback\n4. **Single GitHub review per PR** — batch all comments into one review to avoid notification spam\n\n### Consequences\n\n- **Good**: Each stage scales independently. Queue latency (~2-3s) is negligible vs. LLM inference (~20-30s).\n- **Bad**: Three services to deploy and monitor.\n- **Acceptable**: Operational overhead justified by independent scaling and fault isolation."
  },
  {
    "title": "Real-Time Collaboration Engine",
    "goal": "## Zero-Conflict Real-Time Collaboration for Structured Data\n\n### One-Liner\n\nMake multiplayer editing work for data that is not just text — spreadsheets, boards, databases — with mathematically guaranteed consistency.\n\n### Why Now\n\nThree internal teams have independently built ad-hoc real-time sync (Notifications board, Sprint planner, Config editor). All three have conflict bugs. All three want to throw away their sync code. A shared engine pays for itself immediately.\n\n### 6-Month Milestone\n\n1. SDK ships to npm with TypeScript client\n2. Notifications board migrated from custom WebSocket sync to CollabEngine (first internal customer)\n3. 50-user concurrent editing demo with zero visible conflicts\n4. P99 edit-to-visible latency under 100ms (same region)\n\n### Explicitly Out of Scope\n\n- Rich text editing (Yjs/ProseMirror owns this)\n- File/blob sync (use object storage)\n- Permissions/access control (handled by application layer)",
    "requirements": "## SDK API Surface\n\n```typescript\ninterface CollabEngine {\n  connect(docId: string, token: string): CollabSession;\n}\n\ninterface CollabSession {\n  readonly state: ReadonlySignal<DocState>;\n  readonly peers: ReadonlySignal<Peer[]>;\n  readonly status: ReadonlySignal<ConnectionStatus>;\n  apply(changeFn: (doc: Mutable<DocState>) => void): void;\n  subscribe(path: string, cb: (value: unknown) => void): Unsubscribe;\n  disconnect(): void;\n}\n```\n\n## Protocol Requirements\n\n- **Reconnection**: Exponential backoff with jitter, 1s → 30s max. Resume from last known vector clock.\n- **Offline support**: Queue local ops in IndexedDB. Cap at 10MB; warning at 8MB.\n- **Auth**: Short-lived JWTs (15 min). Transparent refresh. Revocation checked on WS upgrade only.\n\n## Compatibility Matrix\n\n| Platform | Min Version | Bundle Size Target |\n|----------|-------------|-------------------|\n| Chrome/Edge | 90+ | ≤45KB gzipped |\n| Safari | 15+ | ≤45KB gzipped |\n| Firefox | 95+ | ≤45KB gzipped |\n| React Native | 0.72+ | ≤60KB |\n| Swift (iOS) | iOS 16+ | ≤200KB |",
    "design": "## Distributed Systems Architecture\n\n### Core Components\n\n```\n┌─────────────┐     ┌──────────────┐     ┌─────────────────┐\n│   Client SDK │────▶│  WebSocket   │────▶│  CRDT Engine    │\n│  (JS/Swift/  │◀────│  Gateway     │◀────│  (Automerge)    │\n│   Kotlin)    │     │  (Cloudflare │     │                 │\n│              │     │   Workers)   │     │  Merge + Persist│\n└─────────────┘     └──────────────┘     └────────┬────────┘\n                                                   │\n                                          ┌────────▼────────┐\n                                          │  Document Store  │\n                                          │  (FoundationDB)  │\n                                          └─────────────────┘\n```\n\n### Key Decisions\n\n1. **Automerge over Yjs** — better support for nested maps/lists which structured data requires\n2. **Cloudflare Durable Objects** — exactly-once routing to authoritative CRDT doc, no coordination layer needed\n3. **FoundationDB for persistence** — serializable transactions for snapshot writes; CRDT merge is commutative so we snapshot periodically\n\n### Latency Budget\n\n| Segment | Target | Notes |\n|---------|--------|-------|\n| Client → Gateway | 20ms | Edge-routed, same region |\n| Gateway → CRDT merge | 5ms | In-memory, Durable Object co-located |\n| Broadcast to peers | 15ms | Fan-out via WebSocket |\n| **Total (same region)** | **40ms** | Well under 100ms target |"
  },
  {
    "title": "Observability Pipeline Overhaul",
    "goal": "## Unified Observability via OpenTelemetry\n\n### Current State\n\nThree separate stacks, three UIs, three sets of tribal knowledge:\n- **Metrics**: Prometheus + Thanos (self-hosted, 14-day retention)\n- **Logs**: ELK stack (self-hosted, 7-day retention, frequently OOMs)\n- **Traces**: Jaeger (self-hosted, 3-day retention, 1% sampling)\n\nTotal cost: ~$48K/month. Mean time to correlate across signals during an incident: **12 minutes**.\n\n### Target State\n\n1. Single collector fleet (OpenTelemetry) ingesting all three signals\n2. Correlation via shared resource attributes and trace IDs\n3. 40% reduction in observability compute cost\n4. Mean-time-to-correlate under **2 minutes**\n\n### Anti-Goals\n\n- NOT replacing Grafana as the visualization layer\n- NOT building a custom storage backend — using managed services\n- NOT instrumenting application code in this phase — pipeline infrastructure only",
    "requirements": "## Functional Requirements\n\n| ID | Requirement | Priority |\n|----|------------|----------|\n| OBS-01 | Ingest OTLP/gRPC and OTLP/HTTP from all application pods | P0 |\n| OBS-02 | Enrich all signals with k8s metadata (namespace, pod, node, deployment) | P0 |\n| OBS-03 | Tail-sample traces: keep 100% of errors + high-latency, 10% probabilistic | P0 |\n| OBS-04 | Parse unstructured logs into structured events via OTel transform processor | P1 |\n| OBS-05 | Generate span metrics (RED metrics from traces) to reduce custom instrumentation | P1 |\n| OBS-06 | Support multi-tenant routing (dev/staging/prod to separate backends) | P2 |\n\n## Capacity Planning\n\n| Signal | Current Volume | Projected After Migration |\n|--------|---------------|-------------------------|\n| Metrics | 2.1M active series | 2.1M (no change) |\n| Logs | 850GB/day | 600GB/day (after parsing dedup) |\n| Traces | 12M spans/day (1% sampled) | 180M ingested → 25M stored (tail sampled) |\n\n## Rollback Criteria\n\n- If >0.1% data loss detected during dual-write, halt migration\n- If P99 collector latency >500ms for >5 min, auto-rollback via feature flag\n- Legacy pipeline stays warm for 2 weeks post-cutover",
    "design": "## Pipeline Architecture\n\n### Collector Topology\n\n```\n                    ┌─────────────────────────┐\n  App Pods ────────▶│  OTel Collector (Agent)  │──── per node, DaemonSet\n                    │  - Batch processor       │\n                    │  - Resource detection     │\n                    │  - K8s attributes         │\n                    └───────────┬──────────────┘\n                                │\n                    ┌───────────▼──────────────┐\n                    │  OTel Collector (Gateway) │──── 3 replicas, HPA\n                    │  - Tail sampling          │\n                    │  - Metrics aggregation    │\n                    │  - Log parsing/transform  │\n                    │  - Export routing         │\n                    └───┬───────┬──────────┬───┘\n                        │       │          │\n                   ┌────▼──┐ ┌──▼────┐ ┌───▼────┐\n                   │Metrics│ │ Logs  │ │ Traces │\n                   │(Mimir)│ │(Loki) │ │(Tempo) │\n                   └───────┘ └───────┘ └────────┘\n```\n\n### Tail Sampling Strategy\n\n- **Always keep**: error status, latency > P99, critical paths (checkout, auth)\n- **Probabilistic**: 10% of remaining (10x improvement over current 1%)\n- **Expected**: 60% fewer stored spans while capturing 100% of interesting traces\n\n### Migration Plan\n\n| Week | Action | Risk |\n|------|--------|------|\n| 1-2 | Deploy collectors alongside existing exporters (dual-write) | Low |\n| 3-4 | Validate parity between old and new pipelines | Low |\n| 5 | Cut over metrics | Low |\n| 6 | Cut over traces (tail sampling enables immediately) | Medium |\n| 7-8 | Cut over logs (highest volume, most complex parsing) | Medium |"
  },
  {
    "title": "Developer Portal & API Gateway",
    "goal": "## Self-Service API Discovery\n\n### Problem\n\n47 internal microservices. No central registry, no consistent auth, no discoverability. New engineers spend their first 2 weeks just figuring out what services exist and how to call them.\n\n### Goal\n\n- Auto-discover services via OpenAPI specs in each repo\n- Single authentication and authorization layer (OAuth2 + RBAC)\n- \"Try it\" playground for every endpoint\n- Usage analytics per consumer (latency, error rates, request volume)\n\n### Success Metrics\n\n| Metric | Target | Timeframe |\n|--------|--------|----------|\n| Internal APIs registered | 100% | 3 months |\n| New engineer onboarding time | 2 weeks → 2 days | 6 months |\n| Direct service-to-service auth | 0 (all via gateway) | 6 months |",
    "requirements": "## Portal Requirements\n\n| ID | Requirement | Priority |\n|----|------------|----------|\n| DP-01 | Render OpenAPI 3.0/3.1 specs with interactive docs | P0 |\n| DP-02 | API playground with auth auto-injection and response visualization | P0 |\n| DP-03 | Full-text search across all endpoints, descriptions, and schemas | P0 |\n| DP-04 | Usage analytics dashboard (req/min, P50/P95/P99, error rate) | P1 |\n| DP-05 | API changelog from spec diffs between versions | P1 |\n| DP-06 | SDK generation (TypeScript, Python, Go) from OpenAPI specs | P2 |\n\n## Gateway Requirements\n\n| ID | Requirement | Priority |\n|----|------------|----------|\n| GW-01 | Route requests based on OpenAPI spec paths | P0 |\n| GW-02 | JWT validation with JWKS endpoint rotation | P0 |\n| GW-03 | Per-consumer rate limiting (token bucket) | P0 |\n| GW-04 | Circuit breaker with configurable thresholds | P1 |\n| GW-05 | Request/response transformation (header injection, body mapping) | P2 |",
    "design": "## Architecture\n\n```\n┌──────────────────────────────────────────────────────┐\n│                  Developer Portal (React)             │\n│  ┌──────────┐  ┌───────────┐  ┌────────────────────┐ │\n│  │ API Docs  │  │ Playground │  │ Usage Dashboard   │ │\n│  │ (Redoc)   │  │ (Monaco)   │  │ (Recharts)        │ │\n│  └──────────┘  └───────────┘  └────────────────────┘ │\n└───────────────────────┬──────────────────────────────┘\n                        │\n┌───────────────────────▼──────────────────────────────┐\n│                  API Gateway (Envoy)                   │\n│  - JWT validation          - Rate limiting             │\n│  - Request routing          - Circuit breaking          │\n│  - Access logging           - Request transformation    │\n└───────────────────────┬──────────────────────────────┘\n                        │\n         ┌──────────────┼──────────────┐\n    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐\n    │ Svc A   │   │ Svc B   │   │ Svc C   │\n    └─────────┘   └─────────┘   └─────────┘\n```\n\n### Spec Discovery Pipeline\n\n1. CI publishes OpenAPI spec to S3 on merge to main\n2. Portal scrapes S3 bucket every 5 minutes\n3. Spec validator rejects invalid specs with PR comment\n4. Gateway routes auto-generated from `servers[0].url`\n\n### Auth Flow\n\n1. Developer creates API key in portal → OAuth2 client credentials\n2. Gateway validates JWT on every request (<1ms with JWKS caching)\n3. RBAC per-service, defined in portal, enforced at gateway\n4. mTLS between gateway and backends (zero-trust internal)"
  },
  {
    "title": "Mobile App Performance Optimization",
    "goal": "## Performance Sprint: 8 Weeks to Target Metrics\n\n### Current vs. Target\n\n| Metric | iOS | Android | Target |\n|--------|-----|---------|--------|\n| Cold start | 3.2s | 4.1s | <1.5s |\n| TTI (home screen) | 2.8s | 3.5s | <1.0s |\n| JS bundle size | 2.4MB | 2.4MB | <800KB |\n| Memory (steady state) | 180MB | 220MB | <120MB |\n| Crash-free sessions | 99.1% | 98.3% | >99.5% |\n| Battery drain (1h active) | 8% | 12% | <5% |\n\n### Root Causes\n\n1. **Bundle size**: 67% is three libraries — `moment.js` (330KB), full `lodash` (540KB), unused analytics SDK (280KB)\n2. **Cold start**: Synchronous init of 12 providers; only 3 needed before first paint\n3. **Memory**: Unbounded image cache, no eviction policy\n4. **Crashes**: 73% are `NullPointerException` from unguarded nullable API responses\n\n### Approach\n\nTargeted fixes, not a rewrite. Every fix A/B tested with rollback capability.",
    "requirements": "## Acceptance Criteria by Phase\n\n### Phase 1 — Bundle Diet (Week 1-2)\n- [ ] `moment.js` replaced with `date-fns` — all 47 call sites migrated\n- [ ] `lodash` → `lodash-es` with per-function imports (verified via bundle analyzer)\n- [ ] Unused analytics SDK removed, zero runtime references\n- [ ] Initial JS bundle ≤ 800KB\n- [ ] All existing E2E tests pass\n\n### Phase 2 — Startup Sequencing (Week 3-4)\n- [ ] Cold start under 1.5s on iPhone 12 and Pixel 6\n- [ ] TTI under 1.0s — home feed visible and scrollable\n- [ ] Tier 2 services initialize within 5s (not blocking UX)\n- [ ] Deep links resolve correctly during Tier 1 init\n\n### Phase 3 — Memory Management (Week 5-6)\n- [ ] Steady-state memory under 120MB after 30 min active use\n- [ ] Image cache respects 100MB cap (verified with 1000-image scroll test)\n- [ ] No OOM crashes in 4-hour soak test on 4GB RAM devices\n\n### Phase 4 — Crash Hardening (Week 7-8)\n- [ ] Crash-free session rate ≥ 99.5% (7-day rolling)\n- [ ] Zero `NullPointerException` from API response handling\n- [ ] Zod validation errors logged with full request context",
    "design": "## Optimization Strategy\n\n### Phase 1: Bundle Diet\n\n```\nCurrent: 2.4MB\n├── moment.js ────────── 330KB → date-fns/fp (28KB)     = -302KB\n├── lodash (full) ────── 540KB → lodash-es (tree-shake) = -410KB\n├── unused-analytics ─── 280KB → remove                 = -280KB\n├── react-native-maps ── 190KB → lazy load               = -190KB (deferred)\n└── remaining ──────────1060KB → code-split by route     = -200KB (initial)\nTarget: ~700KB initial load\n```\n\n### Phase 2: Startup Sequencing\n\n```\nTier 0 (blocking):  Auth, FeatureFlags, Cache         → 400ms\nTier 1 (async):     Analytics, Notifications, DeepLinks → background\nTier 2 (on-demand): Payments, Maps, Chat, Search, Recs  → lazy init\n```\n\n### Phase 3: Memory Management\n\n- LRU image cache: 100MB cap, 80MB eviction trigger\n- `onMemoryWarning` handler drops Tier 2 services\n- Fix 3 known retain cycles in navigation stack\n\n### Phase 4: Crash Hardening\n\n- Strict TypeScript types generated from OpenAPI specs\n- Zod runtime validation at API boundary\n- Global error boundary with Sentry breadcrumb context"
  }
]')

# Extract project IDs in order
P1_ID=$(echo "$PROJECTS" | grep -o '"id":"[^"]*"' | sed -n '1p' | cut -d'"' -f4)
P2_ID=$(echo "$PROJECTS" | grep -o '"id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
P3_ID=$(echo "$PROJECTS" | grep -o '"id":"[^"]*"' | sed -n '3p' | cut -d'"' -f4)
P4_ID=$(echo "$PROJECTS" | grep -o '"id":"[^"]*"' | sed -n '4p' | cut -d'"' -f4)
P5_ID=$(echo "$PROJECTS" | grep -o '"id":"[^"]*"' | sed -n '5p' | cut -d'"' -f4)

echo "  ✓ Project 1 (AI Code Review):  $P1_ID"
echo "  ✓ Project 2 (Collab Engine):   $P2_ID"
echo "  ✓ Project 3 (Observability):   $P3_ID"
echo "  ✓ Project 4 (Dev Portal):      $P4_ID"
echo "  ✓ Project 5 (Mobile Perf):     $P5_ID"

# ═══════════════════════════════════════════════════════════════════════════════
# TASKS — bulk create per project, with rich markdown plans
# ═══════════════════════════════════════════════════════════════════════════════

section "Creating Tasks — Project 1: AI Code Review"

P1_TASKS=$(post "$API/tasks" "[
  {
    \"project_id\": \"$P1_ID\",
    \"title\": \"Build diff parsing engine with semantic chunking\",
    \"plan\": \"## Approach\\n\\n1. Use \`parse-diff\` npm package as the foundation — handles unified diff format\\n2. Build enrichment layer that resolves file paths to repo-relative locations and fetches surrounding context (±50 lines) from base branch\\n3. Implement \`DiffChunk\` abstraction grouping related hunks by semantic proximity\\n4. Output structured \`ReviewableUnit[]\` array for LLM consumption\\n\\n## Edge Cases\\n\\n- **Binary files**: detect via magic bytes, skip with annotation\\n- **Renamed files**: track via \`similarity index\`, present as single unit\\n- **Large diffs (>500 files)**: batch in groups of 50, prioritize by additions\\n- **Submodule changes**: skip with annotation\"
  },
  {
    \"project_id\": \"$P1_ID\",
    \"title\": \"Implement context window builder with token budget management\",
    \"plan\": \"## Token Budget Strategy\\n\\n\`\`\`\\nTotal budget: 128K tokens\\n├── System prompt + instructions:  2K (fixed)\\n├── Diff content:                30K (variable, truncate if needed)\\n├── File-level context:          40K (surrounding code)\\n├── Type definitions + imports:  20K (dependency context)\\n├── Recent changes:              16K (git log context)\\n└── Response budget:             20K (reserved for output)\\n\`\`\`\\n\\n## Priority-Based Selection\\n\\n1. Always include: the diff itself (truncate largest files first)\\n2. High: type definitions imported by changed files\\n3. Medium: surrounding functions in changed files\\n4. Low: recent git history for changed files\\n5. Drop first: comments, whitespace-only lines\\n\\n## Notes\\n\\n- Use \`tiktoken\` for accurate token counting (cl100k_base)\\n- Cache parsed ASTs per file\\n- Emit telemetry: \`context_tokens_used\`, \`context_files_included\`\"
  },
  {
    \"project_id\": \"$P1_ID\",
    \"title\": \"Build review comment generation and severity classification\",
    \"plan\": \"## Approach\\n\\nGenerate line-level code review comments from LLM output using Claude structured output with \`tool_use\` for reliable parsing — eliminates need for regex fallback.\\n\\n## Output Schema\\n\\nEach comment includes:\\n- File path\\n- Line range (start, end)\\n- Severity: \`critical\` | \`suggestion\` | \`nitpick\` | \`question\`\\n- Comment body (markdown)\\n- Optional code suggestion (fenced code block)\\n\\n## Severity Distribution Target\\n\\n| Severity | Target % | Description |\\n|----------|----------|-------------|\\n| Critical | 10% | Bugs, security issues, data loss risks |\\n| Suggestion | 30% | Better approaches, performance improvements |\\n| Nitpick | 40% | Style, naming, minor improvements |\\n| Question | 20% | Unclear intent, missing context |\"
  },
  {
    \"project_id\": \"$P1_ID\",
    \"title\": \"Implement GitHub PR comment posting via REST API\",
    \"plan\": \"## Integration Points\\n\\n- **Checks API**: Create check run on PR open\\n- **Pull Request Reviews API**: Post batched review comments\\n- Batch all comments into single review to avoid notification spam\\n\\n## Rate Limiting Strategy\\n\\n- GitHub rate limit: 5000 req/hr\\n- Token refresh via GitHub App installation tokens\\n- Exponential backoff on 429 responses\\n- Graceful degradation: queue comments when GitHub is unavailable, post on recovery\"
  },
  {
    \"project_id\": \"$P1_ID\",
    \"title\": \"Build feedback tracking dashboard\",
    \"plan\": \"## Data Model\\n\\nTrack which AI-generated comments developers:\\n- **Accept** (resolve the comment)\\n- **Dismiss** (explicitly reject)\\n- **Modify** (edit before applying)\\n\\n## Dashboard Views\\n\\n1. **Acceptance rate by severity** — are critical comments more trusted than nitpicks?\\n2. **Acceptance rate by repository** — which repos benefit most?\\n3. **Acceptance rate by reviewer** — who engages with AI feedback?\\n4. **Trend over time** — 7/30/90 day windows\\n\\n## Feedback Loop\\n\\nUse acceptance signal to tune review generation prompts per-repo. Repos with high nitpick dismissal rate get fewer nitpicks.\"
  }
]")

P1_TASK_IDS=($(echo "$P1_TASKS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
for i in "${!P1_TASK_IDS[@]}"; do echo "  ✓ Task P1.$((i+1)): ${P1_TASK_IDS[$i]}"; done

section "Creating Tasks — Project 2: Collab Engine"

P2_TASKS=$(post "$API/tasks" "[
  {
    \"project_id\": \"$P2_ID\",
    \"title\": \"Implement Automerge CRDT document synchronization\",
    \"plan\": \"## Core Sync Loop\\n\\n\`\`\`typescript\\nasync function syncLoop(session: CollabSession) {\\n  const doc = Automerge.init<DocState>();\\n  const ws = new WebSocket(gatewayUrl);\\n\\n  session.onLocalChange((changeFn) => {\\n    const newDoc = Automerge.change(doc, changeFn);\\n    const patch = Automerge.getLastLocalChange(newDoc);\\n    ws.send(encodePatch(patch));\\n  });\\n\\n  ws.onmessage((msg) => {\\n    const patch = decodePatch(msg.data);\\n    const [newDoc] = Automerge.applyChanges(doc, [patch]);\\n    session.notifySubscribers(Automerge.diff(doc, newDoc));\\n  });\\n}\\n\`\`\`\\n\\n## Conflict Resolution\\n\\n1. **Concurrent field edits**: LWW per field (Automerge default)\\n2. **Concurrent list inserts**: ordered by actor ID (deterministic)\\n3. **Delete vs. edit**: delete wins\\n4. **Move vs. edit**: move wins, edit applied at new position\"
  },
  {
    \"project_id\": \"$P2_ID\",
    \"title\": \"Build WebSocket gateway on Cloudflare Durable Objects\",
    \"plan\": \"## Design\\n\\nEach document maps to exactly one Durable Object instance — single-writer semantics for the authoritative CRDT state.\\n\\n## Responsibilities\\n\\n- Connection upgrade and WebSocket lifecycle\\n- Heartbeat/keepalive (30s interval, 90s timeout)\\n- Fan-out of remote changes to all connected clients\\n- Graceful shutdown on Durable Object eviction\\n- Snapshot persistence to FoundationDB on idle (no writes for 5s)\"
  },
  {
    \"project_id\": \"$P2_ID\",
    \"title\": \"Implement offline queue with IndexedDB persistence\",
    \"plan\": \"## Offline Strategy\\n\\n1. Detect disconnect via WebSocket close + heartbeat timeout\\n2. Queue local ops in IndexedDB with LZ4 compression (~3x reduction)\\n3. Cap at 10MB storage, user-facing warning at 8MB\\n4. On reconnect: replay queued ops, merge via vector clocks\\n\\n## Reconnection\\n\\n- Exponential backoff with jitter: 1s initial, 30s max\\n- Resume from last known vector clock — no full re-sync\\n- Optimistic UI: local changes apply immediately, reconcile on reconnect\"
  },
  {
    \"project_id\": \"$P2_ID\",
    \"title\": \"Build presence system for cursor tracking\",
    \"plan\": \"## Design\\n\\nEphemeral presence state (not persisted in CRDT):\\n- Cursor position (row, col or path)\\n- Selection range\\n- Display name + avatar color\\n\\n## Broadcast\\n\\n- Side-channel on same WebSocket (message type: \`presence\`)\\n- Throttle to 15 updates/second per client\\n- Stale presence cleanup: 10s timeout after last heartbeat\\n\\n## Rendering\\n\\n- Colored cursors with name labels\\n- Fade-in/out animations for join/leave\\n- Overlap handling: offset labels when cursors are within 20px\"
  }
]")

P2_TASK_IDS=($(echo "$P2_TASKS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
for i in "${!P2_TASK_IDS[@]}"; do echo "  ✓ Task P2.$((i+1)): ${P2_TASK_IDS[$i]}"; done

section "Creating Tasks — Project 3: Observability"

P3_TASKS=$(post "$API/tasks" "[
  {
    \"project_id\": \"$P3_ID\",
    \"title\": \"Deploy OTel collector DaemonSet with k8s attribute enrichment\",
    \"plan\": \"## Collector Config\\n\\n\`\`\`yaml\\nreceivers:\\n  otlp:\\n    protocols:\\n      grpc: { endpoint: 0.0.0.0:4317 }\\n      http: { endpoint: 0.0.0.0:4318 }\\n\\nprocessors:\\n  batch: { timeout: 5s, send_batch_size: 8192 }\\n  resource:\\n    attributes:\\n      - { key: k8s.cluster.name, value: production, action: upsert }\\n  k8sattributes:\\n    extract:\\n      metadata: [k8s.namespace.name, k8s.pod.name, k8s.deployment.name, k8s.node.name]\\n\\nexporters:\\n  otlphttp/gateway:\\n    endpoint: http://otel-gateway.observability:4318\\n    compression: zstd\\n\`\`\`\\n\\n## Rollout\\n\\n1. Deploy to \`staging\` first, 48h burn-in\\n2. Canary to 5% production nodes, 24h monitor\\n3. Full rollout with PodDisruptionBudget (maxUnavailable: 10%)\"
  },
  {
    \"project_id\": \"$P3_ID\",
    \"title\": \"Implement tail-based trace sampling in gateway collector\",
    \"plan\": \"## Sampling Rules\\n\\n| Rule | Action | Rationale |\\n|------|--------|-----------|\\n| status = ERROR | Always keep | 100% error visibility |\\n| latency > P99 | Always keep | Performance anomaly detection |\\n| path in [checkout, auth, payment] | Always keep | Business-critical paths |\\n| Everything else | 10% probabilistic | 10x improvement over current 1% |\\n\\n## Expected Impact\\n\\n- Ingested: 180M spans/day\\n- Stored: ~25M spans/day (60% reduction vs. keeping all)\\n- 100% of interesting traces preserved\"
  },
  {
    \"project_id\": \"$P3_ID\",
    \"title\": \"Build dual-write validation framework\",
    \"plan\": \"## Validation Checks (hourly)\\n\\n1. **Metrics**: compare values at old Prometheus vs. new Mimir — within 0.1%\\n2. **Logs**: compare event count at old ELK vs. new Loki — within 1%\\n3. **Traces**: inject known errors, verify 100% presence in both pipelines\\n\\n## Auto-Halt Criteria\\n\\n- >0.1% data loss in any signal → halt migration\\n- P99 collector latency >500ms for >5 min → rollback via feature flag\\n\\n## Reporting\\n\\nSlack notification every hour with parity summary. Alert on threshold breach.\"
  },
  {
    \"project_id\": \"$P3_ID\",
    \"title\": \"Migrate log parsing rules from Logstash to OTel transform processor\",
    \"plan\": \"## Scope\\n\\nTranslate 27 Logstash grok patterns into OTel transform processor OTTL statements.\\n\\n## Log Types\\n\\n| Type | Count | Complexity |\\n|------|-------|-----------|\\n| nginx access logs | 3 patterns | Medium |\n| Application JSON logs | 8 patterns | Low |\\n| PostgreSQL slow query | 4 patterns | High |\\n| Kubernetes audit | 2 patterns | Medium |\\n| Payments team (undocumented) | 4 patterns | High |\\n| Other | 6 patterns | Low-Medium |\\n\\n## Verification\\n\\nField-by-field comparison for 1000 sample lines per pattern. Automated diff report.\"
  }
]")

P3_TASK_IDS=($(echo "$P3_TASKS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
for i in "${!P3_TASK_IDS[@]}"; do echo "  ✓ Task P3.$((i+1)): ${P3_TASK_IDS[$i]}"; done

section "Creating Tasks — Project 4: Dev Portal"

P4_TASKS=$(post "$API/tasks" "[
  {
    \"project_id\": \"$P4_ID\",
    \"title\": \"Build API spec discovery and registration pipeline\",
    \"plan\": \"## Pipeline\\n\\n1. **CI step**: extract \`openapi.yaml\`, upload to S3 at \`s3://api-specs/{service}/{sha}.yaml\`\\n2. **Spec watcher** (Lambda): S3 PUT trigger → validate with \`@readme/openapi-parser\` → reject invalid via GitHub status check\\n3. **Registry update**: valid specs → DynamoDB (\`service_name\`, \`version\`, \`spec_url\`, \`endpoints[]\`, \`updated_at\`)\\n4. **Portal sync**: poll registry every 60s, render via Redoc\"
  },
  {
    \"project_id\": \"$P4_ID\",
    \"title\": \"Implement OAuth2 + RBAC authentication layer in Envoy\",
    \"plan\": \"## Auth Flow\\n\\n1. Developer creates API key in portal → maps to OAuth2 client credentials\\n2. Envoy external auth filter validates JWT on every request\\n3. JWKS caching with automatic rotation detection (<1ms validation)\\n4. RBAC policies per-service, defined in portal UI, enforced at gateway\\n5. Service-to-service: client credentials grant + mTLS\"
  },
  {
    \"project_id\": \"$P4_ID\",
    \"title\": \"Build interactive API playground with Monaco editor\",
    \"plan\": \"## Features\\n\\n- Auto-populate request templates from OpenAPI specs\\n- Auth header injection (no manual token management)\\n- Syntax-highlighted responses with timing info\\n- Response schema validation (highlight unexpected fields)\\n- Environment switching: dev / staging / prod\\n- Request history (local storage, last 100 requests)\"
  },
  {
    \"project_id\": \"$P4_ID\",
    \"title\": \"Implement per-consumer usage analytics dashboard\",
    \"plan\": \"## Data Pipeline\\n\\n- Source: Envoy access logs → ClickHouse\\n- Retention: 90 days\\n- Granularity: per-consumer (API key), per-endpoint\\n\\n## Dashboard (Recharts)\\n\\n- Time-series: requests/min, P50/P95/P99 latency, error rate by status code\\n- Top consumers by volume\\n- Slowest endpoints (P95)\\n- Error hotspots\\n- Window selector: 7 / 30 / 90 days\"
  }
]")

P4_TASK_IDS=($(echo "$P4_TASKS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
for i in "${!P4_TASK_IDS[@]}"; do echo "  ✓ Task P4.$((i+1)): ${P4_TASK_IDS[$i]}"; done

section "Creating Tasks — Project 5: Mobile Perf"

P5_TASKS=$(post "$API/tasks" "[
  {
    \"project_id\": \"$P5_ID\",
    \"title\": \"Replace moment.js with date-fns and tree-shake lodash\",
    \"plan\": \"## Changes\\n\\n1. \`moment.js\` (330KB) → \`date-fns/fp\` (28KB): migrate all 47 date formatting call sites\\n2. \`lodash\` (540KB) → \`lodash-es\` with per-function imports: verify tree-shaking via bundle analyzer\\n3. Remove unused analytics SDK (280KB): grep for all references, remove package\\n4. Lazy-load \`react-native-maps\` (190KB): deferred import on map screen\\n\\n## Verification\\n\\n- \`react-native-bundle-visualizer\` output < 800KB initial\\n- All E2E tests pass\\n- Manual smoke test on iOS + Android\"
  },
  {
    \"project_id\": \"$P5_ID\",
    \"title\": \"Implement 3-tier startup sequencing\",
    \"plan\": \"## Current (synchronous, blocking)\\n\\n\`\`\`\\nApp mount → Auth → Analytics → FeatureFlags → Notifications → DeepLinks\\n          → Payments → Maps → Chat → Search → Recommendations → Cache\\n\`\`\`\\n\\n## Proposed (3-tier)\\n\\n| Tier | Services | Strategy | Budget |\\n|------|----------|----------|--------|\\n| 0 | Auth, FeatureFlags, Cache | Blocking | 400ms |\\n| 1 | Analytics, Notifications, DeepLinks | Async (background) | — |\\n| 2 | Payments, Maps, Chat, Search, Recs | On-demand (lazy) | — |\\n\\n## Verification\\n\\n- Cold start < 1.5s on iPhone 12 + Pixel 6 (Flipper)\\n- TTI < 1.0s (home feed visible + scrollable)\\n- Deep links resolve during Tier 1 init\"
  },
  {
    \"project_id\": \"$P5_ID\",
    \"title\": \"Implement LRU image cache with memory pressure handling\",
    \"plan\": \"## Cache Policy\\n\\n- **Hard cap**: 100MB\\n- **Eviction trigger**: 80MB (LRU)\\n- **Memory warning handler**: drop Tier 2 services + aggressive eviction\\n\\n## Additional Fixes\\n\\n- Profile and fix 3 known retain cycles in navigation stack\\n- Add memory telemetry: report steady-state usage every 5 min\\n\\n## Verification\\n\\n- Steady-state < 120MB after 30 min active use\\n- 1000-image scroll test stays under cap\\n- No OOM in 4-hour soak test on 4GB RAM device\"
  },
  {
    \"project_id\": \"$P5_ID\",
    \"title\": \"Generate strict TypeScript types and add Zod validation\",
    \"plan\": \"## Approach\\n\\n1. Generate TypeScript types from backend OpenAPI specs (eliminates nullable guessing)\\n2. Add Zod runtime validation at every API response boundary\\n3. Implement global error boundary with Sentry breadcrumb context\\n\\n## Expected Impact\\n\\n- Eliminates 73% of Android crashes (\`NullPointerException\` from unguarded nullable responses)\\n- Crash-free sessions: 98.3% → 99.5%+\\n- Zod validation errors logged with full request context for debugging\"
  }
]")

P5_TASK_IDS=($(echo "$P5_TASKS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
for i in "${!P5_TASK_IDS[@]}"; do echo "  ✓ Task P5.$((i+1)): ${P5_TASK_IDS[$i]}"; done

# ═══════════════════════════════════════════════════════════════════════════════
# SESSIONS — conversational sessions bound to projects
# ═══════════════════════════════════════════════════════════════════════════════

section "Creating Sessions"

# Session 1: P1 — closed, 10 days ago, lasted ~45 min
S1_STARTED=$(days_ago 10)
S1_FINISHED=$(days_ago_plus 10 2700)
S1=$(post "$API/sessions" "[{\"project_id\": \"$P1_ID\"}]")
S1_ID=$(jid "$S1")
patch "$API/sessions" "[{
  \"id\": \"$S1_ID\",
  \"summary\": \"Initial architecture session. Reviewed diff parsing approach, decided on parse-diff + semantic chunking. Set up context window budget (128K tokens). Spawned 3 agents: diff parser spike, token budget analysis, and GitHub API integration research.\",
  \"finished_at\": \"$S1_FINISHED\"
}]" > /dev/null
echo "  ✓ Session 1 (P1, closed):  $S1_ID"

# Session 2: P1 — closed, 7 days ago, lasted ~30 min
S2_STARTED=$(days_ago 7)
S2_FINISHED=$(days_ago_plus 7 1800)
S2=$(post "$API/sessions" "[{\"project_id\": \"$P1_ID\"}]")
S2_ID=$(jid "$S2")
patch "$API/sessions" "[{
  \"id\": \"$S2_ID\",
  \"summary\": \"Review comment severity calibration. Analyzed pilot data from first 200 PRs — adjusted severity distribution. Critical comments had too many false positives (10% → 8%). Nitpick dismissal rate was high, reduced volume (40% → 32%).\",
  \"finished_at\": \"$S2_FINISHED\"
}]" > /dev/null
echo "  ✓ Session 2 (P1, closed):  $S2_ID"

# Session 3: P2 — closed, 6 days ago, lasted ~1 hour
S3_STARTED=$(days_ago 6)
S3_FINISHED=$(days_ago_plus 6 3600)
S3=$(post "$API/sessions" "[{\"project_id\": \"$P2_ID\"}]")
S3_ID=$(jid "$S3")
patch "$API/sessions" "[{
  \"id\": \"$S3_ID\",
  \"summary\": \"CRDT engine deep dive. Evaluated Automerge vs Yjs for structured data — chose Automerge for better nested map/list support. Designed sync loop and conflict resolution rules. Spawned agent to prototype Durable Object gateway.\",
  \"finished_at\": \"$S3_FINISHED\"
}]" > /dev/null
echo "  ✓ Session 3 (P2, closed):  $S3_ID"

# Session 4: P3 — closed, 4 days ago, lasted ~20 min
S4_STARTED=$(days_ago 4)
S4_FINISHED=$(days_ago_plus 4 1200)
S4=$(post "$API/sessions" "[{\"project_id\": \"$P3_ID\"}]")
S4_ID=$(jid "$S4")
patch "$API/sessions" "[{
  \"id\": \"$S4_ID\",
  \"summary\": \"Tail sampling strategy review. Design was rejected — didn't account for cross-service trace correlation. Spawned 2 agents: one to research distributed tail sampling approaches, one to analyze current trace topology.\",
  \"finished_at\": \"$S4_FINISHED\"
}]" > /dev/null
echo "  ✓ Session 4 (P3, closed):  $S4_ID"

# Session 5: P4 — closed, 2 days ago, lasted ~35 min
S5_STARTED=$(days_ago 2)
S5_FINISHED=$(days_ago_plus 2 2100)
S5=$(post "$API/sessions" "[{\"project_id\": \"$P4_ID\"}]")
S5_ID=$(jid "$S5")
patch "$API/sessions" "[{
  \"id\": \"$S5_ID\",
  \"summary\": \"API spec discovery pipeline design. Mapped out CI → S3 → validator → registry → portal flow. Decided on Envoy for gateway with JWT validation + RBAC. Spawned agent to scaffold the OpenAPI spec watcher Lambda.\",
  \"finished_at\": \"$S5_FINISHED\"
}]" > /dev/null
echo "  ✓ Session 5 (P4, closed):  $S5_ID"

# Session 6: P5 — closed, 1 day ago, lasted ~25 min
S6_STARTED=$(days_ago 1)
S6_FINISHED=$(days_ago_plus 1 1500)
S6=$(post "$API/sessions" "[{\"project_id\": \"$P5_ID\"}]")
S6_ID=$(jid "$S6")
patch "$API/sessions" "[{
  \"id\": \"$S6_ID\",
  \"summary\": \"Bundle diet planning. Identified top 3 offenders: moment.js (330KB), full lodash (540KB), unused analytics SDK (280KB). Mapped all 47 moment.js call sites. Spawned agent to verify tree-shaking results with lodash-es.\",
  \"finished_at\": \"$S6_FINISHED\"
}]" > /dev/null
echo "  ✓ Session 6 (P5, closed):  $S6_ID"

# Session 7: P1 — still active (current session)
S7=$(post "$API/sessions" "[{\"project_id\": \"$P1_ID\"}]")
S7_ID=$(jid "$S7")
echo "  ✓ Session 7 (P1, active):  $S7_ID"

# Session 8: P2 — still active
S8=$(post "$API/sessions" "[{\"project_id\": \"$P2_ID\"}]")
S8_ID=$(jid "$S8")
echo "  ✓ Session 8 (P2, active):  $S8_ID"

# ═══════════════════════════════════════════════════════════════════════════════
# AGENTS — create the 4 reusable agent definitions (identifier is unique)
# ═══════════════════════════════════════════════════════════════════════════════

section "Creating Agents"

AGENTS=$(post "$API/agents" '[
  {
    "identifier": "goal",
    "prompt": "You are a strategic product thinker. Given a project title and any existing context, define its north-star goal.\n\n## Output Format\n\nProduce a markdown document with:\n1. **One-liner**: A single sentence capturing the outcome\n2. **Problem statement**: What pain exists today, with data if available\n3. **Success criteria**: Measurable outcomes with specific targets and timeframes\n4. **Non-goals**: What this project explicitly will NOT do\n\n## Guidelines\n\n- Be specific — \"reduce latency\" is not a goal, \"reduce P95 latency from 800ms to 200ms\" is\n- Success criteria must be independently verifiable\n- Non-goals prevent scope creep — list the most tempting adjacent work",
    "agent": "tab:orchestrator",
    "enabled": true
  },
  {
    "identifier": "requirements",
    "prompt": "You are a requirements analyst. Given a project with its goal defined, produce a comprehensive requirements document.\n\n## Output Format\n\n### Functional Requirements\nTable with columns: ID, Requirement, Priority (P0/P1/P2), Acceptance Criteria\n\n### Non-Functional Requirements\nBulleted list covering: availability, scalability, security, observability, latency\n\n### Constraints\nHard constraints that bound the solution space (tech stack mandates, compliance requirements, budget limits)\n\n## Guidelines\n\n- P0 = must ship in v1, P1 = should ship in v1, P2 = nice to have\n- Every functional requirement needs a testable acceptance criterion\n- Non-functional requirements need specific numbers, not adjectives",
    "agent": "tab:orchestrator",
    "enabled": true
  },
  {
    "identifier": "design",
    "prompt": "You are a systems architect. Given a project with its goal and requirements defined, produce a high-level design document.\n\n## Output Format\n\n1. **Architecture diagram** (ASCII art showing components and data flow)\n2. **Key decisions**: Numbered list of important choices with rationale\n3. **Technology choices**: Table with component → technology → why\n4. **Data model**: Core entities and relationships\n5. **Failure modes**: What can go wrong and how the system handles it\n\n## Guidelines\n\n- Diagrams are mandatory — they force clarity\n- Every technology choice needs a \"why not X\" counterpoint\n- Design for the 90th percentile, handle the 99th, survive the 100th",
    "agent": "tab:orchestrator",
    "enabled": true
  },
  {
    "identifier": "plan",
    "prompt": "You are an implementation planner. Given a task title and its parent project context, produce a detailed implementation plan.\n\n## Output Format\n\n1. **Approach**: High-level strategy (2-3 sentences)\n2. **Steps**: Numbered implementation steps with enough detail to execute\n3. **Edge cases**: Bullet list of things that could go wrong\n4. **Verification**: How to confirm the implementation is correct\n\n## Guidelines\n\n- Steps should be small enough to complete in one sitting\n- Edge cases are where bugs live — be thorough\n- Verification should be automatable where possible",
    "agent": "tab:executor",
    "enabled": true
  }
]')

AGENT_IDS=($(echo "$AGENTS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
AG_GOAL_ID="${AGENT_IDS[0]}"
AG_REQS_ID="${AGENT_IDS[1]}"
AG_DESIGN_ID="${AGENT_IDS[2]}"
AG_PLAN_ID="${AGENT_IDS[3]}"

echo "  ✓ Agent (goal):         $AG_GOAL_ID"
echo "  ✓ Agent (requirements): $AG_REQS_ID"
echo "  ✓ Agent (design):       $AG_DESIGN_ID"
echo "  ✓ Agent (plan):         $AG_PLAN_ID"

# ═══════════════════════════════════════════════════════════════════════════════
# RUNS — simulate orchestration with realistic timestamps spread over 14 days
# ═══════════════════════════════════════════════════════════════════════════════

section "Creating Runs — Goal agents on all projects (spread over days 12-8)"

# P1 goal: 12 days ago, took 25s
create_and_finish "goal" "project" "$P1_ID" 12 25
# P2 goal: 11 days ago, took 42s
create_and_finish "goal" "project" "$P2_ID" 11 42
# P3 goal: 10 days ago, took 18s
create_and_finish "goal" "project" "$P3_ID" 10 18
# P4 goal: still running (recent)
create_running "goal" "project" "$P4_ID"
# P5 goal: failed 9 days ago (took 8s), retried 9 days ago (took 35s)
create_and_finish "goal" "project" "$P5_ID" 9 8 "failed" "Error: context window exceeded. Project description too long for single-pass goal extraction."
create_and_finish "goal" "project" "$P5_ID" 9 35

section "Creating Runs — Requirements agents on projects 1-3 (days 8-6)"

# P1 reqs: 8 days ago, took 65s
create_and_finish "requirements" "project" "$P1_ID" 8 65
# P2 reqs: 7 days ago, took 48s
create_and_finish "requirements" "project" "$P2_ID" 7 48
# P3 reqs: 6 days ago, took 90s
create_and_finish "requirements" "project" "$P3_ID" 6 90

section "Creating Runs — Design agents (days 5-3)"

# P1 design: 5 days ago, took 120s
create_and_finish "design" "project" "$P1_ID" 5 120
# P2 design: 4 days ago, took 85s
create_and_finish "design" "project" "$P2_ID" 4 85
# P3 design: failed 3 days ago (took 15s)
create_and_finish "design" "project" "$P3_ID" 3 15 "failed" "Design rejected: tail sampling strategy does not account for cross-service trace correlation."

section "Creating Runs — Plan agents on tasks (days 4-0)"

# P1 tasks: done over days 4-2, varying durations
DURATIONS_P1=(30 55 45 22 70)
for i in "${!P1_TASK_IDS[@]}"; do
  TID="${P1_TASK_IDS[$i]}"
  DAYS_BACK=$((4 - i))
  if [ "$DAYS_BACK" -lt 1 ]; then DAYS_BACK=1; fi
  create_and_finish "plan" "task" "$TID" "$DAYS_BACK" "${DURATIONS_P1[$i]}"
done

# P2 tasks: first 2 done (days 3-2), last 2 still running
for i in 0 1; do
  TID="${P2_TASK_IDS[$i]}"
  DAYS_BACK=$((3 - i))
  DURATION=$((40 + i * 20))
  create_and_finish "plan" "task" "$TID" "$DAYS_BACK" "$DURATION"
done
for i in 2 3; do
  TID="${P2_TASK_IDS[$i]}"
  create_running "plan" "task" "$TID"
done

section "Creating Runs — Extra historical entries for chart density"

# Scatter additional goal/req runs across days 14-7 for richer chart data
create_and_finish "goal" "project" "$P1_ID" 14 32
create_and_finish "requirements" "project" "$P1_ID" 13 55
create_and_finish "goal" "project" "$P2_ID" 13 28
create_and_finish "design" "project" "$P1_ID" 12 95
create_and_finish "requirements" "project" "$P2_ID" 11 72
create_and_finish "goal" "project" "$P3_ID" 10 38 "failed" "Timeout after 38s — upstream model overloaded."
create_and_finish "goal" "project" "$P3_ID" 10 22
create_and_finish "plan" "task" "${P1_TASK_IDS[0]}" 9 40
create_and_finish "plan" "task" "${P1_TASK_IDS[1]}" 8 65
create_and_finish "design" "project" "$P2_ID" 7 110
create_and_finish "requirements" "project" "$P3_ID" 6 80
create_and_finish "plan" "task" "${P1_TASK_IDS[2]}" 5 50
create_and_finish "plan" "task" "${P2_TASK_IDS[0]}" 4 35
create_and_finish "goal" "project" "$P4_ID" 3 20 "failed" "Rate limited — retry after cooldown."
create_and_finish "requirements" "project" "$P4_ID" 2 58
create_and_finish "plan" "task" "${P2_TASK_IDS[1]}" 1 45

# ═══════════════════════════════════════════════════════════════════════════════
# UPDATES — project and task modifications
# ═══════════════════════════════════════════════════════════════════════════════

section "Updating Projects"

patch "$API/projects" "[{
  \"id\": \"$P1_ID\",
  \"title\": \"AI-Powered Code Review Platform (Phase 2)\"
}]" > /dev/null
echo "  ✓ Updated P1 title (phase 2)"

patch "$API/projects" "[{
  \"id\": \"$P3_ID\",
  \"goal\": \"## Unified Observability via OpenTelemetry\\n\\n### Updated Target\\n\\nPhase 1 scope narrowed to **metrics cutover only**. Traces and logs deferred to Phase 2 after discovering additional Logstash patterns.\\n\\n### Success Criteria (Phase 1)\\n\\n- All metrics flowing through OTel collectors\\n- Prometheus decommissioned\\n- Zero data loss during cutover\\n- Cost reduction: $48K → $38K/month (metrics portion only)\"
}]" > /dev/null
echo "  ✓ Updated P3 goal (scoped to phase 1)"

section "Updating Tasks"

patch "$API/tasks" "[{
  \"id\": \"${P1_TASK_IDS[2]}\",
  \"plan\": \"## Approach\\n\\nGenerate line-level code review comments from LLM output using Claude structured output with \`tool_use\` — eliminates regex fallback.\\n\\n## UPDATE: Severity tuning\\n\\nAfter pilot data from first 200 PRs, adjusted distribution:\\n\\n| Severity | Original Target | Revised Target | Reason |\\n|----------|----------------|---------------|--------|\\n| Critical | 10% | 8% | Too many false positives at 10% eroded trust |\\n| Suggestion | 30% | 35% | Most-acted-upon category |\\n| Nitpick | 40% | 32% | High dismissal rate, reducing volume |\\n| Question | 20% | 25% | Developers report these spark useful discussion |\"
}]" > /dev/null
echo "  ✓ Updated P1 task 3 plan (severity tuning from pilot data)"

patch "$API/tasks" "[{
  \"id\": \"${P3_TASK_IDS[3]}\",
  \"title\": \"Migrate 27 log parsing rules from Logstash to OTel transform processor\",
  \"plan\": \"## Updated Scope\\n\\n~~23~~ **27** Logstash grok patterns to migrate (4 undocumented patterns discovered in payments team config).\\n\\n## Log Types\\n\\n| Type | Count | Complexity |\\n|------|-------|-----------|\\n| nginx access | 3 | Medium |\\n| App JSON | 8 | Low |\\n| PostgreSQL slow query | 4 | High |\\n| K8s audit | 2 | Medium |\\n| Payments (undocumented) | 4 | High |\\n| Other | 6 | Low-Medium |\\n\\n## Verification\\n\\nField-by-field diff for 1000 samples per pattern. Automated report.\"
}]" > /dev/null
echo "  ✓ Updated P3 task 4 (scope increase: 23 → 27 patterns)"

# ═══════════════════════════════════════════════════════════════════════════════
# READ QUERIES — exercise pagination, filters, individual lookups
# ═══════════════════════════════════════════════════════════════════════════════

section "Read Queries — Pagination"

get "$API/projects?limit=2&offset=0" > /dev/null
echo "  ✓ GET /api/projects?limit=2&offset=0"
get "$API/projects?limit=2&offset=2" > /dev/null
echo "  ✓ GET /api/projects?limit=2&offset=2"
get "$API/projects?limit=2&offset=4" > /dev/null
echo "  ✓ GET /api/projects?limit=2&offset=4"
get "$API/projects?limit=200" > /dev/null
echo "  ✓ GET /api/projects?limit=200 (max page)"

get "$API/tasks?project_id=$P1_ID&limit=2&offset=0" > /dev/null
echo "  ✓ GET P1 tasks page 1"
get "$API/tasks?project_id=$P1_ID&limit=2&offset=2" > /dev/null
echo "  ✓ GET P1 tasks page 2"
get "$API/tasks?project_id=$P1_ID&limit=2&offset=4" > /dev/null
echo "  ✓ GET P1 tasks page 3"
get "$API/tasks?project_id=$P2_ID" > /dev/null
echo "  ✓ GET P2 tasks (all)"
get "$API/tasks?project_id=$P3_ID" > /dev/null
echo "  ✓ GET P3 tasks (all)"
get "$API/tasks?project_id=$P4_ID" > /dev/null
echo "  ✓ GET P4 tasks (all)"
get "$API/tasks?project_id=$P5_ID" > /dev/null
echo "  ✓ GET P5 tasks (all)"

get "$API/agents?limit=2&offset=0" > /dev/null
echo "  ✓ GET agents page 1"
get "$API/agents?limit=2&offset=2" > /dev/null
echo "  ✓ GET agents page 2"

get "$API/runs?limit=5&offset=0" > /dev/null
echo "  ✓ GET runs page 1"
get "$API/runs?limit=5&offset=5" > /dev/null
echo "  ✓ GET runs page 2"
get "$API/runs?limit=5&offset=10" > /dev/null
echo "  ✓ GET runs page 3"

section "Read Queries — Sessions"

get "$API/sessions?limit=5&offset=0" > /dev/null
echo "  ✓ GET sessions page 1"
get "$API/sessions?project_id=$P1_ID" > /dev/null
echo "  ✓ GET sessions for P1"
get "$API/sessions?project_id=$P2_ID" > /dev/null
echo "  ✓ GET sessions for P2"
get "$API/sessions/$S1_ID" > /dev/null
echo "  ✓ GET session $S1_ID"
get "$API/sessions/$S7_ID" > /dev/null
echo "  ✓ GET session $S7_ID (active)"

section "Read Queries — Filters"

get "$API/agents?identifier=goal" > /dev/null
echo "  ✓ GET agents?identifier=goal"
get "$API/agents?identifier=plan" > /dev/null
echo "  ✓ GET agents?identifier=plan"
get "$API/agents?identifier=design" > /dev/null
echo "  ✓ GET agents?identifier=design"
get "$API/agents?identifier=requirements" > /dev/null
echo "  ✓ GET agents?identifier=requirements"

get "$API/runs?entity_type=project" > /dev/null
echo "  ✓ GET runs?entity_type=project"
get "$API/runs?entity_type=task" > /dev/null
echo "  ✓ GET runs?entity_type=task"
get "$API/runs?status=running" > /dev/null
echo "  ✓ GET runs?status=running"
get "$API/runs?status=done" > /dev/null
echo "  ✓ GET runs?status=done"
get "$API/runs?status=failed" > /dev/null
echo "  ✓ GET runs?status=failed"
get "$API/runs?agent=goal" > /dev/null
echo "  ✓ GET runs?agent=goal"
get "$API/runs?agent=plan&status=done" > /dev/null
echo "  ✓ GET runs?agent=plan&status=done"
get "$API/runs?entity_type=project&entity_id=$P1_ID" > /dev/null
echo "  ✓ GET runs for project P1"
get "$API/runs?entity_type=task&entity_id=${P1_TASK_IDS[0]}" > /dev/null
echo "  ✓ GET runs for task P1.1"

section "Read Queries — Individual Resources"

for PID in "$P1_ID" "$P2_ID" "$P3_ID" "$P4_ID" "$P5_ID"; do
  get "$API/projects/$PID" > /dev/null
  echo "  ✓ GET /api/projects/$PID"
done

for TID in "${P1_TASK_IDS[@]}" "${P2_TASK_IDS[@]}" "${P3_TASK_IDS[@]}" "${P4_TASK_IDS[@]}" "${P5_TASK_IDS[@]}"; do
  get "$API/tasks/$TID" > /dev/null
  echo "  ✓ GET /api/tasks/$TID"
done

for AID in "$AG_GOAL_ID" "$AG_REQS_ID" "$AG_DESIGN_ID" "$AG_PLAN_ID"; do
  get "$API/agents/$AID" > /dev/null
  echo "  ✓ GET /api/agents/$AID"
done

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL — summary
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Traffic simulation complete."
echo "  Total API requests: $COUNT"
echo ""
echo "  Created: 5 projects, 21 tasks, 8 sessions, 4 agents, ~35 runs"
echo "  Updates: 2 project updates, 2 task updates, 6 session closes"
echo "  Sessions: 6 closed with summaries, 2 active"
echo "  Run lifecycle: done, failed, retry patterns across 14 days"
echo "  Read queries: pagination, filters, sessions, individual lookups"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
