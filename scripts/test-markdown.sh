#!/usr/bin/env bash
# Creates tasks with markdown descriptions against the local dev server.
# Usage: bash scripts/test-markdown.sh

API="http://localhost:3000/api"

echo "=== Creating project ==="
PROJECT_JSON=$(curl -s -X POST "$API/projects" \
  -H "Content-Type: application/json" \
  -d "$(cat <<'JSON'
{
  "name": "Markdown Test",
  "description": "Throwaway project for testing markdown rendering."
}
JSON
)")
echo "$PROJECT_JSON" | python3 -m json.tool
PROJECT_ID=$(echo "$PROJECT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
BASE="$API/projects/$PROJECT_ID/tasks"
echo

echo "=== Creating tasks with markdown descriptions ==="
echo

# 1. Headings, paragraphs, emphasis
curl -s -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -d "$(cat <<'JSON'
{
  "title": "[MD test] Headings & emphasis",
  "description": "# Top-level heading\n\nA paragraph with **bold**, *italic*, and ~~strikethrough~~ text.\n\n## Second-level heading\n\nAnother paragraph. This one has `inline code` in it.\n\n### Third-level heading\n\n> A blockquote to test the left-border styling."
}
JSON
)" | python3 -m json.tool
echo

# 2. Lists (ordered, unordered, nested)
curl -s -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -d "$(cat <<'JSON'
{
  "title": "[MD test] Lists",
  "description": "## Unordered list\n\n- First item\n- Second item\n  - Nested item A\n  - Nested item B\n- Third item\n\n## Ordered list\n\n1. Step one\n2. Step two\n3. Step three\n\n## Task list (GFM)\n\n- [x] Completed task\n- [ ] Pending task\n- [ ] Another pending task"
}
JSON
)" | python3 -m json.tool
echo

# 3. Code blocks
curl -s -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -d "$(cat <<'JSON'
{
  "title": "[MD test] Code blocks",
  "description": "Here's some inline code: `const x = 42;`\n\nAnd a fenced block:\n\n```typescript\ninterface Task {\n  id: string;\n  title: string;\n  description: string;\n  status: 'todo' | 'in_progress' | 'done';\n}\n\nfunction createTask(input: Partial<Task>): Task {\n  return { ...defaults, ...input };\n}\n```\n\nAnd a shell example:\n\n```bash\ncurl -s http://localhost:3000/api/projects/tab-projects/tasks | jq '.data[0]'\n```"
}
JSON
)" | python3 -m json.tool
echo

# 4. Table (GFM)
curl -s -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -d "$(cat <<'JSON'
{
  "title": "[MD test] Tables",
  "description": "## Comparison table\n\n| Library | Renders to | Sanitization needed | Bundle size |\n|---------|-----------|--------------------|-----------|\n| react-markdown | React elements | No | ~12 kB |\n| marked | HTML string | Yes | ~4 kB |\n| markdown-it | HTML string | Yes | ~8 kB |\n\nThe table above should have aligned columns and styled headers."
}
JSON
)" | python3 -m json.tool
echo

# 5. Links, horizontal rule, mixed content
curl -s -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -d "$(cat <<'JSON'
{
  "title": "[MD test] Links & mixed content",
  "description": "Check out [react-markdown](https://github.com/remarkjs/react-markdown) for details.\n\n---\n\nBelow the rule, a mix of everything:\n\n1. **Bold in a list** with `code` and a [link](https://example.com)\n2. *Italic item* with ~~strikethrough~~\n\n> Blockquote with **bold** and `code` inside it.\n\nFinal paragraph."
}
JSON
)" | python3 -m json.tool

echo
echo "=== Done — open the UI and click each [MD test] task ==="
