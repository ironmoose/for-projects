#!/usr/bin/env bash
# Touch all projects, tasks, and documents to trigger embedding regeneration.
# Usage: ./scripts/regenerate-embeddings.sh [base_url]
#   base_url defaults to http://localhost:4000

set -euo pipefail

BASE="${1:-http://localhost:3000}"

touch_entities() {
  local entity="$1"
  local payload
  payload=$(curl -sf "$BASE/api/$entity" | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
items = [{'id': e['id'], 'title': e['title']} for e in data]
print(json.dumps({'items': items}))
")

  local count
  count=$(echo "$payload" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['items']))")

  if [ "$count" -eq 0 ]; then
    echo "  $entity: nothing to update"
    return
  fi

  curl -sf -X PATCH "$BASE/api/$entity" \
    -H 'Content-Type: application/json' \
    -d "$payload" > /dev/null

  echo "  $entity: touched $count"
}

echo "Regenerating embeddings at $BASE ..."
touch_entities projects
touch_entities tasks
touch_entities documents
echo "Done. Embedding pipeline is processing in the background."
