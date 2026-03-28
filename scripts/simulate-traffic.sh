#!/usr/bin/env bash
# simulate-traffic.sh — exercise the full API surface for WebSocket traffic
set -euo pipefail

BASE="${1:-http://localhost:3000}"
API="$BASE/api"

# Helpers
post()  { curl -sf -X POST   -H 'Content-Type: application/json' -d "$2" "$1"; }
patch() { curl -sf -X PATCH  -H 'Content-Type: application/json' -d "$2" "$1"; }
del()   { curl -sf -X DELETE -H 'Content-Type: application/json' -d "$2" "$1"; }
get()   { curl -sf "$1"; }

jid()   { echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

echo "=== Creating projects ==="
P1=$(post "$API/projects" '{"name":"Alpha","description":"First project"}')
P1_ID=$(jid "$P1")
echo "  Project 1: $P1_ID"

P2=$(post "$API/projects" '{"name":"Beta","description":"Second project"}')
P2_ID=$(jid "$P2")
echo "  Project 2: $P2_ID"

P3=$(post "$API/projects" '{"name":"Gamma","description":"Third project","status":"active"}')
P3_ID=$(jid "$P3")
echo "  Project 3: $P3_ID"

echo "=== Creating tasks under Alpha ==="
T1=$(post "$API/projects/$P1_ID/tasks" '{"summary":"Design the schema"}')
T1_ID=$(jid "$T1")
echo "  Task 1: $T1_ID"

T2=$(post "$API/projects/$P1_ID/tasks" '{"summary":"Write the migration","context":"SQL migration file"}')
T2_ID=$(jid "$T2")
echo "  Task 2: $T2_ID"

T3=$(post "$API/projects/$P1_ID/tasks" '{"summary":"Implement the service layer"}')
T3_ID=$(jid "$T3")
echo "  Task 3: $T3_ID"

echo "=== Creating tasks under Beta ==="
T4=$(post "$API/projects/$P2_ID/tasks" '{"summary":"Research competitors"}')
T4_ID=$(jid "$T4")
echo "  Task 4: $T4_ID"

T5=$(post "$API/projects/$P2_ID/tasks" '{"summary":"Draft proposal"}')
T5_ID=$(jid "$T5")
echo "  Task 5: $T5_ID"

echo "=== Bulk create actions with explicit prompts ==="
A_P1=$(post "$API/actions" "{\"target\":\"tab:project:$P1_ID\",\"actions\":[{\"rank\":1,\"prompt\":\"Perform thorough research on the target.\"},{\"rank\":2,\"prompt\":\"Simplify and streamline the target.\"},{\"rank\":3,\"prompt\":\"Review the target for correctness and quality.\"}]}")
echo "  Actions on project Alpha: $(echo "$A_P1" | grep -o '"id"' | wc -l | tr -d ' ') created"

echo "=== Bulk create actions (targeting tasks) ==="
A_T1=$(post "$API/actions" "{\"target\":\"tab:task:$T1_ID\",\"actions\":[{\"rank\":1,\"prompt\":\"Implement the specified feature.\",\"agent\":\"implementation\"},{\"rank\":2,\"prompt\":\"Review the target for correctness and quality.\"}]}")
echo "  Actions on task 1: $(echo "$A_T1" | grep -o '"id"' | wc -l | tr -d ' ') created"

A_P2=$(post "$API/actions" "{\"target\":\"tab:project:$P2_ID\",\"actions\":[{\"rank\":1,\"prompt\":\"Audit all dependencies\"},{\"rank\":2,\"prompt\":\"Update changelog\",\"agent\":\"implementation\"},{\"rank\":3,\"prompt\":\"Run integration tests\"}]}")
echo "  Actions on project Beta: $(echo "$A_P2" | grep -o '"id"' | wc -l | tr -d ' ') created"

A_T4=$(post "$API/actions" "{\"target\":\"tab:task:$T4_ID\",\"actions\":[{\"rank\":1,\"prompt\":\"Compile competitor list\"},{\"rank\":2,\"prompt\":\"Summarize findings\"}]}")
echo "  Actions on task 4: $(echo "$A_T4" | grep -o '"id"' | wc -l | tr -d ' ') created"

echo "=== Reading back data ==="
get "$API/projects" > /dev/null
echo "  GET /api/projects"
get "$API/projects/$P1_ID" > /dev/null
echo "  GET /api/projects/$P1_ID"
get "$API/projects/$P1_ID/tasks" > /dev/null
echo "  GET /api/projects/$P1_ID/tasks"
get "$API/actions?target=tab:project:$P1_ID" > /dev/null
echo "  GET /api/actions?target=tab:project:$P1_ID"
get "$API/actions?target=tab:task:$T1_ID" > /dev/null
echo "  GET /api/actions?target=tab:task:$T1_ID"

echo "=== Status transitions ==="
# Project: active -> archived
patch "$API/projects/$P3_ID" '{"status":"archived"}' > /dev/null
echo "  Project Gamma: active -> archived"

# Task: todo -> in_progress -> done
patch "$API/projects/$P1_ID/tasks/$T1_ID" '{"status":"in_progress"}' > /dev/null
echo "  Task 1: todo -> in_progress"
patch "$API/projects/$P1_ID/tasks/$T1_ID" '{"status":"done"}' > /dev/null
echo "  Task 1: in_progress -> done"

patch "$API/projects/$P1_ID/tasks/$T2_ID" '{"status":"in_progress"}' > /dev/null
echo "  Task 2: todo -> in_progress"

patch "$API/projects/$P2_ID/tasks/$T4_ID" '{"status":"in_progress"}' > /dev/null
echo "  Task 4: todo -> in_progress"
patch "$API/projects/$P2_ID/tasks/$T4_ID" '{"status":"done"}' > /dev/null
echo "  Task 4: in_progress -> done"

echo "=== Bulk update actions ==="
# Extract action IDs from project Beta
A_P2_IDS=$(get "$API/actions?target=tab:project:$P2_ID")
A_P2_ID1=$(echo "$A_P2_IDS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
A_P2_ID2=$(echo "$A_P2_IDS" | grep -o '"id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)

patch "$API/actions" "{\"target\":\"tab:project:$P2_ID\",\"actions\":[{\"id\":\"$A_P2_ID1\",\"prompt\":\"Audit all deps (updated)\"},{\"id\":\"$A_P2_ID2\",\"prompt\":\"Update CHANGELOG.md\"}]}" > /dev/null
echo "  Updated 2 actions on project Beta"

echo "=== Reorder pattern: bulk delete + bulk recreate ==="
# Get current actions for task:T1
EXISTING=$(get "$API/actions?target=tab:task:$T1_ID")
DEL_IDS=$(echo "$EXISTING" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | paste -sd',' -)
DEL_JSON="[$(echo "$DEL_IDS" | sed 's/,/","/g; s/^/"/; s/$/"/')]"

del "$API/actions" "{\"target\":\"tab:task:$T1_ID\",\"ids\":$DEL_JSON}" > /dev/null
echo "  Deleted actions from task 1"

post "$API/actions" "{\"target\":\"tab:task:$T1_ID\",\"actions\":[{\"rank\":1,\"prompt\":\"Review the target for correctness and quality.\"},{\"rank\":2,\"prompt\":\"Implement the specified feature.\",\"agent\":\"implementation\"},{\"rank\":3,\"prompt\":\"Final verification\"}]}" > /dev/null
echo "  Recreated actions on task 1 in new order"

echo "=== Additional reads for WebSocket exercise ==="
get "$API/projects?status=active" > /dev/null
echo "  GET /api/projects?status=active"
get "$API/projects/$P2_ID/tasks?status=done" > /dev/null
echo "  GET /api/projects/$P2_ID/tasks?status=done"
get "$API/health" > /dev/null
echo "  GET /api/health"

echo ""
echo "=== Done! ==="
echo "Traffic simulation complete."
