#!/usr/bin/env bash
#
# Emulates the full agent + job data lifecycle against a running dev server.
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

now() { date -u +"%Y-%m-%dT%H:%M:%S.000Z"; }

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
echo "Agent + Job Lifecycle Emulation"
echo "Base URL: $BASE"
echo ""

# 1. Health check
echo "1. Health check"
if ! api_get "/api/health" >/dev/null 2>&1; then
  echo "   Server is not running. Start it with: bun run dev" >&2
  exit 1
fi
log "Server is up"

# 2. Register agent
echo ""
echo "2. Register agent"
AGENT_JSON=$(api_post "/api/agents" '[{
  "name": "code-explorer",
  "description": "Searches and analyzes codebases to answer questions.",
  "platform_agent": "Explore",
  "prompt": "## Job Lifecycle\n\nYou have access to the Tab for Projects MCP.\n\n### Checking for work\n\nCall `list_jobs` with `status: \"todo\"` to find jobs.\n\n### Claiming a job\n\n```\nupdate_job → id: <job_id>, status: \"running\", started_at: <timestamp>\n```\n\n### Reporting results\n\n```\nupdate_job → id: <job_id>, status: \"done\", output: <summary>, ended_at: <timestamp>\n```"
}]')
AGENT_ID=$(echo "$AGENT_JSON" | jq -r '.[0].id')
AGENT_NAME=$(echo "$AGENT_JSON" | jq -r '.[0].name')
AGENT_PLATFORM=$(echo "$AGENT_JSON" | jq -r '.[0].platform_agent')
log "Created: $AGENT_NAME (${AGENT_ID: -8})"
log "Platform agent: $AGENT_PLATFORM"

# 3. Create jobs
echo ""
echo "3. Create jobs"
JOBS_JSON=$(api_post "/api/jobs" "[
  {\"agent_id\": \"$AGENT_ID\", \"input\": \"Find all files that import from the domain layer\"},
  {\"agent_id\": \"$AGENT_ID\", \"input\": \"List the REST API endpoints and their HTTP methods\"},
  {\"agent_id\": \"$AGENT_ID\", \"input\": \"Identify unused exports in src/domain/index.ts\"}
]")
JOB1_ID=$(echo "$JOBS_JSON" | jq -r '.[0].id')
JOB2_ID=$(echo "$JOBS_JSON" | jq -r '.[1].id')
JOB3_ID=$(echo "$JOBS_JSON" | jq -r '.[2].id')
for i in 0 1 2; do
  JID=$(echo "$JOBS_JSON" | jq -r ".[$i].id")
  JSTATUS=$(echo "$JOBS_JSON" | jq -r ".[$i].status")
  JINPUT=$(echo "$JOBS_JSON" | jq -r ".[$i].input" | cut -c1-50)
  log "Job ${JID: -8}: status=$JSTATUS input=\"$JINPUT\""
done

# 4. Poll for todo jobs
echo ""
echo "4. Agent polls for todo jobs"
TODO_TOTAL=$(api_get "/api/jobs?agent_id=$AGENT_ID&status=todo" | jq -r '.total')
log "Found $TODO_TOTAL todo job(s)"

# 5. Claim first job
echo ""
echo "5. Agent claims first job"
STARTED=$(now)
CLAIMED=$(api_patch "/api/jobs" "[{\"id\": \"$JOB1_ID\", \"status\": \"running\", \"started_at\": \"$STARTED\"}]")
log "Job ${JOB1_ID: -8}: status=$(echo "$CLAIMED" | jq -r '.[0].status') started_at=$STARTED"

# 6. Simulate work
echo ""
echo "6. Agent does work..."
sleep 1
log "(simulated 1s of work)"

# 7. Complete job
echo ""
echo "7. Agent completes job"
ENDED=$(now)
COMPLETED=$(api_patch "/api/jobs" "[{
  \"id\": \"$JOB1_ID\",
  \"status\": \"done\",
  \"output\": \"Found 12 files importing from domain layer: 4 in server/routes, 3 in services, 2 in mcp, 3 in tests.\",
  \"ended_at\": \"$ENDED\"
}]")
log "Job ${JOB1_ID: -8}: status=$(echo "$COMPLETED" | jq -r '.[0].status')"
log "Output: $(echo "$COMPLETED" | jq -r '.[0].output' | cut -c1-80)"

# 8. Fail second job
echo ""
echo "8. Agent claims and fails second job"
STARTED2=$(now)
api_patch "/api/jobs" "[{\"id\": \"$JOB2_ID\", \"status\": \"running\", \"started_at\": \"$STARTED2\"}]" >/dev/null
log "Job ${JOB2_ID: -8}: status=running"
sleep 0.5
ENDED2=$(now)
FAILED=$(api_patch "/api/jobs" "[{
  \"id\": \"$JOB2_ID\",
  \"status\": \"failed\",
  \"output\": \"Error: could not parse route definitions — unexpected syntax in routes/agents.ts:15\",
  \"ended_at\": \"$ENDED2\"
}]")
log "Job ${JOB2_ID: -8}: status=$(echo "$FAILED" | jq -r '.[0].status')"
log "Output: $(echo "$FAILED" | jq -r '.[0].output' | cut -c1-80)"

# 9. Final state
echo ""
echo "9. Final job states"
FINAL=$(api_get "/api/jobs?agent_id=$AGENT_ID")
echo "$FINAL" | jq -r '.data[] | "\(.id[-8:])  status=\(.status | ljust(9;" "))  started=\(.started_at // "--")  ended=\(.ended_at // "--")"' 2>/dev/null || \
echo "$FINAL" | jq -c '.data[]' | while read -r row; do
  JID=$(echo "$row" | jq -r '.id[-8:]')
  JSTATUS=$(echo "$row" | jq -r '.status')
  JSTART=$(echo "$row" | jq -r '.started_at // "--"')
  JEND=$(echo "$row" | jq -r '.ended_at // "--"')
  printf "  → %s: status=%-9s started=%s ended=%s\n" "$JID" "$JSTATUS" "$JSTART" "$JEND"
done

echo ""
echo "Done."
echo ""
