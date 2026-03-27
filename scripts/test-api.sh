#!/usr/bin/env bash
# Post-deployment smoke tests — hits every API endpoint with happy-path scenarios.
# Usage: bash scripts/test-api.sh
#
# Every request is expected to succeed. The script stops on the first failure.

set -euo pipefail

API="http://localhost:3000/api"
RUN_ID="$$-$(date +%s)"
PASS=0
FAIL=0
BODY=""
HTTP_STATUS="000"

# ── preflight ────────────────────────────────────────────────────────────────

if ! curl -sf "$API/health" > /dev/null 2>&1; then
  echo "✗ Cannot reach $API/health — is the server running?"
  exit 1
fi

# ── helpers ──────────────────────────────────────────────────────────────────

json_field() {
  python3 -c "import sys,json; print(json.load(sys.stdin)['$1'])"
}

assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    PASS=$((PASS + 1))
    echo "  ✓ $label"
  else
    FAIL=$((FAIL + 1))
    echo "  ✗ $label — expected $expected, got $actual"
  fi
}

# Runs curl, sets BODY and HTTP_STATUS in the current shell.
# Uses a temp file for the status code to avoid subshell scoping issues.
call_api() {
  local method="$1" path="$2"
  shift 2
  local tmpfile
  tmpfile=$(mktemp "${TMPDIR:-/tmp}/api_status.XXXXXX")
  BODY=$(curl -s -w "\n%{http_code}" -X "$method" "$API$path" \
    -H "Content-Type: application/json" "$@" || true)
  # Last line is the HTTP status code
  echo "$BODY" | tail -1 > "$tmpfile"
  HTTP_STATUS=$(cat "$tmpfile")
  HTTP_STATUS=${HTTP_STATUS:-000}
  # Strip status line from body
  BODY=$(echo "$BODY" | sed '$d')
  rm -f "$tmpfile"
}

# ── health ───────────────────────────────────────────────────────────────────

echo "=== Health ==="

call_api GET /health
assert_status "GET /health" 200 "$HTTP_STATUS"

# ── projects ─────────────────────────────────────────────────────────────────

echo "=== Projects ==="

call_api POST /projects -d '{"name":"Smoke Test Project","description":"Created by test-api.sh"}'
assert_status "POST /projects (create)" 201 "$HTTP_STATUS"
PROJECT_ID=$(echo "$BODY" | json_field id)

call_api POST /projects -d '{"name":"Second Project","description":"For list testing","status":"paused"}'
assert_status "POST /projects (create second)" 201 "$HTTP_STATUS"
PROJECT2_ID=$(echo "$BODY" | json_field id)

call_api GET /projects
assert_status "GET /projects (list)" 200 "$HTTP_STATUS"

call_api GET "/projects?limit=1&offset=0"
assert_status "GET /projects (paginated)" 200 "$HTTP_STATUS"

call_api GET "/projects?status=paused"
assert_status "GET /projects (filter by status)" 200 "$HTTP_STATUS"

call_api GET "/projects/$PROJECT_ID"
assert_status "GET /projects/:id" 200 "$HTTP_STATUS"

call_api PATCH "/projects/$PROJECT_ID" -d '{"name":"Smoke Test Project (updated)","description":"Updated desc","status":"active"}'
assert_status "PATCH /projects/:id" 200 "$HTTP_STATUS"

call_api DELETE "/projects/$PROJECT2_ID"
assert_status "DELETE /projects/:id" 200 "$HTTP_STATUS"

# ── tasks ────────────────────────────────────────────────────────────────────

echo "=== Tasks ==="

call_api POST "/projects/$PROJECT_ID/tasks" \
  -d '{"title":"First task","description":"A todo item","status":"todo","type":"implementation","effort":"low","priority":1}'
assert_status "POST tasks (create with all fields)" 201 "$HTTP_STATUS"
TASK_ID=$(echo "$BODY" | json_field id)

call_api POST "/projects/$PROJECT_ID/tasks" \
  -d '{"title":"Minimal task"}'
assert_status "POST tasks (create minimal)" 201 "$HTTP_STATUS"
TASK2_ID=$(echo "$BODY" | json_field id)

call_api POST "/projects/$PROJECT_ID/tasks" \
  -d '{"title":"Research spike","type":"research","effort":"moderate","status":"in_progress"}'
assert_status "POST tasks (create third)" 201 "$HTTP_STATUS"
TASK3_ID=$(echo "$BODY" | json_field id)

call_api GET "/projects/$PROJECT_ID/tasks"
assert_status "GET tasks (list)" 200 "$HTTP_STATUS"

call_api GET "/projects/$PROJECT_ID/tasks?limit=1&offset=0"
assert_status "GET tasks (paginated)" 200 "$HTTP_STATUS"

call_api GET "/projects/$PROJECT_ID/tasks?status=todo"
assert_status "GET tasks (filter by status)" 200 "$HTTP_STATUS"

call_api GET "/projects/$PROJECT_ID/tasks?type=research"
assert_status "GET tasks (filter by type)" 200 "$HTTP_STATUS"

call_api GET "/projects/$PROJECT_ID/tasks?effort=low"
assert_status "GET tasks (filter by effort)" 200 "$HTTP_STATUS"

call_api GET "/projects/$PROJECT_ID/tasks/by-number/1"
assert_status "GET tasks/by-number/:number" 200 "$HTTP_STATUS"

call_api PATCH "/projects/$PROJECT_ID/tasks/$TASK_ID" \
  -d '{"title":"First task (updated)","description":"Updated","status":"in_progress","type":"review","effort":"high","priority":10}'
assert_status "PATCH tasks/:id (all fields)" 200 "$HTTP_STATUS"

call_api PATCH "/projects/$PROJECT_ID/tasks/$TASK2_ID" \
  -d '{"status":"done"}'
assert_status "PATCH tasks/:id (single field)" 200 "$HTTP_STATUS"

call_api DELETE "/projects/$PROJECT_ID/tasks/$TASK3_ID"
assert_status "DELETE tasks/:id" 200 "$HTTP_STATUS"

# ── tags ─────────────────────────────────────────────────────────────────────

echo "=== Tags ==="

TAG_A="area:backend-$RUN_ID"
TAG_B="area:frontend-$RUN_ID"
TAG_C="urgent-$RUN_ID"

call_api POST /tags -d "{\"name\":\"$TAG_A\"}"
assert_status "POST /tags (create with prefix)" 201 "$HTTP_STATUS"
TAG_ID=$(echo "$BODY" | json_field id)

call_api POST /tags -d "{\"name\":\"$TAG_B\"}"
assert_status "POST /tags (create second)" 201 "$HTTP_STATUS"
TAG2_ID=$(echo "$BODY" | json_field id)

call_api POST /tags -d "{\"name\":\"$TAG_C\"}"
assert_status "POST /tags (create without prefix)" 201 "$HTTP_STATUS"
TAG3_ID=$(echo "$BODY" | json_field id)

call_api GET /tags
assert_status "GET /tags (list)" 200 "$HTTP_STATUS"

call_api GET "/tags?limit=1&offset=0"
assert_status "GET /tags (paginated)" 200 "$HTTP_STATUS"

call_api GET "/tags?prefix=area"
assert_status "GET /tags (filter by prefix)" 200 "$HTTP_STATUS"

# ── task ↔ tag associations ──────────────────────────────────────────────────

echo "=== Task Tags ==="

call_api POST "/projects/$PROJECT_ID/tasks/$TASK_ID/tags" -d "{\"name\":\"$TAG_A\"}"
assert_status "POST task tags (attach tag)" 201 "$HTTP_STATUS"

call_api POST "/projects/$PROJECT_ID/tasks/$TASK_ID/tags" -d "{\"name\":\"$TAG_C\"}"
assert_status "POST task tags (attach second tag)" 201 "$HTTP_STATUS"
TASK_TAG_ID=$(echo "$BODY" | json_field id)

call_api GET "/projects/$PROJECT_ID/tasks/$TASK_ID/tags"
assert_status "GET task tags (list)" 200 "$HTTP_STATUS"

call_api DELETE "/projects/$PROJECT_ID/tasks/$TASK_ID/tags/$TASK_TAG_ID"
assert_status "DELETE task tags (detach)" 200 "$HTTP_STATUS"

# ── tag → tasks lookups ──────────────────────────────────────────────────────

echo "=== Tag → Task Lookups ==="

TAG_A_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TAG_A', safe=''))")
call_api GET "/tags/$TAG_A_ENCODED/tasks"
assert_status "GET /tags/:name/tasks" 200 "$HTTP_STATUS"

call_api GET "/tags/prefix/area/tasks"
assert_status "GET /tags/prefix/:prefix/tasks" 200 "$HTTP_STATUS"

call_api GET "/tags/prefix/area/tasks?limit=1&offset=0"
assert_status "GET /tags/prefix/:prefix/tasks (paginated)" 200 "$HTTP_STATUS"

# ── tag cleanup ──────────────────────────────────────────────────────────────

call_api DELETE "/tags/$TAG3_ID"
assert_status "DELETE /tags/:id" 200 "$HTTP_STATUS"

# ── workbenches ──────────────────────────────────────────────────────────────

echo "=== Workbenches ==="

call_api POST /workbenches -d '{"goal":"Refactor auth module","cursor":"step-1","status":"running"}'
assert_status "POST /workbenches (create with all fields)" 201 "$HTTP_STATUS"
WB_ID=$(echo "$BODY" | json_field id)

call_api POST /workbenches -d '{"goal":"Minimal workbench"}'
assert_status "POST /workbenches (create minimal)" 201 "$HTTP_STATUS"
WB2_ID=$(echo "$BODY" | json_field id)

call_api GET /workbenches
assert_status "GET /workbenches (list)" 200 "$HTTP_STATUS"

call_api GET "/workbenches?limit=1&offset=0"
assert_status "GET /workbenches (paginated)" 200 "$HTTP_STATUS"

call_api GET "/workbenches?status=running"
assert_status "GET /workbenches (filter by status)" 200 "$HTTP_STATUS"

call_api GET "/workbenches/$WB_ID"
assert_status "GET /workbenches/:id" 200 "$HTTP_STATUS"

call_api PATCH "/workbenches/$WB_ID" -d '{"goal":"Refactor auth module (v2)","cursor":"step-2","status":"paused"}'
assert_status "PATCH /workbenches/:id (all fields)" 200 "$HTTP_STATUS"

call_api DELETE "/workbenches/$WB2_ID"
assert_status "DELETE /workbenches/:id" 200 "$HTTP_STATUS"

# ── instructions ─────────────────────────────────────────────────────────────

echo "=== Instructions ==="

call_api POST "/workbenches/$WB_ID/instructions" \
  -d '{"prompt":"Identify all auth-related files","position":0,"agent":"researcher","parallel":false,"actor":"agent","status":"pending"}'
assert_status "POST instructions (create with all fields)" 201 "$HTTP_STATUS"
INSTR_ID=$(echo "$BODY" | json_field id)

call_api POST "/workbenches/$WB_ID/instructions" \
  -d '{"prompt":"Draft migration plan"}'
assert_status "POST instructions (create minimal)" 201 "$HTTP_STATUS"
INSTR2_ID=$(echo "$BODY" | json_field id)

call_api POST "/workbenches/$WB_ID/instructions" \
  -d '{"prompt":"Execute migration","actor":"human"}'
assert_status "POST instructions (create third)" 201 "$HTTP_STATUS"
INSTR3_ID=$(echo "$BODY" | json_field id)

call_api GET "/workbenches/$WB_ID/instructions"
assert_status "GET instructions (list)" 200 "$HTTP_STATUS"

call_api GET "/workbenches/$WB_ID/instructions?limit=1&offset=0"
assert_status "GET instructions (paginated)" 200 "$HTTP_STATUS"

call_api GET "/workbenches/$WB_ID/instructions?status=pending"
assert_status "GET instructions (filter by status)" 200 "$HTTP_STATUS"

call_api GET "/workbenches/$WB_ID/instructions/$INSTR_ID"
assert_status "GET instructions/:id" 200 "$HTTP_STATUS"

call_api PATCH "/workbenches/$WB_ID/instructions/$INSTR_ID" \
  -d '{"prompt":"Identify auth files (updated)","output":"Found 12 files","agent":"scanner","parallel":true,"actor":"agent","status":"complete"}'
assert_status "PATCH instructions/:id (all fields)" 200 "$HTTP_STATUS"

call_api POST "/workbenches/$WB_ID/instructions/reorder" \
  -d "{\"instruction_ids\":[\"$INSTR2_ID\",\"$INSTR_ID\",\"$INSTR3_ID\"]}"
assert_status "POST instructions/reorder" 200 "$HTTP_STATUS"

call_api DELETE "/workbenches/$WB_ID/instructions/$INSTR3_ID"
assert_status "DELETE instructions/:id" 200 "$HTTP_STATUS"

# ── instruction bindings ─────────────────────────────────────────────────────

echo "=== Instruction Bindings ==="

call_api POST "/workbenches/$WB_ID/instructions/$INSTR_ID/bindings" \
  -d "{\"arn\":\"tab:task:$TASK_ID\",\"kind\":\"input\"}"
assert_status "POST bindings (create input)" 201 "$HTTP_STATUS"
BIND_ID=$(echo "$BODY" | json_field id)

call_api POST "/workbenches/$WB_ID/instructions/$INSTR_ID/bindings" \
  -d "{\"arn\":\"tab:project:$PROJECT_ID\",\"kind\":\"context\"}"
assert_status "POST bindings (create context)" 201 "$HTTP_STATUS"
BIND2_ID=$(echo "$BODY" | json_field id)

call_api GET "/workbenches/$WB_ID/instructions/$INSTR_ID/bindings"
assert_status "GET bindings (list)" 200 "$HTTP_STATUS"

call_api DELETE "/workbenches/$WB_ID/instructions/$INSTR_ID/bindings/$BIND2_ID"
assert_status "DELETE bindings/:id" 200 "$HTTP_STATUS"

# ── bindings by ARN lookup ───────────────────────────────────────────────────

echo "=== Bindings by ARN ==="

call_api GET "/bindings?arn=tab:task:$TASK_ID"
assert_status "GET /bindings?arn=..." 200 "$HTTP_STATUS"

# ── summary ──────────────────────────────────────────────────────────────────

echo
echo "════════════════════════════════════"
echo "  $PASS passed, $FAIL failed"
echo "════════════════════════════════════"

[ "$FAIL" -eq 0 ] || exit 1
