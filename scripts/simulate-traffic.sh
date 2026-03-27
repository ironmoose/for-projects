#!/bin/bash
# Traffic simulator — creates projects, tasks, workbenches, instructions
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

# --- Workbench ---
echo ""
echo "━━━ Creating workbench pipeline ━━━"

WB=$(curl -s -X POST "$API/workbenches" -H 'Content-Type: application/json' \
  -d '{"goal":"Deploy telemetry pipeline to staging environment","status":"running"}' | jq_id)
echo "✓ Workbench: Deploy telemetry ($WB)"
sleep 1

I1=$(curl -s -X POST "$API/workbenches/$WB/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Analyze current staging infrastructure. Document resource limits, network topology, and existing services.","position":0,"agent":"Executor","status":"complete"}' | jq_id)
echo "✓ Instruction 0: Analyze staging — complete ($I1)"
sleep 1

I2=$(curl -s -X POST "$API/workbenches/$WB/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Draft deployment plan. Define resource requirements, rollback strategy, and health check endpoints.","position":1,"agent":"Executor","status":"complete"}' | jq_id)
echo "✓ Instruction 1: Draft deploy plan — complete ($I2)"
sleep 1

I3=$(curl -s -X POST "$API/workbenches/$WB/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Execute deployment. Apply Kubernetes manifests, verify pod health, run smoke tests.","position":2,"agent":"Executor","status":"running"}' | jq_id)
echo "✓ Instruction 2: Execute deployment — running ($I3)"
sleep 1

I4=$(curl -s -X POST "$API/workbenches/$WB/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Validate deployment. Run integration test suite against staging. Verify telemetry data flowing end-to-end.","position":3,"agent":"Executor","status":"pending"}' | jq_id)
echo "✓ Instruction 3: Validate deployment — pending ($I4)"
sleep 1

I5=$(curl -s -X POST "$API/workbenches/$WB/instructions" -H 'Content-Type: application/json' \
  -d '{"prompt":"Write deployment report. Summarize changes, test results, and any follow-up items for production rollout.","position":4,"agent":"Executor","status":"pending"}' | jq_id)
echo "✓ Instruction 4: Write report — pending ($I5)"
sleep 3

# --- Pipeline progression ---
echo ""
echo "━━━ Pipeline progressing ━━━"

echo "→ Instruction 2: execute deployment → complete"
curl -s -X PATCH "$API/workbenches/$WB/instructions/$I3" -H 'Content-Type: application/json' \
  -d '{"status":"complete","output":"Deployment successful. 3 pods running, health checks passing. Smoke tests: 12/12 passed."}' > /dev/null
sleep 2

echo "→ Instruction 3: validate → running"
curl -s -X PATCH "$API/workbenches/$WB/instructions/$I4" -H 'Content-Type: application/json' \
  -d '{"status":"running"}' > /dev/null
sleep 2

echo "→ Task: integration tests → done"
curl -s -X PATCH "$API/projects/$P1/tasks/$T3" -H 'Content-Type: application/json' -d '{"status":"done"}' > /dev/null
sleep 1

echo "→ Task: monitoring dashboards → in_progress"
curl -s -X PATCH "$API/projects/$P1/tasks/$T4" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 1

echo "→ Task: shard rebalancing → in_progress"
curl -s -X PATCH "$API/projects/$P2/tasks/$T6" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 2

echo "→ Instruction 3: validate → complete"
curl -s -X PATCH "$API/workbenches/$WB/instructions/$I4" -H 'Content-Type: application/json' \
  -d '{"status":"complete","output":"Integration suite: 47/47 passed. Telemetry data flowing at 1.2k events/sec. Latency p99: 42ms."}' > /dev/null
sleep 1

echo "→ Instruction 4: write report → running"
curl -s -X PATCH "$API/workbenches/$WB/instructions/$I5" -H 'Content-Type: application/json' \
  -d '{"status":"running"}' > /dev/null
sleep 2

echo "→ Task: monitoring dashboards → done"
curl -s -X PATCH "$API/projects/$P1/tasks/$T4" -H 'Content-Type: application/json' -d '{"status":"done"}' > /dev/null
sleep 1

echo "→ Task: auth API design → in_progress"
curl -s -X PATCH "$API/projects/$P3/tasks/$T8" -H 'Content-Type: application/json' -d '{"status":"in_progress"}' > /dev/null
sleep 1

echo "→ Instruction 4: write report → complete"
curl -s -X PATCH "$API/workbenches/$WB/instructions/$I5" -H 'Content-Type: application/json' \
  -d '{"status":"complete","output":"Report written. Deployment to staging successful. Ready for production review."}' > /dev/null
sleep 1

echo "→ Workbench: pipeline complete"
curl -s -X PATCH "$API/workbenches/$WB" -H 'Content-Type: application/json' -d '{"status":"complete"}' > /dev/null
sleep 1

echo "→ Apollo: completed"
curl -s -X PATCH "$API/projects/$P1" -H 'Content-Type: application/json' -d '{"status":"completed"}' > /dev/null

echo ""
echo "━━━ ✅ Simulation complete ━━━"
echo ""
echo "Created:"
echo "  • 3 projects (Apollo, Nebula, Quantum Auth)"
echo "  • 8 tasks across projects"
echo "  • 1 workbench with 5-step pipeline"
echo "  • ~30 status change events over ~60 seconds"
