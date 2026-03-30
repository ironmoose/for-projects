#!/usr/bin/env bash
# simulate-traffic.sh — exercise the projects + tasks API for WebSocket traffic testing
# Creates realistic project management data with high-quality markdown content.
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

# ─── Health Check ──────────────────────────────────────────────────────────────

section "Health Check"
get "$API/health" > /dev/null
echo "  ✓ GET /api/health"

# ─── Cleanup ──────────────────────────────────────────────────────────────────
# Wipe existing data so the script is idempotent on re-runs

section "Cleanup — removing existing data"

# Helper: extract IDs from a list endpoint (pipefail-safe)
extract_ids() { grep -o '"id":"[^"]*"' | cut -d'"' -f4 | tr '\n' ',' | sed 's/,$//'; }

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
# TASKS — bulk create per project, with rich markdown plans + new fields
# ═══════════════════════════════════════════════════════════════════════════════

section "Creating Tasks — Project 1: AI Code Review"

P1_TASKS=$(post "$API/tasks" "[
  {
    \"project_id\": \"$P1_ID\",
    \"title\": \"Build diff parsing engine with semantic chunking\",
    \"description\": \"Parse unified diffs from GitHub PRs into semantically meaningful chunks that group related hunks by file proximity and logical scope. This is the foundational input stage for the AI review pipeline.\",
    \"plan\": \"## Approach\\n\\n1. Use \`parse-diff\` npm package as the foundation — handles unified diff format\\n2. Build enrichment layer that resolves file paths to repo-relative locations and fetches surrounding context (±50 lines) from base branch\\n3. Implement \`DiffChunk\` abstraction grouping related hunks by semantic proximity\\n4. Output structured \`ReviewableUnit[]\` array for LLM consumption\\n\\n## Edge Cases\\n\\n- **Binary files**: detect via magic bytes, skip with annotation\\n- **Renamed files**: track via \`similarity index\`, present as single unit\\n- **Large diffs (>500 files)**: batch in groups of 50, prioritize by additions\\n- **Submodule changes**: skip with annotation\",
    \"implementation\": \"1. Install and configure \`parse-diff\` package with TypeScript types\\n2. Create \`DiffChunk\` and \`ReviewableUnit\` interfaces\\n3. Build \`DiffParser\` class that takes raw unified diff text and returns parsed hunks\\n4. Add enrichment layer to fetch surrounding context lines from the base branch via GitHub API\\n5. Implement semantic grouping algorithm that clusters hunks within the same file by line proximity (threshold: 20 lines)\\n6. Add binary file detection using magic byte signatures\\n7. Handle renamed files by correlating \`similarity index\` headers\\n8. Add batch splitting for large diffs (>500 files) with priority scoring by net additions\\n9. Write unit tests for each edge case\\n10. Integration test against 50 real PR diffs from pilot repos\",
    \"acceptance_criteria\": \"- [ ] Parses unified diffs from GitHub webhook payloads without errors\\n- [ ] Groups related hunks into semantic chunks (verified on 50 sample PRs)\\n- [ ] Skips binary files with annotation in output\\n- [ ] Handles renamed files as a single reviewable unit\\n- [ ] Processes diffs with >500 files by batching in groups of 50\\n- [ ] Surrounding context (±50 lines) fetched from base branch\\n- [ ] Output conforms to \`ReviewableUnit[]\` schema\\n- [ ] Unit tests cover all documented edge cases\\n- [ ] P95 parse time under 2 seconds for diffs with ≤100 files\"
  },
  {
    \"project_id\": \"$P1_ID\",
    \"title\": \"Implement context window builder with token budget management\",
    \"description\": \"Build the context assembly layer that packs relevant code, type definitions, and git history into the LLM prompt while staying within the 128K token budget. Priority-based selection ensures the most important context is always included.\",
    \"plan\": \"## Token Budget Strategy\\n\\n\`\`\`\\nTotal budget: 128K tokens\\n├── System prompt + instructions:  2K (fixed)\\n├── Diff content:                30K (variable, truncate if needed)\\n├── File-level context:          40K (surrounding code)\\n├── Type definitions + imports:  20K (dependency context)\\n├── Recent changes:              16K (git log context)\\n└── Response budget:             20K (reserved for output)\\n\`\`\`\\n\\n## Priority-Based Selection\\n\\n1. Always include: the diff itself (truncate largest files first)\\n2. High: type definitions imported by changed files\\n3. Medium: surrounding functions in changed files\\n4. Low: recent git history for changed files\\n5. Drop first: comments, whitespace-only lines\\n\\n## Notes\\n\\n- Use \`tiktoken\` for accurate token counting (cl100k_base)\\n- Cache parsed ASTs per file\\n- Emit telemetry: \`context_tokens_used\`, \`context_files_included\`\",
    \"implementation\": \"1. Set up \`tiktoken\` with cl100k_base encoding for accurate token counting\\n2. Define budget allocation constants and a \`BudgetTracker\` class\\n3. Build \`ContextBuilder\` that accepts \`ReviewableUnit[]\` and assembles the prompt\\n4. Implement priority queue for context items (diff > types > surrounding code > git log)\\n5. Add truncation logic that drops lowest-priority items first when over budget\\n6. Implement AST-based type definition extraction for TypeScript, Python, and Go\\n7. Add file-level context fetcher for surrounding functions\\n8. Build git log context extractor (last 10 commits touching changed files)\\n9. Add telemetry emission for token usage metrics\\n10. Cache parsed ASTs in LRU cache (100 entries max)\",
    \"acceptance_criteria\": \"- [ ] Assembled context never exceeds 128K tokens (verified with tiktoken)\\n- [ ] Diff content is always included, truncating largest files first if needed\\n- [ ] Type definitions for imported symbols are included when budget allows\\n- [ ] Token budget telemetry emitted on every invocation\\n- [ ] AST cache reduces repeat parse time by >80%\\n- [ ] Handles PRs in TypeScript, Python, and Go\\n- [ ] Reserved 20K token response budget is never consumed by context\"
  },
  {
    \"project_id\": \"$P1_ID\",
    \"title\": \"Build review comment generation and severity classification\",
    \"description\": \"Generate line-level code review comments from LLM output using Claude structured output, with severity classification into critical, suggestion, nitpick, and question categories.\",
    \"plan\": \"## Approach\\n\\nGenerate line-level code review comments from LLM output using Claude structured output with \`tool_use\` for reliable parsing — eliminates need for regex fallback.\\n\\n## Output Schema\\n\\nEach comment includes:\\n- File path\\n- Line range (start, end)\\n- Severity: \`critical\` | \`suggestion\` | \`nitpick\` | \`question\`\\n- Comment body (markdown)\\n- Optional code suggestion (fenced code block)\\n\\n## Severity Distribution Target\\n\\n| Severity | Target % | Description |\\n|----------|----------|-------------|\\n| Critical | 10% | Bugs, security issues, data loss risks |\\n| Suggestion | 30% | Better approaches, performance improvements |\\n| Nitpick | 40% | Style, naming, minor improvements |\\n| Question | 20% | Unclear intent, missing context |\",
    \"implementation\": \"1. Define the \`ReviewComment\` TypeScript interface with file path, line range, severity, body, and optional suggestion\\n2. Create the Claude tool definition schema for structured comment output\\n3. Build the prompt template that instructs Claude to use the review tool for each comment\\n4. Implement the LLM call with \`tool_use\` and parse the structured response\\n5. Add severity distribution validation and logging\\n6. Build comment deduplication logic (same file + overlapping line range)\\n7. Add confidence scoring based on context coverage\\n8. Write integration tests with mock LLM responses\\n9. Test against 20 real PRs and validate severity distribution\",
    \"acceptance_criteria\": \"- [ ] Comments are generated using Claude structured output (tool_use)\\n- [ ] Each comment includes file path, line range, severity, and body\\n- [ ] Severity distribution within 5% of target for sample of 100+ comments\\n- [ ] No duplicate comments on the same line range\\n- [ ] Optional code suggestion blocks are valid, fenced markdown\\n- [ ] Handles PRs with 0 reviewable issues gracefully (empty comment list)\\n- [ ] P95 generation time under 30 seconds per PR\"
  },
  {
    \"project_id\": \"$P1_ID\",
    \"title\": \"Implement GitHub PR comment posting via REST API\",
    \"description\": \"Integrate with GitHub's Pull Request Reviews API to post batched AI-generated review comments. All comments are posted as a single review to avoid notification spam, with rate limiting and retry logic.\",
    \"plan\": \"## Integration Points\\n\\n- **Checks API**: Create check run on PR open\\n- **Pull Request Reviews API**: Post batched review comments\\n- Batch all comments into single review to avoid notification spam\\n\\n## Rate Limiting Strategy\\n\\n- GitHub rate limit: 5000 req/hr\\n- Token refresh via GitHub App installation tokens\\n- Exponential backoff on 429 responses\\n- Graceful degradation: queue comments when GitHub is unavailable, post on recovery\",
    \"implementation\": \"1. Set up GitHub App authentication with installation token refresh\\n2. Create a \`GitHubClient\` class wrapping Octokit with retry and rate limit handling\\n3. Implement check run creation on \`pull_request.opened\` webhook\\n4. Build comment batching logic that groups all comments into a single PR review\\n5. Map \`ReviewComment[]\` to GitHub review comment format (path, position, body)\\n6. Implement exponential backoff with jitter for 429 and 5xx responses\\n7. Add a dead-letter queue for failed comment deliveries\\n8. Update check run status (success/failure) after posting\\n9. Add integration tests against GitHub API sandbox\",
    \"acceptance_criteria\": \"- [ ] Comments posted as a single GitHub review (not individual comments)\\n- [ ] Check run created within 5 seconds of webhook receipt\\n- [ ] Review posted within 60 seconds of webhook receipt (end-to-end)\\n- [ ] Rate limiting handles 429 responses with exponential backoff\\n- [ ] Failed deliveries are queued and retried automatically\\n- [ ] GitHub App tokens refresh transparently before expiry\\n- [ ] No notification spam — one review notification per PR per run\"
  },
  {
    \"project_id\": \"$P1_ID\",
    \"title\": \"Build feedback tracking dashboard\",
    \"description\": \"Track how developers interact with AI-generated review comments (accept, dismiss, modify) and visualize acceptance rates across repos, reviewers, and severity levels in a dashboard.\",
    \"plan\": \"## Data Model\\n\\nTrack which AI-generated comments developers:\\n- **Accept** (resolve the comment)\\n- **Dismiss** (explicitly reject)\\n- **Modify** (edit before applying)\\n\\n## Dashboard Views\\n\\n1. **Acceptance rate by severity** — are critical comments more trusted than nitpicks?\\n2. **Acceptance rate by repository** — which repos benefit most?\\n3. **Acceptance rate by reviewer** — who engages with AI feedback?\\n4. **Trend over time** — 7/30/90 day windows\\n\\n## Feedback Loop\\n\\nUse acceptance signal to tune review generation prompts per-repo. Repos with high nitpick dismissal rate get fewer nitpicks.\",
    \"implementation\": \"1. Design the feedback events schema (comment_id, action, reviewer, timestamp)\\n2. Set up webhook listeners for PR review comment resolve/dismiss events\\n3. Build the feedback ingestion pipeline and store events in ClickHouse\\n4. Create aggregation queries for acceptance rate by severity, repo, and reviewer\\n5. Build React dashboard components with Recharts for time-series visualization\\n6. Add window selector (7/30/90 days) with efficient pre-aggregated queries\\n7. Implement per-repo prompt tuning config based on acceptance signals\\n8. Add CSV export for reporting\",
    \"acceptance_criteria\": \"- [ ] Tracks accept, dismiss, and modify actions for every AI comment\\n- [ ] Dashboard shows acceptance rate by severity, repo, and reviewer\\n- [ ] Time window selector works for 7, 30, and 90 day periods\\n- [ ] Data refreshes within 5 minutes of feedback event\\n- [ ] Per-repo prompt tuning config adjustable from dashboard\\n- [ ] CSV export includes all feedback events with metadata\"
  }
]")

P1_TASK_IDS=($(echo "$P1_TASKS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
for i in "${!P1_TASK_IDS[@]}"; do echo "  ✓ Task P1.$((i+1)): ${P1_TASK_IDS[$i]}"; done

section "Creating Tasks — Project 2: Collab Engine"

P2_TASKS=$(post "$API/tasks" "[
  {
    \"project_id\": \"$P2_ID\",
    \"title\": \"Implement Automerge CRDT document synchronization\",
    \"description\": \"Build the core sync loop using Automerge for CRDT-based document synchronization. This handles local changes, remote patch application, and conflict resolution for structured data types.\",
    \"plan\": \"## Core Sync Loop\\n\\n\`\`\`typescript\\nasync function syncLoop(session: CollabSession) {\\n  const doc = Automerge.init<DocState>();\\n  const ws = new WebSocket(gatewayUrl);\\n\\n  session.onLocalChange((changeFn) => {\\n    const newDoc = Automerge.change(doc, changeFn);\\n    const patch = Automerge.getLastLocalChange(newDoc);\\n    ws.send(encodePatch(patch));\\n  });\\n\\n  ws.onmessage((msg) => {\\n    const patch = decodePatch(msg.data);\\n    const [newDoc] = Automerge.applyChanges(doc, [patch]);\\n    session.notifySubscribers(Automerge.diff(doc, newDoc));\\n  });\\n}\\n\`\`\`\\n\\n## Conflict Resolution\\n\\n1. **Concurrent field edits**: LWW per field (Automerge default)\\n2. **Concurrent list inserts**: ordered by actor ID (deterministic)\\n3. **Delete vs. edit**: delete wins\\n4. **Move vs. edit**: move wins, edit applied at new position\",
    \"implementation\": \"1. Initialize Automerge document with typed schema matching DocState interface\\n2. Implement the sync loop connecting local changes to WebSocket transport\\n3. Build patch encoding/decoding for efficient binary transport\\n4. Wire up subscriber notification on remote change application\\n5. Implement vector clock tracking for causal ordering\\n6. Add conflict resolution tests for concurrent field edits, list inserts, and delete-vs-edit\\n7. Build reconnection logic that replays missed patches from vector clock\\n8. Performance test with 50 concurrent editors\",
    \"acceptance_criteria\": \"- [ ] Local changes propagate to remote peers within 100ms (same region)\\n- [ ] Concurrent edits on same field resolve deterministically via LWW\\n- [ ] Concurrent list inserts maintain consistent ordering across all peers\\n- [ ] Delete-vs-edit conflicts resolve with delete winning\\n- [ ] 50-user concurrent editing produces identical document state on all clients\\n- [ ] Vector clock correctly identifies causal ordering\\n- [ ] No data loss during reconnection from network interruption\"
  },
  {
    \"project_id\": \"$P2_ID\",
    \"title\": \"Build WebSocket gateway on Cloudflare Durable Objects\",
    \"description\": \"Deploy the WebSocket gateway on Cloudflare Durable Objects so each document maps to exactly one instance, providing single-writer semantics for the authoritative CRDT state.\",
    \"plan\": \"## Design\\n\\nEach document maps to exactly one Durable Object instance — single-writer semantics for the authoritative CRDT state.\\n\\n## Responsibilities\\n\\n- Connection upgrade and WebSocket lifecycle\\n- Heartbeat/keepalive (30s interval, 90s timeout)\\n- Fan-out of remote changes to all connected clients\\n- Graceful shutdown on Durable Object eviction\\n- Snapshot persistence to FoundationDB on idle (no writes for 5s)\",
    \"implementation\": \"1. Scaffold Cloudflare Worker with Durable Object binding\\n2. Implement WebSocket upgrade handler with JWT validation\\n3. Build connection registry tracking all active WebSocket clients per document\\n4. Implement heartbeat/keepalive (30s ping, 90s timeout, auto-disconnect)\\n5. Build fan-out logic that broadcasts patches to all connected clients except sender\\n6. Add idle detection (5s no writes) triggering snapshot to FoundationDB\\n7. Implement graceful shutdown that flushes pending writes on DO eviction\\n8. Load test with 200 concurrent connections per document\",
    \"acceptance_criteria\": \"- [ ] Each document maps to exactly one Durable Object instance\\n- [ ] WebSocket connections authenticate via JWT on upgrade\\n- [ ] Heartbeat detects and disconnects stale clients within 90 seconds\\n- [ ] Patches fan out to all connected peers within 15ms\\n- [ ] Snapshot persists to FoundationDB after 5 seconds of idle\\n- [ ] Graceful shutdown flushes all pending state\\n- [ ] Handles 200 concurrent connections per document without errors\"
  },
  {
    \"project_id\": \"$P2_ID\",
    \"title\": \"Implement offline queue with IndexedDB persistence\",
    \"description\": \"Enable offline editing by queuing local operations in IndexedDB during network disconnection, with automatic replay and merge on reconnection using vector clocks.\",
    \"plan\": \"## Offline Strategy\\n\\n1. Detect disconnect via WebSocket close + heartbeat timeout\\n2. Queue local ops in IndexedDB with LZ4 compression (~3x reduction)\\n3. Cap at 10MB storage, user-facing warning at 8MB\\n4. On reconnect: replay queued ops, merge via vector clocks\\n\\n## Reconnection\\n\\n- Exponential backoff with jitter: 1s initial, 30s max\\n- Resume from last known vector clock — no full re-sync\\n- Optimistic UI: local changes apply immediately, reconcile on reconnect\",
    \"implementation\": \"1. Add WebSocket connection state monitoring (connected, disconnected, reconnecting)\\n2. Create IndexedDB store for queued operations with LZ4 compression\\n3. Implement storage quota tracking with 8MB warning and 10MB hard cap\\n4. Build operation replay logic that sends queued ops on reconnection\\n5. Implement vector clock comparison to determine sync resume point\\n6. Add exponential backoff with jitter for reconnection attempts (1s to 30s)\\n7. Wire up optimistic UI so local changes apply instantly regardless of connection state\\n8. Test offline editing for 30 minutes, then reconnect and verify merge\",
    \"acceptance_criteria\": \"- [ ] Local changes apply to UI instantly during offline mode\\n- [ ] Operations queued in IndexedDB with LZ4 compression\\n- [ ] Storage warning displayed at 8MB, hard cap at 10MB\\n- [ ] Reconnection uses exponential backoff with jitter (1s to 30s max)\\n- [ ] Queued ops replay correctly on reconnection via vector clock resume\\n- [ ] No data loss after 30-minute offline editing session\\n- [ ] Full document consistency verified after reconnection merge\"
  },
  {
    \"project_id\": \"$P2_ID\",
    \"title\": \"Build presence system for cursor tracking\",
    \"description\": \"Implement ephemeral presence tracking for live cursor positions, selection ranges, and user identity. Rendered as colored cursors with name labels, with stale presence cleanup.\",
    \"plan\": \"## Design\\n\\nEphemeral presence state (not persisted in CRDT):\\n- Cursor position (row, col or path)\\n- Selection range\\n- Display name + avatar color\\n\\n## Broadcast\\n\\n- Side-channel on same WebSocket (message type: \`presence\`)\\n- Throttle to 15 updates/second per client\\n- Stale presence cleanup: 10s timeout after last heartbeat\\n\\n## Rendering\\n\\n- Colored cursors with name labels\\n- Fade-in/out animations for join/leave\\n- Overlap handling: offset labels when cursors are within 20px\",
    \"implementation\": \"1. Define presence message schema (cursor position, selection, display name, color)\\n2. Add presence message type to WebSocket protocol alongside CRDT patches\\n3. Implement client-side presence broadcaster with 15 updates/sec throttle\\n4. Build server-side presence aggregator that tracks all peer cursors per document\\n5. Implement stale presence cleanup (10s timeout after last heartbeat)\\n6. Build cursor rendering component with colored indicators and name labels\\n7. Add fade-in/out CSS animations for join and leave events\\n8. Handle cursor overlap by offsetting labels when within 20px\",
    \"acceptance_criteria\": \"- [ ] Cursor positions broadcast to all peers within 50ms\\n- [ ] Presence updates throttled to 15/second per client\\n- [ ] Stale cursors removed within 10 seconds of peer disconnect\\n- [ ] Each peer displays with unique color and name label\\n- [ ] Overlapping cursors offset labels to avoid occlusion\\n- [ ] Join/leave animations render smoothly at 60fps\\n- [ ] Presence state is ephemeral — not persisted in CRDT or database\"
  }
]")

P2_TASK_IDS=($(echo "$P2_TASKS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
for i in "${!P2_TASK_IDS[@]}"; do echo "  ✓ Task P2.$((i+1)): ${P2_TASK_IDS[$i]}"; done

section "Creating Tasks — Project 3: Observability"

P3_TASKS=$(post "$API/tasks" "[
  {
    \"project_id\": \"$P3_ID\",
    \"title\": \"Deploy OTel collector DaemonSet with k8s attribute enrichment\",
    \"description\": \"Deploy the OpenTelemetry collector as a Kubernetes DaemonSet on every node, configured to receive OTLP signals and enrich them with k8s metadata before forwarding to the gateway collector.\",
    \"plan\": \"## Collector Config\\n\\n\`\`\`yaml\\nreceivers:\\n  otlp:\\n    protocols:\\n      grpc: { endpoint: 0.0.0.0:4317 }\\n      http: { endpoint: 0.0.0.0:4318 }\\n\\nprocessors:\\n  batch: { timeout: 5s, send_batch_size: 8192 }\\n  resource:\\n    attributes:\\n      - { key: k8s.cluster.name, value: production, action: upsert }\\n  k8sattributes:\\n    extract:\\n      metadata: [k8s.namespace.name, k8s.pod.name, k8s.deployment.name, k8s.node.name]\\n\\nexporters:\\n  otlphttp/gateway:\\n    endpoint: http://otel-gateway.observability:4318\\n    compression: zstd\\n\`\`\`\\n\\n## Rollout\\n\\n1. Deploy to \`staging\` first, 48h burn-in\\n2. Canary to 5% production nodes, 24h monitor\\n3. Full rollout with PodDisruptionBudget (maxUnavailable: 10%)\",
    \"implementation\": \"1. Create Helm chart for OTel collector DaemonSet with configurable values\\n2. Configure OTLP receivers for both gRPC (4317) and HTTP (4318)\\n3. Set up k8sattributes processor to extract namespace, pod, deployment, and node metadata\\n4. Configure batch processor (5s timeout, 8192 batch size) for efficient export\\n5. Add zstd compression on the OTLP HTTP exporter to gateway\\n6. Deploy to staging namespace and run 48-hour burn-in with metrics validation\\n7. Canary deploy to 5% of production nodes with 24-hour monitoring window\\n8. Full production rollout with PodDisruptionBudget (maxUnavailable: 10%)\\n9. Verify all signals enriched with k8s metadata in Grafana\",
    \"acceptance_criteria\": \"- [ ] DaemonSet runs on every node in staging and production\\n- [ ] OTLP/gRPC and OTLP/HTTP receivers accept signals from application pods\\n- [ ] All signals enriched with k8s.namespace.name, k8s.pod.name, k8s.deployment.name, k8s.node.name\\n- [ ] Batch processor reduces export calls by >5x vs. unbatched\\n- [ ] zstd compression reduces network bandwidth by >50%\\n- [ ] 48-hour staging burn-in passes with zero data loss\\n- [ ] PodDisruptionBudget ensures max 10% nodes unavailable during rollout\"
  },
  {
    \"project_id\": \"$P3_ID\",
    \"title\": \"Implement tail-based trace sampling in gateway collector\",
    \"description\": \"Configure the gateway OTel collector with tail-based sampling that keeps 100% of error and high-latency traces while probabilistically sampling 10% of the rest, reducing stored spans by 60%.\",
    \"plan\": \"## Sampling Rules\\n\\n| Rule | Action | Rationale |\\n|------|--------|-----------|\\n| status = ERROR | Always keep | 100% error visibility |\\n| latency > P99 | Always keep | Performance anomaly detection |\\n| path in [checkout, auth, payment] | Always keep | Business-critical paths |\\n| Everything else | 10% probabilistic | 10x improvement over current 1% |\\n\\n## Expected Impact\\n\\n- Ingested: 180M spans/day\\n- Stored: ~25M spans/day (60% reduction vs. keeping all)\\n- 100% of interesting traces preserved\",
    \"implementation\": \"1. Configure tail_sampling processor in gateway collector config\\n2. Define always-keep rules for error status codes (4xx, 5xx)\\n3. Add latency threshold rule using P99 from current baseline metrics\\n4. Configure path-based rules for critical business paths (checkout, auth, payment)\\n5. Set probabilistic sampling at 10% for all remaining traces\\n6. Deploy to staging and validate sampling decisions against known test traces\\n7. Compare storage volume before and after sampling in staging (target: 60% reduction)\\n8. Monitor for sampling bias — verify error traces are 100% captured\",
    \"acceptance_criteria\": \"- [ ] 100% of error traces (4xx/5xx status) are kept\\n- [ ] 100% of high-latency traces (above P99 threshold) are kept\\n- [ ] 100% of business-critical path traces are kept\\n- [ ] Remaining traces sampled at 10% probabilistic rate\\n- [ ] Stored spans reduced by approximately 60% vs. keeping all\\n- [ ] No sampling bias detected in error rate metrics\\n- [ ] Gateway collector P99 latency stays under 500ms\"
  },
  {
    \"project_id\": \"$P3_ID\",
    \"title\": \"Build dual-write validation framework\",
    \"description\": \"Create an automated validation framework that compares data between the legacy observability pipeline and the new OTel pipeline during the dual-write migration phase, with auto-halt on data loss.\",
    \"plan\": \"## Validation Checks (hourly)\\n\\n1. **Metrics**: compare values at old Prometheus vs. new Mimir — within 0.1%\\n2. **Logs**: compare event count at old ELK vs. new Loki — within 1%\\n3. **Traces**: inject known errors, verify 100% presence in both pipelines\\n\\n## Auto-Halt Criteria\\n\\n- >0.1% data loss in any signal → halt migration\\n- P99 collector latency >500ms for >5 min → rollback via feature flag\\n\\n## Reporting\\n\\nSlack notification every hour with parity summary. Alert on threshold breach.\",
    \"implementation\": \"1. Build validation runner that executes hourly via CronJob\\n2. Implement metrics parity checker: query same metric from Prometheus and Mimir, compare within 0.1%\\n3. Implement log count parity checker: compare event counts from ELK and Loki within 1%\\n4. Build trace injection test: emit known error traces, verify presence in both Jaeger and Tempo\\n5. Add auto-halt logic: if any parity check fails, disable new pipeline via feature flag\\n6. Set up Slack webhook integration for hourly parity summary reports\\n7. Add alerting for threshold breaches with PagerDuty escalation\\n8. Create dashboard showing parity trends over time\",
    \"acceptance_criteria\": \"- [ ] Metrics parity validated within 0.1% tolerance hourly\\n- [ ] Log event count parity validated within 1% tolerance hourly\\n- [ ] Injected error traces appear in both old and new pipelines\\n- [ ] Auto-halt triggers within 5 minutes of >0.1% data loss detection\\n- [ ] Feature flag rollback disables new pipeline within 30 seconds\\n- [ ] Slack notifications sent every hour with parity summary\\n- [ ] Dashboard shows parity trend data for the past 14 days\"
  },
  {
    \"project_id\": \"$P3_ID\",
    \"title\": \"Migrate log parsing rules from Logstash to OTel transform processor\",
    \"description\": \"Translate all 27 Logstash grok patterns into equivalent OTel transform processor OTTL statements, covering nginx, application JSON, PostgreSQL, Kubernetes audit, and undocumented payments team logs.\",
    \"plan\": \"## Scope\\n\\nTranslate 27 Logstash grok patterns into OTel transform processor OTTL statements.\\n\\n## Log Types\\n\\n| Type | Count | Complexity |\\n|------|-------|-----------|\\n| nginx access logs | 3 patterns | Medium |\n| Application JSON logs | 8 patterns | Low |\\n| PostgreSQL slow query | 4 patterns | High |\\n| Kubernetes audit | 2 patterns | Medium |\\n| Payments team (undocumented) | 4 patterns | High |\\n| Other | 6 patterns | Low-Medium |\\n\\n## Verification\\n\\nField-by-field comparison for 1000 sample lines per pattern. Automated diff report.\",
    \"implementation\": \"1. Inventory all 27 Logstash grok patterns and document their input/output schemas\\n2. Translate 8 low-complexity application JSON patterns to OTTL (batch 1)\\n3. Translate 3 nginx access log patterns to OTTL with field mapping verification\\n4. Translate 2 Kubernetes audit log patterns to OTTL\\n5. Translate 6 other low-medium complexity patterns to OTTL\\n6. Translate 4 PostgreSQL slow query patterns (high complexity, regex-heavy)\\n7. Reverse-engineer and translate 4 undocumented payments team patterns\\n8. Build automated field-by-field diff tool for validation\\n9. Run 1000-sample validation per pattern and generate diff reports\\n10. Fix any field mismatches and re-validate\",
    \"acceptance_criteria\": \"- [ ] All 27 Logstash grok patterns translated to OTTL statements\\n- [ ] Field-by-field validation passes for 1000 samples per pattern\\n- [ ] Zero field mismatches in automated diff reports\\n- [ ] Payments team patterns documented and validated with team owner\\n- [ ] OTel transform processor handles all log types without errors\\n- [ ] Processing latency comparable to Logstash (within 20% overhead)\\n- [ ] Rollback possible by re-enabling Logstash via feature flag\"
  }
]")

P3_TASK_IDS=($(echo "$P3_TASKS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
for i in "${!P3_TASK_IDS[@]}"; do echo "  ✓ Task P3.$((i+1)): ${P3_TASK_IDS[$i]}"; done

section "Creating Tasks — Project 4: Dev Portal"

P4_TASKS=$(post "$API/tasks" "[
  {
    \"project_id\": \"$P4_ID\",
    \"title\": \"Build API spec discovery and registration pipeline\",
    \"description\": \"Create the automated pipeline that discovers OpenAPI specs from CI builds, validates them, and registers them in the central API registry for the developer portal to consume.\",
    \"plan\": \"## Pipeline\\n\\n1. **CI step**: extract \`openapi.yaml\`, upload to S3 at \`s3://api-specs/{service}/{sha}.yaml\`\\n2. **Spec watcher** (Lambda): S3 PUT trigger → validate with \`@readme/openapi-parser\` → reject invalid via GitHub status check\\n3. **Registry update**: valid specs → DynamoDB (\`service_name\`, \`version\`, \`spec_url\`, \`endpoints[]\`, \`updated_at\`)\\n4. **Portal sync**: poll registry every 60s, render via Redoc\",
    \"implementation\": \"1. Add CI step to extract and upload openapi.yaml to S3 (s3://api-specs/{service}/{sha}.yaml)\\n2. Create Lambda function triggered by S3 PUT events\\n3. Integrate @readme/openapi-parser for spec validation in the Lambda\\n4. Post GitHub status check (pass/fail) based on validation result\\n5. On valid spec, write registry entry to DynamoDB with service name, version, spec URL, and endpoints\\n6. Build portal sync job that polls DynamoDB every 60 seconds\\n7. Render discovered specs via Redoc in the portal UI\\n8. Add monitoring for pipeline failures and stale specs\",
    \"acceptance_criteria\": \"- [ ] CI automatically uploads OpenAPI specs to S3 on merge to main\\n- [ ] Invalid specs rejected with GitHub status check failure and error details\\n- [ ] Valid specs registered in DynamoDB within 30 seconds of upload\\n- [ ] Portal displays new/updated specs within 60 seconds of registration\\n- [ ] Supports OpenAPI 3.0 and 3.1 spec formats\\n- [ ] Pipeline handles concurrent uploads from multiple services\\n- [ ] Stale specs (no update in 30 days) flagged in portal\"
  },
  {
    \"project_id\": \"$P4_ID\",
    \"title\": \"Implement OAuth2 + RBAC authentication layer in Envoy\",
    \"description\": \"Add JWT-based authentication and role-based access control to the Envoy API gateway, with automatic JWKS rotation and per-service RBAC policies managed through the developer portal.\",
    \"plan\": \"## Auth Flow\\n\\n1. Developer creates API key in portal → maps to OAuth2 client credentials\\n2. Envoy external auth filter validates JWT on every request\\n3. JWKS caching with automatic rotation detection (<1ms validation)\\n4. RBAC policies per-service, defined in portal UI, enforced at gateway\\n5. Service-to-service: client credentials grant + mTLS\",
    \"implementation\": \"1. Configure Envoy external authorization filter for JWT validation\\n2. Set up JWKS endpoint with automatic key rotation detection and caching\\n3. Build API key creation flow in portal UI mapping to OAuth2 client credentials\\n4. Implement client credentials grant endpoint for service-to-service auth\\n5. Create RBAC policy data model (consumer, service, allowed endpoints)\\n6. Build RBAC management UI in portal for defining per-service access policies\\n7. Configure mTLS between gateway and backend services\\n8. Add auth failure logging with request context for debugging\",
    \"acceptance_criteria\": \"- [ ] JWT validation completes in under 1ms with JWKS caching\\n- [ ] JWKS key rotation detected and applied automatically\\n- [ ] API keys created in portal work immediately for API access\\n- [ ] RBAC policies enforce per-service, per-endpoint access control\\n- [ ] Service-to-service auth uses client credentials + mTLS\\n- [ ] Unauthorized requests return 401 with descriptive error body\\n- [ ] Auth failures logged with full request context\"
  },
  {
    \"project_id\": \"$P4_ID\",
    \"title\": \"Build interactive API playground with Monaco editor\",
    \"description\": \"Create an in-browser API playground using Monaco editor that auto-populates request templates from OpenAPI specs, injects auth headers, and provides syntax-highlighted responses with timing info.\",
    \"plan\": \"## Features\\n\\n- Auto-populate request templates from OpenAPI specs\\n- Auth header injection (no manual token management)\\n- Syntax-highlighted responses with timing info\\n- Response schema validation (highlight unexpected fields)\\n- Environment switching: dev / staging / prod\\n- Request history (local storage, last 100 requests)\",
    \"implementation\": \"1. Integrate Monaco editor component with JSON and HTTP syntax highlighting\\n2. Build request template generator from OpenAPI spec schemas\\n3. Implement auth header auto-injection using stored API credentials\\n4. Add environment switcher (dev/staging/prod) with per-env base URLs\\n5. Build request executor with timing measurement and response display\\n6. Add response schema validation against the OpenAPI spec\\n7. Implement request history in localStorage (last 100 requests, FIFO)\\n8. Add copy-as-cURL export for sharing requests\",
    \"acceptance_criteria\": \"- [ ] Request templates auto-populated from OpenAPI spec for every endpoint\\n- [ ] Auth headers injected automatically without manual token entry\\n- [ ] Responses syntax-highlighted with JSON formatting\\n- [ ] Response timing displayed (total, TTFB)\\n- [ ] Environment switching works for dev, staging, and prod\\n- [ ] Request history persists in localStorage (last 100 entries)\\n- [ ] Unexpected response fields highlighted based on schema validation\"
  },
  {
    \"project_id\": \"$P4_ID\",
    \"title\": \"Implement per-consumer usage analytics dashboard\",
    \"description\": \"Build a usage analytics dashboard showing per-consumer API metrics including request volume, latency percentiles, and error rates, sourced from Envoy access logs stored in ClickHouse.\",
    \"plan\": \"## Data Pipeline\\n\\n- Source: Envoy access logs → ClickHouse\\n- Retention: 90 days\\n- Granularity: per-consumer (API key), per-endpoint\\n\\n## Dashboard (Recharts)\\n\\n- Time-series: requests/min, P50/P95/P99 latency, error rate by status code\\n- Top consumers by volume\\n- Slowest endpoints (P95)\\n- Error hotspots\\n- Window selector: 7 / 30 / 90 days\",
    \"implementation\": \"1. Configure Envoy access log format to include consumer ID (API key hash)\\n2. Set up log shipping pipeline from Envoy to ClickHouse\\n3. Design ClickHouse schema with materialized views for pre-aggregation\\n4. Build API endpoints for analytics queries (per-consumer, per-endpoint)\\n5. Create Recharts time-series components for requests/min and latency\\n6. Add error rate visualization by HTTP status code\\n7. Build top consumers and slowest endpoints leaderboard views\\n8. Implement window selector (7/30/90 days) backed by pre-aggregated data\",
    \"acceptance_criteria\": \"- [ ] Envoy access logs ingested into ClickHouse within 60 seconds\\n- [ ] Per-consumer metrics available at per-endpoint granularity\\n- [ ] Dashboard shows requests/min, P50/P95/P99 latency, and error rate\\n- [ ] Top consumers and slowest endpoints display correctly\\n- [ ] Window selector works for 7, 30, and 90 day periods\\n- [ ] Dashboard loads within 2 seconds for 90-day window\\n- [ ] Data retained for 90 days with automatic TTL expiration\"
  }
]")

P4_TASK_IDS=($(echo "$P4_TASKS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
for i in "${!P4_TASK_IDS[@]}"; do echo "  ✓ Task P4.$((i+1)): ${P4_TASK_IDS[$i]}"; done

section "Creating Tasks — Project 5: Mobile Perf"

P5_TASKS=$(post "$API/tasks" "[
  {
    \"project_id\": \"$P5_ID\",
    \"title\": \"Replace moment.js with date-fns and tree-shake lodash\",
    \"description\": \"Eliminate the three largest bundle contributors by replacing moment.js with date-fns, switching to tree-shakeable lodash-es, and removing the unused analytics SDK. Target: reduce initial JS bundle from 2.4MB to under 800KB.\",
    \"plan\": \"## Changes\\n\\n1. \`moment.js\` (330KB) → \`date-fns/fp\` (28KB): migrate all 47 date formatting call sites\\n2. \`lodash\` (540KB) → \`lodash-es\` with per-function imports: verify tree-shaking via bundle analyzer\\n3. Remove unused analytics SDK (280KB): grep for all references, remove package\\n4. Lazy-load \`react-native-maps\` (190KB): deferred import on map screen\\n\\n## Verification\\n\\n- \`react-native-bundle-visualizer\` output < 800KB initial\\n- All E2E tests pass\\n- Manual smoke test on iOS + Android\",
    \"implementation\": \"1. Audit all 47 moment.js call sites and map each to the equivalent date-fns function\\n2. Replace moment.js imports with date-fns/fp imports across all 47 call sites\\n3. Remove moment.js from package.json and verify no transitive dependencies pull it back\\n4. Replace lodash with lodash-es and convert to per-function imports\\n5. Run bundle analyzer to verify tree-shaking eliminates unused lodash functions\\n6. Grep for all references to unused analytics SDK and remove them\\n7. Remove analytics SDK from package.json\\n8. Convert react-native-maps to lazy import with React.lazy()\\n9. Run react-native-bundle-visualizer and verify initial bundle under 800KB\\n10. Run full E2E test suite on both platforms\",
    \"acceptance_criteria\": \"- [ ] All 47 moment.js call sites migrated to date-fns equivalents\\n- [ ] lodash-es tree-shaking verified via bundle analyzer (no unused functions)\\n- [ ] Unused analytics SDK fully removed (zero runtime references)\\n- [ ] react-native-maps lazy-loaded on map screen only\\n- [ ] Initial JS bundle size under 800KB\\n- [ ] All existing E2E tests pass on iOS and Android\\n- [ ] No regression in date formatting behavior (manual spot-check on 10 screens)\"
  },
  {
    \"project_id\": \"$P5_ID\",
    \"title\": \"Implement 3-tier startup sequencing\",
    \"description\": \"Restructure app initialization from a single synchronous chain into three tiers: blocking essentials (auth, feature flags, cache), async background services, and on-demand lazy-loaded services. Target: cold start under 1.5 seconds.\",
    \"plan\": \"## Current (synchronous, blocking)\\n\\n\`\`\`\\nApp mount → Auth → Analytics → FeatureFlags → Notifications → DeepLinks\\n          → Payments → Maps → Chat → Search → Recommendations → Cache\\n\`\`\`\\n\\n## Proposed (3-tier)\\n\\n| Tier | Services | Strategy | Budget |\\n|------|----------|----------|--------|\\n| 0 | Auth, FeatureFlags, Cache | Blocking | 400ms |\\n| 1 | Analytics, Notifications, DeepLinks | Async (background) | — |\\n| 2 | Payments, Maps, Chat, Search, Recs | On-demand (lazy) | — |\\n\\n## Verification\\n\\n- Cold start < 1.5s on iPhone 12 + Pixel 6 (Flipper)\\n- TTI < 1.0s (home feed visible + scrollable)\\n- Deep links resolve during Tier 1 init\",
    \"implementation\": \"1. Profile current startup sequence and measure time per service initialization\\n2. Categorize all 12 services into Tier 0 (blocking), Tier 1 (async), and Tier 2 (lazy)\\n3. Refactor app initialization to await only Tier 0 services before first render\\n4. Move Tier 1 services to background initialization after first paint\\n5. Convert Tier 2 services to lazy initialization triggered on first use\\n6. Add startup timing telemetry for each tier\\n7. Verify deep link resolution works during Tier 1 async init\\n8. Measure cold start on iPhone 12 and Pixel 6 using Flipper\\n9. A/B test new startup sequence against baseline\",
    \"acceptance_criteria\": \"- [ ] Tier 0 services (Auth, FeatureFlags, Cache) initialize within 400ms\\n- [ ] Cold start under 1.5 seconds on iPhone 12 and Pixel 6\\n- [ ] TTI under 1.0 second (home feed visible and scrollable)\\n- [ ] Tier 1 services complete initialization within 5 seconds (background)\\n- [ ] Tier 2 services initialize on demand without blocking UI\\n- [ ] Deep links resolve correctly during Tier 1 async initialization\\n- [ ] Startup telemetry reports per-tier timing to analytics\"
  },
  {
    \"project_id\": \"$P5_ID\",
    \"title\": \"Implement LRU image cache with memory pressure handling\",
    \"description\": \"Replace the unbounded image cache with an LRU cache capped at 100MB, with proactive eviction at 80MB and emergency eviction on OS memory warnings. Fix three known retain cycles in the navigation stack.\",
    \"plan\": \"## Cache Policy\\n\\n- **Hard cap**: 100MB\\n- **Eviction trigger**: 80MB (LRU)\\n- **Memory warning handler**: drop Tier 2 services + aggressive eviction\\n\\n## Additional Fixes\\n\\n- Profile and fix 3 known retain cycles in navigation stack\\n- Add memory telemetry: report steady-state usage every 5 min\\n\\n## Verification\\n\\n- Steady-state < 120MB after 30 min active use\\n- 1000-image scroll test stays under cap\\n- No OOM in 4-hour soak test on 4GB RAM device\",
    \"implementation\": \"1. Implement LRU cache data structure with byte-level size tracking\\n2. Configure 100MB hard cap and 80MB proactive eviction threshold\\n3. Register onMemoryWarning handler to drop Tier 2 services and aggressively evict cache\\n4. Profile navigation stack to identify 3 known retain cycles\\n5. Fix retain cycles by converting strong references to weak references\\n6. Add memory telemetry reporter (steady-state usage every 5 minutes)\\n7. Build 1000-image scroll test to verify cache stays under 100MB cap\\n8. Run 4-hour soak test on 4GB RAM device to verify no OOM crashes\",
    \"acceptance_criteria\": \"- [ ] Image cache respects 100MB hard cap under all conditions\\n- [ ] LRU eviction triggers at 80MB threshold\\n- [ ] onMemoryWarning handler drops Tier 2 services and evicts cache\\n- [ ] 3 retain cycles in navigation stack fixed (verified by memory profiler)\\n- [ ] Steady-state memory under 120MB after 30 minutes of active use\\n- [ ] 1000-image scroll test stays under 100MB cache cap\\n- [ ] No OOM crashes in 4-hour soak test on 4GB RAM device\"
  },
  {
    \"project_id\": \"$P5_ID\",
    \"title\": \"Generate strict TypeScript types and add Zod validation\",
    \"description\": \"Generate TypeScript types from backend OpenAPI specs to eliminate nullable guessing, and add Zod runtime validation at every API response boundary to catch malformed responses before they cause crashes.\",
    \"plan\": \"## Approach\\n\\n1. Generate TypeScript types from backend OpenAPI specs (eliminates nullable guessing)\\n2. Add Zod runtime validation at every API response boundary\\n3. Implement global error boundary with Sentry breadcrumb context\\n\\n## Expected Impact\\n\\n- Eliminates 73% of Android crashes (\`NullPointerException\` from unguarded nullable responses)\\n- Crash-free sessions: 98.3% → 99.5%+\\n- Zod validation errors logged with full request context for debugging\",
    \"implementation\": \"1. Set up openapi-typescript code generator in the build pipeline\\n2. Generate TypeScript types from all backend OpenAPI specs\\n3. Replace hand-written API response types with generated types\\n4. Create Zod schemas matching the generated TypeScript types\\n5. Add Zod validation at every API response boundary (fetch wrapper)\\n6. Implement validation error logging with full request context (URL, params, response body)\\n7. Set up global error boundary with Sentry breadcrumb context\\n8. Deploy to 10% of users and monitor crash-free session rate\\n9. Full rollout after confirming improvement in crash metrics\",
    \"acceptance_criteria\": \"- [ ] TypeScript types generated from OpenAPI specs for all API endpoints\\n- [ ] Zod validation runs on every API response before consumption\\n- [ ] Validation errors logged with full request context to Sentry\\n- [ ] Global error boundary catches and reports unhandled errors\\n- [ ] Zero NullPointerException crashes from API response handling\\n- [ ] Crash-free session rate reaches 99.5% or higher (7-day rolling)\\n- [ ] Generated types stay in sync with backend specs via CI check\"
  }
]")

P5_TASK_IDS=($(echo "$P5_TASKS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4))
for i in "${!P5_TASK_IDS[@]}"; do echo "  ✓ Task P5.$((i+1)): ${P5_TASK_IDS[$i]}"; done

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

section "Updating Task Fields via PATCH — description and acceptance_criteria"

patch "$API/tasks" "[{
  \"id\": \"${P2_TASK_IDS[0]}\",
  \"description\": \"Build the core sync loop using Automerge for CRDT-based document synchronization. Updated to include support for nested map merging and array tombstone compaction after benchmarking revealed performance issues with large documents.\",
  \"acceptance_criteria\": \"- [ ] Local changes propagate to remote peers within 100ms (same region)\\n- [ ] Concurrent edits on same field resolve deterministically via LWW\\n- [ ] Concurrent list inserts maintain consistent ordering across all peers\\n- [ ] Delete-vs-edit conflicts resolve with delete winning\\n- [ ] 50-user concurrent editing produces identical document state on all clients\\n- [ ] Vector clock correctly identifies causal ordering\\n- [ ] No data loss during reconnection from network interruption\\n- [ ] Nested map merging handles 5 levels of depth without degradation\\n- [ ] Array tombstone compaction runs automatically when >20% of entries are deleted\"
}]" > /dev/null
echo "  ✓ Updated P2 task 1 description and acceptance_criteria (nested map + tombstone compaction)"

patch "$API/tasks" "[{
  \"id\": \"${P5_TASK_IDS[2]}\",
  \"description\": \"Replace the unbounded image cache with an LRU cache capped at 100MB, with proactive eviction at 80MB and emergency eviction on OS memory warnings. Fix three known retain cycles in the navigation stack. Updated to also include WebP transcoding for cached images to reduce memory footprint by 30%.\",
  \"acceptance_criteria\": \"- [ ] Image cache respects 100MB hard cap under all conditions\\n- [ ] LRU eviction triggers at 80MB threshold\\n- [ ] onMemoryWarning handler drops Tier 2 services and evicts cache\\n- [ ] 3 retain cycles in navigation stack fixed (verified by memory profiler)\\n- [ ] Steady-state memory under 120MB after 30 minutes of active use\\n- [ ] 1000-image scroll test stays under 100MB cache cap\\n- [ ] No OOM crashes in 4-hour soak test on 4GB RAM device\\n- [ ] Cached images transcoded to WebP format (30% size reduction)\\n- [ ] WebP transcoding completes within 50ms per image on mid-range devices\"
}]" > /dev/null
echo "  ✓ Updated P5 task 3 description and acceptance_criteria (WebP transcoding)"

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

section "Read Queries — Individual Resources"

for PID in "$P1_ID" "$P2_ID" "$P3_ID" "$P4_ID" "$P5_ID"; do
  get "$API/projects/$PID" > /dev/null
  echo "  ✓ GET /api/projects/$PID"
done

for TID in "${P1_TASK_IDS[@]}" "${P2_TASK_IDS[@]}" "${P3_TASK_IDS[@]}" "${P4_TASK_IDS[@]}" "${P5_TASK_IDS[@]}"; do
  get "$API/tasks/$TID" > /dev/null
  echo "  ✓ GET /api/tasks/$TID"
done

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL — summary
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Traffic simulation complete."
echo "  Total API requests: $COUNT"
echo ""
echo "  Created: 5 projects, 21 tasks"
echo "  Updates: 2 project updates, 2 task plan updates, 2 task field updates"
echo "  Read queries: pagination, individual project and task lookups"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
