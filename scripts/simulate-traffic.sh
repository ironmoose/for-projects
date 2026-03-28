#!/bin/bash
# Traffic simulator — creates projects, tasks, workflows, phases, instructions
# and cycles through status changes to trigger WebSocket events.
# Run with: bash scripts/simulate-traffic.sh

API="http://localhost:3000/api"

jq_id() { python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"; }

echo "🚀 Starting traffic simulation..."
echo ""

# --- Projects ---
echo "━━━ Creating projects ━━━"

P1=$(curl -s -X POST "$API/projects" -H 'Content-Type: application/json' \
  -d '{"name":"Apollo Mission Control","description":"Real-time telemetry dashboard for spacecraft monitoring systems"}' | jq_id)
echo "✓ Project: Apollo Mission Control ($P1)"
sleep 1

P2=$(curl -s -X POST "$API/projects" -H 'Content-Type: application/json' \
  -d '{"name":"Nebula Search Engine","description":"Distributed search indexing pipeline with fault-tolerant sharding"}' | jq_id)
echo "✓ Project: Nebula Search Engine ($P2)"
sleep 1

P3=$(curl -s -X POST "$API/projects" -H 'Content-Type: application/json' \
  -d '{"name":"Quantum Auth","description":"Zero-knowledge proof authentication service for edge deployments"}' | jq_id)
echo "✓ Project: Quantum Auth ($P3)"
sleep 1

# --- Tasks for Apollo ---
echo ""
echo "━━━ Creating tasks for Apollo ━━━"

T1=$(curl -s -X POST "$API/projects/$P1/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Design telemetry ingestion pipeline","type":"design","effort":"high","priority":9}' | jq_id)
echo "✓ Task: Design telemetry pipeline ($T1)"
sleep 1

T2=$(curl -s -X POST "$API/projects/$P1/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Implement WebSocket event bus","type":"implementation","effort":"moderate","priority":8}' | jq_id)
echo "✓ Task: Implement WebSocket event bus ($T2)"
sleep 1

T3=$(curl -s -X POST "$API/projects/$P1/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Write integration tests for event replay","type":"testing","effort":"moderate","priority":7}' | jq_id)
echo "✓ Task: Write integration tests ($T3)"
sleep 1

T4=$(curl -s -X POST "$API/projects/$P1/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Set up monitoring dashboards","type":"implementation","effort":"low","priority":5}' | jq_id)
echo "✓ Task: Set up monitoring ($T4)"
sleep 1

# --- Tasks for Nebula ---
echo ""
echo "━━━ Creating tasks for Nebula ━━━"

T5=$(curl -s -X POST "$API/projects/$P2/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Research distributed indexing strategies","type":"research","effort":"high","priority":10}' | jq_id)
echo "✓ Task: Research indexing strategies ($T5)"
sleep 1

T6=$(curl -s -X POST "$API/projects/$P2/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Build shard rebalancing algorithm","type":"implementation","effort":"extreme","priority":9}' | jq_id)
echo "✓ Task: Build shard rebalancing ($T6)"
sleep 1

# --- Tasks for Quantum Auth ---
echo ""
echo "━━━ Creating tasks for Quantum Auth ━━━"

T7=$(curl -s -X POST "$API/projects/$P3/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Prototype ZK-proof verification circuit","type":"research","effort":"extreme","priority":10}' | jq_id)
echo "✓ Task: ZK-proof prototype ($T7)"
sleep 1

T8=$(curl -s -X POST "$API/projects/$P3/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Design API surface for auth endpoints","type":"design","effort":"moderate","priority":8}' | jq_id)
echo "✓ Task: Design auth API ($T8)"
sleep 2

# --- Status transitions ---
echo ""
echo "━━━ Simulating work — status transitions ━━━"

echo "→ Apollo: moving to active"
curl -s -X PATCH "$API/projects/$P1" -H 'Content-Type: application/json' -d '{"status":"active"}' > /dev/null
sleep 1.5

echo "→ Task: telemetry pipeline → in_progress"
curl -s -X PATCH "$API/projects/$P1/tasks/$T1" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 2

echo "→ Task: telemetry pipeline → done"
curl -s -X PATCH "$API/projects/$P1/tasks/$T1" -H 'Content-Type: application/json' -d '{"status":"done"}' > /dev/null
sleep 1.5

echo "→ Task: WebSocket event bus → in_progress"
curl -s -X PATCH "$API/projects/$P1/tasks/$T2" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 2

echo "→ Task: integration tests → in_progress"
curl -s -X PATCH "$API/projects/$P1/tasks/$T3" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 1

echo "→ Nebula: moving to active"
curl -s -X PATCH "$API/projects/$P2" -H 'Content-Type: application/json' -d '{"status":"active"}' > /dev/null
sleep 1

echo "→ Task: research indexing → in_progress"
curl -s -X PATCH "$API/projects/$P2/tasks/$T5" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 2

echo "→ Task: WebSocket event bus → done"
curl -s -X PATCH "$API/projects/$P1/tasks/$T2" -H 'Content-Type: application/json' -d '{"status":"done"}' > /dev/null
sleep 1

echo "→ Task: research indexing → done"
curl -s -X PATCH "$API/projects/$P2/tasks/$T5" -H 'Content-Type: application/json' -d '{"status":"done"}' > /dev/null
sleep 1

echo "→ Quantum Auth: moving to active"
curl -s -X PATCH "$API/projects/$P3" -H 'Content-Type: application/json' -d '{"status":"active"}' > /dev/null
sleep 1

echo "→ Task: ZK-proof → in_progress"
curl -s -X PATCH "$API/projects/$P3/tasks/$T7" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 2

# --- Workflow with phases ---
echo ""
echo "━━━ Creating workflow pipeline ━━━"

WF=$(curl -s -X POST "$API/workflows" -H 'Content-Type: application/json' \
  -d '{"goal":"Deploy telemetry pipeline to staging environment","status":"running"}' | jq_id)
echo "✓ Workflow: Deploy telemetry ($WF)"
sleep 1

# Create phases
PH1=$(curl -s -X POST "$API/workflows/$WF/phases" -H 'Content-Type: application/json' \
  -d '{"title":"Analysis","position":0}' | jq_id)
echo "✓ Phase 0: Analysis ($PH1)"
sleep 1

PH2=$(curl -s -X POST "$API/workflows/$WF/phases" -H 'Content-Type: application/json' \
  -d '{"title":"Planning","position":1}' | jq_id)
echo "✓ Phase 1: Planning ($PH2)"
sleep 1

PH3=$(curl -s -X POST "$API/workflows/$WF/phases" -H 'Content-Type: application/json' \
  -d '{"title":"Execution","position":2}' | jq_id)
echo "✓ Phase 2: Execution ($PH3)"
sleep 1

PH4=$(curl -s -X POST "$API/workflows/$WF/phases" -H 'Content-Type: application/json' \
  -d '{"title":"Validation","position":3}' | jq_id)
echo "✓ Phase 3: Validation ($PH4)"
sleep 1

PH5=$(curl -s -X POST "$API/workflows/$WF/phases" -H 'Content-Type: application/json' \
  -d '{"title":"Reporting","position":4}' | jq_id)
echo "✓ Phase 4: Reporting ($PH5)"
sleep 1

# Create instructions within phases
INST="$API/workflows/$WF/phases"

# -- Analysis phase (5 instructions) --
echo ""
echo "  ── Analysis phase ──"

A1=$(curl -s -X POST "$INST/$PH1/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Inventory current staging nodes. Document CPU, memory, disk, and k8s version per node.","agent":"Executor"}' | jq_id)
echo "  ✓ Inventory staging nodes ($A1)"

A2=$(curl -s -X POST "$INST/$PH1/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Map network topology. Document VPC peering, load balancer config, DNS entries, and firewall rules.","agent":"Executor"}' | jq_id)
echo "  ✓ Map network topology ($A2)"

A3=$(curl -s -X POST "$INST/$PH1/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Catalog existing services and their resource consumption. Note CPU/memory requests vs limits.","agent":"Executor"}' | jq_id)
echo "  ✓ Catalog existing services ($A3)"

A4=$(curl -s -X POST "$INST/$PH1/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Identify capacity headroom. Calculate remaining allocatable resources after existing workloads.","agent":"Executor"}' | jq_id)
echo "  ✓ Identify capacity headroom ($A4)"

A5=$(curl -s -X POST "$INST/$PH1/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Summarize infrastructure analysis. Produce a readiness assessment with go/no-go recommendation.","agent":"Executor"}' | jq_id)
echo "  ✓ Summarize analysis ($A5)"
sleep 1

# -- Planning phase (4 instructions) --
echo ""
echo "  ── Planning phase ──"

B1=$(curl -s -X POST "$INST/$PH2/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Define resource requirements for telemetry pipeline. Specify pod count, CPU/memory requests, PVC sizes.","agent":"Executor"}' | jq_id)
echo "  ✓ Define resource requirements ($B1)"

B2=$(curl -s -X POST "$INST/$PH2/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Design rollback strategy. Document blue-green switch procedure, data migration rollback, and circuit breakers.","agent":"Executor"}' | jq_id)
echo "  ✓ Design rollback strategy ($B2)"

B3=$(curl -s -X POST "$INST/$PH2/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Define health check endpoints. Specify /healthz, /readyz, and /livez contracts with expected response shapes.","agent":"Executor"}' | jq_id)
echo "  ✓ Define health checks ($B3)"

B4=$(curl -s -X POST "$INST/$PH2/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Draft the deployment plan document. Consolidate resource requirements, rollback strategy, and health checks into a single runbook.","agent":"Executor"}' | jq_id)
echo "  ✓ Draft deployment plan ($B4)"
sleep 1

# -- Execution phase (10 instructions) --
echo ""
echo "  ── Execution phase ──"

C1=$(curl -s -X POST "$INST/$PH3/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Create the telemetry namespace and apply resource quotas.","agent":"Executor"}' | jq_id)
echo "  ✓ Create namespace ($C1)"

C2=$(curl -s -X POST "$INST/$PH3/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Deploy ConfigMaps and Secrets for telemetry pipeline configuration.","agent":"Executor"}' | jq_id)
echo "  ✓ Deploy ConfigMaps/Secrets ($C2)"

C3=$(curl -s -X POST "$INST/$PH3/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Apply PersistentVolumeClaim manifests for telemetry data storage.","agent":"Executor"}' | jq_id)
echo "  ✓ Apply PVCs ($C3)"

C4=$(curl -s -X POST "$INST/$PH3/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Deploy the telemetry collector StatefulSet. Wait for all replicas to reach Running state.","agent":"Executor"}' | jq_id)
echo "  ✓ Deploy collector StatefulSet ($C4)"

C5=$(curl -s -X POST "$INST/$PH3/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Deploy the telemetry aggregator Deployment. Verify HPA is configured correctly.","agent":"Executor"}' | jq_id)
echo "  ✓ Deploy aggregator ($C5)"

C6=$(curl -s -X POST "$INST/$PH3/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Apply Service and Ingress manifests. Verify DNS resolution and TLS termination.","agent":"Executor"}' | jq_id)
echo "  ✓ Apply Service/Ingress ($C6)"

C7=$(curl -s -X POST "$INST/$PH3/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Run pod health verification. Confirm all pods pass readiness and liveness probes.","agent":"Executor"}' | jq_id)
echo "  ✓ Verify pod health ($C7)"

C8=$(curl -s -X POST "$INST/$PH3/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Execute smoke tests against the deployed endpoints. Verify basic ingest and query paths.","agent":"Executor"}' | jq_id)
echo "  ✓ Run smoke tests ($C8)"

C9=$(curl -s -X POST "$INST/$PH3/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Configure Prometheus scrape targets and Grafana dashboards for the new services.","agent":"Executor"}' | jq_id)
echo "  ✓ Configure monitoring ($C9)"

C10=$(curl -s -X POST "$INST/$PH3/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Switch traffic from old pipeline to new via service mesh weighted routing. Start at 10%, verify, then 100%.","agent":"Executor"}' | jq_id)
echo "  ✓ Switch traffic ($C10)"
sleep 1

# -- Validation phase (6 instructions) --
echo ""
echo "  ── Validation phase ──"

D1=$(curl -s -X POST "$INST/$PH4/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Run the full integration test suite against the staging telemetry endpoints.","agent":"Executor"}' | jq_id)
echo "  ✓ Run integration tests ($D1)"

D2=$(curl -s -X POST "$INST/$PH4/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Verify end-to-end telemetry data flow. Inject synthetic events and confirm they appear in the query layer within SLA.","agent":"Executor"}' | jq_id)
echo "  ✓ Verify E2E data flow ($D2)"

D3=$(curl -s -X POST "$INST/$PH4/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Load test the ingest path. Target 5k events/sec sustained for 10 minutes. Record p50, p95, p99 latencies.","agent":"Executor"}' | jq_id)
echo "  ✓ Load test ingest ($D3)"

D4=$(curl -s -X POST "$INST/$PH4/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Validate rollback procedure. Trigger a simulated failure, execute rollback, verify service restoration under 2 minutes.","agent":"Executor"}' | jq_id)
echo "  ✓ Validate rollback ($D4)"

D5=$(curl -s -X POST "$INST/$PH4/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Check alerting rules. Verify that Prometheus alerts fire correctly for pod crash, high latency, and disk pressure scenarios.","agent":"Executor"}' | jq_id)
echo "  ✓ Check alerting ($D5)"

D6=$(curl -s -X POST "$INST/$PH4/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Produce validation summary. Consolidate all test results, latency numbers, and rollback timing into a pass/fail matrix.","agent":"Executor"}' | jq_id)
echo "  ✓ Produce validation summary ($D6)"
sleep 1

# -- Reporting phase (3 instructions) --
echo ""
echo "  ── Reporting phase ──"

E1=$(curl -s -X POST "$INST/$PH5/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Draft deployment report. Summarize what was deployed, configuration changes, and resource consumption delta.","agent":"Executor"}' | jq_id)
echo "  ✓ Draft deployment report ($E1)"

E2=$(curl -s -X POST "$INST/$PH5/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Document follow-up items. List remaining work for production rollout: capacity planning, runbook updates, on-call briefing.","agent":"Executor"}' | jq_id)
echo "  ✓ Document follow-ups ($E2)"

E3=$(curl -s -X POST "$INST/$PH5/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Compile final go/no-go recommendation for production deployment based on all validation results.","agent":"Executor"}' | jq_id)
echo "  ✓ Go/no-go recommendation ($E3)"
sleep 3

# --- Pipeline progression ---
echo ""
echo "━━━ Pipeline progressing ━━━"

# Analysis phase outputs
echo "→ Analysis: inventory nodes"
curl -s -X PATCH "$INST/$PH1/instructions/$A1" -H 'Content-Type: application/json' \
  -d '{"output":"4 nodes: node-1 (4cpu/16GB), node-2 (4cpu/16GB), node-3 (8cpu/32GB), node-4 (8cpu/32GB). k8s 1.28.3."}' > /dev/null
sleep 1

echo "→ Analysis: network topology"
curl -s -X PATCH "$INST/$PH1/instructions/$A2" -H 'Content-Type: application/json' \
  -d '{"output":"3 VPCs peered (staging, shared-services, data). ALB with TLS termination. Route53 private hosted zone. SG allows 443/8080."}' > /dev/null
sleep 1

echo "→ Analysis: existing services"
curl -s -X PATCH "$INST/$PH1/instructions/$A3" -H 'Content-Type: application/json' \
  -d '{"output":"2 services: auth-svc (500m/1Gi req, 1cpu/2Gi lim), gateway-svc (250m/512Mi req, 500m/1Gi lim). Both healthy."}' > /dev/null
sleep 1

echo "→ Analysis: capacity headroom"
curl -s -X PATCH "$INST/$PH1/instructions/$A4" -H 'Content-Type: application/json' \
  -d '{"output":"Allocatable remaining: 21.25 CPU, 89.5Gi memory. Plenty of headroom for telemetry pipeline (est. 4cpu/16Gi)."}' > /dev/null
sleep 1

echo "→ Analysis: readiness summary"
curl -s -X PATCH "$INST/$PH1/instructions/$A5" -H 'Content-Type: application/json' \
  -d '{"output":"GO. Infrastructure has 5x headroom on CPU, 5.5x on memory. Network topology supports new ingress. No blockers identified."}' > /dev/null
sleep 2

# Planning phase outputs
echo "→ Planning: resource requirements"
curl -s -X PATCH "$INST/$PH2/instructions/$B1" -H 'Content-Type: application/json' \
  -d '{"output":"3 collector pods (500m/2Gi each), 2 aggregator pods (1cpu/4Gi each). 50Gi PVC for buffer. Total: 3.5cpu/14Gi."}' > /dev/null
sleep 1

echo "→ Planning: rollback strategy"
curl -s -X PATCH "$INST/$PH2/instructions/$B2" -H 'Content-Type: application/json' \
  -d '{"output":"Blue-green via Istio VirtualService weight. Rollback: shift weight to old, drain new, delete. Data: append-only, no migration needed. Circuit breaker: 5xx > 5% triggers auto-rollback."}' > /dev/null
sleep 1

echo "→ Planning: health checks"
curl -s -X PATCH "$INST/$PH2/instructions/$B3" -H 'Content-Type: application/json' \
  -d '{"output":"/healthz: 200 + {\"status\":\"ok\"}. /readyz: checks Kafka connectivity + buffer disk. /livez: goroutine leak detection. All 3s interval, 5s timeout."}' > /dev/null
sleep 1

echo "→ Planning: deployment plan"
curl -s -X PATCH "$INST/$PH2/instructions/$B4" -H 'Content-Type: application/json' \
  -d '{"output":"Runbook complete. 12 steps, estimated 45 min. Requires: kubectl access, Istio CLI, Grafana admin. Approval: SRE team lead."}' > /dev/null
sleep 2

# Interleave task status changes
echo "→ Task: integration tests → done"
curl -s -X PATCH "$API/projects/$P1/tasks/$T3" -H 'Content-Type: application/json' -d '{"status":"done"}' > /dev/null
sleep 1

echo "→ Task: monitoring dashboards → in_progress"
curl -s -X PATCH "$API/projects/$P1/tasks/$T4" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 1

# Execution phase outputs
echo "→ Execution: create namespace"
curl -s -X PATCH "$INST/$PH3/instructions/$C1" -H 'Content-Type: application/json' \
  -d '{"output":"Namespace telemetry-staging created. ResourceQuota applied: 8cpu/32Gi limit."}' > /dev/null
sleep 1

echo "→ Execution: ConfigMaps/Secrets"
curl -s -X PATCH "$INST/$PH3/instructions/$C2" -H 'Content-Type: application/json' \
  -d '{"output":"3 ConfigMaps (collector-config, aggregator-config, pipeline-config) and 2 Secrets (kafka-creds, tls-certs) applied."}' > /dev/null
sleep 1

echo "→ Execution: PVCs"
curl -s -X PATCH "$INST/$PH3/instructions/$C3" -H 'Content-Type: application/json' \
  -d '{"output":"3x 50Gi PVCs bound (gp3). Provisioning took 8s. All in RWO mode."}' > /dev/null
sleep 1

echo "→ Execution: collector StatefulSet"
curl -s -X PATCH "$INST/$PH3/instructions/$C4" -H 'Content-Type: application/json' \
  -d '{"output":"StatefulSet telemetry-collector: 3/3 replicas Running. Ordinal startup completed in 34s."}' > /dev/null
sleep 1

echo "→ Task: shard rebalancing → in_progress"
curl -s -X PATCH "$API/projects/$P2/tasks/$T6" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 1

echo "→ Execution: aggregator Deployment"
curl -s -X PATCH "$INST/$PH3/instructions/$C5" -H 'Content-Type: application/json' \
  -d '{"output":"Deployment telemetry-aggregator: 2/2 replicas Ready. HPA configured: min 2, max 8, target 70% CPU."}' > /dev/null
sleep 1

echo "→ Execution: Service/Ingress"
curl -s -X PATCH "$INST/$PH3/instructions/$C6" -H 'Content-Type: application/json' \
  -d '{"output":"ClusterIP services created. Ingress with TLS via cert-manager. DNS resolves: telemetry.staging.internal → ALB."}' > /dev/null
sleep 1

echo "→ Execution: pod health"
curl -s -X PATCH "$INST/$PH3/instructions/$C7" -H 'Content-Type: application/json' \
  -d '{"output":"All 5 pods pass readiness (avg 1.2s) and liveness (avg 0.8s) probes. Zero restarts."}' > /dev/null
sleep 1

echo "→ Execution: smoke tests"
curl -s -X PATCH "$INST/$PH3/instructions/$C8" -H 'Content-Type: application/json' \
  -d '{"output":"Smoke tests: 12/12 passed. Ingest path: 200 OK (avg 23ms). Query path: 200 OK (avg 41ms). Batch ingest: 202 Accepted."}' > /dev/null
sleep 1

echo "→ Execution: monitoring"
curl -s -X PATCH "$INST/$PH3/instructions/$C9" -H 'Content-Type: application/json' \
  -d '{"output":"Prometheus targets: 5/5 UP. Grafana dashboard telemetry-staging imported (12 panels). Alert rules: 6 configured."}' > /dev/null
sleep 1

echo "→ Execution: traffic switch"
curl -s -X PATCH "$INST/$PH3/instructions/$C10" -H 'Content-Type: application/json' \
  -d '{"output":"Traffic shifted 10% → verified 5 min → 50% → verified 5 min → 100%. Zero errors during migration. Old pipeline drained."}' > /dev/null
sleep 2

# Validation phase outputs
echo "→ Validation: integration tests"
curl -s -X PATCH "$INST/$PH4/instructions/$D1" -H 'Content-Type: application/json' \
  -d '{"output":"Integration suite: 47/47 passed. Covering: ingest, query, batch, auth, rate-limiting, error handling."}' > /dev/null
sleep 1

echo "→ Validation: E2E data flow"
curl -s -X PATCH "$INST/$PH4/instructions/$D2" -H 'Content-Type: application/json' \
  -d '{"output":"1000 synthetic events injected. All appeared in query layer within 1.8s (SLA: 5s). Zero data loss."}' > /dev/null
sleep 1

echo "→ Validation: load test"
curl -s -X PATCH "$INST/$PH4/instructions/$D3" -H 'Content-Type: application/json' \
  -d '{"output":"5k events/sec sustained 10 min. p50: 12ms, p95: 38ms, p99: 67ms. Zero errors. CPU peaked at 62%. Memory stable at 71%."}' > /dev/null
sleep 1

echo "→ Task: monitoring dashboards → done"
curl -s -X PATCH "$API/projects/$P1/tasks/$T4" -H 'Content-Type: application/json' -d '{"status":"done"}' > /dev/null
sleep 1

echo "→ Validation: rollback test"
curl -s -X PATCH "$INST/$PH4/instructions/$D4" -H 'Content-Type: application/json' \
  -d '{"output":"Simulated OOM crash on aggregator. Circuit breaker triggered at 5.2% error rate. Rollback completed in 47s (target: <120s). Service restored."}' > /dev/null
sleep 1

echo "→ Validation: alerting"
curl -s -X PATCH "$INST/$PH4/instructions/$D5" -H 'Content-Type: application/json' \
  -d '{"output":"All 6 alert rules verified. Pod crash: fired in 15s. High latency: fired at p99 > 200ms. Disk pressure: fired at 85%. PagerDuty integration confirmed."}' > /dev/null
sleep 1

echo "→ Task: auth API design → in_progress"
curl -s -X PATCH "$API/projects/$P3/tasks/$T8" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 1

echo "→ Validation: summary"
curl -s -X PATCH "$INST/$PH4/instructions/$D6" -H 'Content-Type: application/json' \
  -d '{"output":"PASS. All tests green. Latency within SLA. Rollback under target. Alerts functional. Ready for production."}' > /dev/null
sleep 2

# Reporting phase outputs
echo "→ Reporting: deployment report"
curl -s -X PATCH "$INST/$PH5/instructions/$E1" -H 'Content-Type: application/json' \
  -d '{"output":"Deployed telemetry pipeline v1.0 to staging. 5 pods, 3.5cpu/14Gi total. Config: Kafka 3-partition ingest, 2-replica aggregation. Delta: +3.5cpu/+14Gi from baseline."}' > /dev/null
sleep 1

echo "→ Reporting: follow-ups"
curl -s -X PATCH "$INST/$PH5/instructions/$E2" -H 'Content-Type: application/json' \
  -d '{"output":"Follow-ups: 1) Production capacity planning (node-5 may be needed). 2) Update runbook with rollback timings. 3) Brief on-call team. 4) Schedule production deploy window."}' > /dev/null
sleep 1

echo "→ Reporting: go/no-go"
curl -s -X PATCH "$INST/$PH5/instructions/$E3" -H 'Content-Type: application/json' \
  -d '{"output":"GO for production. All validation gates passed. Recommend Tuesday 2am ET deploy window with SRE team lead approval."}' > /dev/null
sleep 1

echo "→ Workflow: pipeline complete"
curl -s -X PATCH "$API/workflows/$WF" -H 'Content-Type: application/json' -d '{"status":"complete"}' > /dev/null
sleep 1

echo "→ Apollo: completed"
curl -s -X PATCH "$API/projects/$P1" -H 'Content-Type: application/json' -d '{"status":"completed"}' > /dev/null

echo ""
echo "━━━ ✅ Simulation complete ━━━"
echo ""
echo "Created:"
echo "  • 3 projects (Apollo, Nebula, Quantum Auth)"
echo "  • 8 tasks across projects"
echo "  • 1 workflow with 5 phases, 28 instructions"
echo "  • ~60 events over ~90 seconds"
