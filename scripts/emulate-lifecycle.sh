#!/usr/bin/env bash
#
# Emulates the full project + task data lifecycle against a running dev server.
#
# Usage:
#   bash scripts/emulate-lifecycle.sh [base-url]
#
# Default base URL: http://localhost:3000

set -euo pipefail

BASE="${1:-http://localhost:3000}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log() { echo "  → $*"; }

api_get() {
  curl -sf "$BASE$1"
}

api_post() {
  curl -sf -X POST "$BASE$1" -H 'Content-Type: application/json' -d "$2"
}

api_patch() {
  curl -sf -X PATCH "$BASE$1" -H 'Content-Type: application/json' -d "$2"
}

api_delete() {
  curl -sf -X DELETE "$BASE$1" -H 'Content-Type: application/json' -d "$2" -o /dev/null
}

jq_or_die() {
  if ! command -v jq &>/dev/null; then
    echo "Error: jq is required. Install it with: brew install jq" >&2
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

jq_or_die

echo ""
echo "Project + Task Lifecycle Emulation"
echo "Base URL: $BASE"
echo ""

# 1. Health check
echo "1. Health check"
if ! api_get "/api/health" >/dev/null 2>&1; then
  echo "   Server is not running. Start it with: bun run dev" >&2
  exit 1
fi
log "Server is up"

# 2. Create project — POST /api/projects expects CreateProjectInput[]
echo ""
echo "2. Create project"
PROJECT_JSON=$(api_post "/api/projects" '[{
  "title": "Lifecycle Test Project",
  "goal": "Created by emulate-lifecycle.sh to exercise the full API lifecycle."
}]')
PROJECT_ID=$(echo "$PROJECT_JSON" | jq -r '.[0].id')
PROJECT_TITLE=$(echo "$PROJECT_JSON" | jq -r '.[0].title')
log "Created: $PROJECT_TITLE (${PROJECT_ID: -8})"

# 3. Create tasks — POST /api/tasks expects CreateTaskInput[] with project_id
echo ""
echo "3. Create tasks"
TASKS_JSON=$(api_post "/api/tasks" "[
  {\"project_id\": \"$PROJECT_ID\", \"title\": \"Find all files that import from the domain layer\"},
  {\"project_id\": \"$PROJECT_ID\", \"title\": \"List the REST API endpoints and their HTTP methods\"},
  {\"project_id\": \"$PROJECT_ID\", \"title\": \"Identify unused exports in src/domain/index.ts\"}
]")
for i in 0 1 2; do
  TID=$(echo "$TASKS_JSON" | jq -r ".[$i].id")
  TSTATUS=$(echo "$TASKS_JSON" | jq -r ".[$i].status")
  TTITLE=$(echo "$TASKS_JSON" | jq -r ".[$i].title" | cut -c1-50)
  log "Task ${TID: -8}: status=$TSTATUS title=\"$TTITLE\""
done

TASK1_ID=$(echo "$TASKS_JSON" | jq -r '.[0].id')
TASK2_ID=$(echo "$TASKS_JSON" | jq -r '.[1].id')
TASK3_ID=$(echo "$TASKS_JSON" | jq -r '.[2].id')

# 4. Start first task — PATCH /api/tasks expects UpdateTaskInput[]
echo ""
echo "4. Update first task to in_progress"
UPDATED=$(api_patch "/api/tasks" "[{\"id\": \"$TASK1_ID\", \"status\": \"in_progress\"}]")
log "Task ${TASK1_ID: -8}: status=$(echo "$UPDATED" | jq -r '.[0].status')"

# 5. Simulate work
echo ""
echo "5. Doing work..."
sleep 1
log "(simulated 1s of work)"

# 6. Complete first task, start second
echo ""
echo "6. Complete first task, start second task"
BATCH=$(api_patch "/api/tasks" "[
  {\"id\": \"$TASK1_ID\", \"status\": \"done\"},
  {\"id\": \"$TASK2_ID\", \"status\": \"in_progress\"}
]")
log "Task ${TASK1_ID: -8}: status=$(echo "$BATCH" | jq -r '.[0].status')"
log "Task ${TASK2_ID: -8}: status=$(echo "$BATCH" | jq -r '.[1].status')"

# 7. List tasks — GET /api/tasks?project_id=X returns {data: [], total: N}
echo ""
echo "7. Final task states"
FINAL=$(api_get "/api/tasks?project_id=$PROJECT_ID")
echo "$FINAL" | jq -c '.data[]' | while read -r row; do
  TID=$(echo "$row" | jq -r '.id' | tail -c 9)
  TSTATUS=$(echo "$row" | jq -r '.status')
  TTITLE=$(echo "$row" | jq -r '.title' | cut -c1-40)
  printf "  → %s: status=%-11s \"%s\"\n" "$TID" "$TSTATUS" "$TTITLE"
done

# 8. Verify counts
echo ""
echo "8. Verify"
TOTAL=$(echo "$FINAL" | jq '.total')
DONE_COUNT=$(echo "$FINAL" | jq '[.data[] | select(.status == "done")] | length')
IN_PROGRESS=$(echo "$FINAL" | jq '[.data[] | select(.status == "in_progress")] | length')
TODO_COUNT=$(echo "$FINAL" | jq '[.data[] | select(.status == "todo")] | length')
log "Total=$TOTAL  done=$DONE_COUNT  in_progress=$IN_PROGRESS  todo=$TODO_COUNT"

# 9. Cleanup — delete tasks then project
echo ""
echo "9. Cleanup"
api_delete "/api/tasks" "{\"ids\": [\"$TASK1_ID\", \"$TASK2_ID\", \"$TASK3_ID\"]}"
log "Deleted 3 tasks"
api_delete "/api/projects" "{\"ids\": [\"$PROJECT_ID\"]}"
log "Deleted project"

echo ""
echo "Done."
echo ""
