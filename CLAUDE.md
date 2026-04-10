# tab-for-projects

Self-contained project management tool. TypeScript, Bun, Hono, React, SQLite.

## Quick reference

- `bun run build` — build frontend assets
- `bun test` — run tests (SQLite-backed, no external deps)
- `bun scripts/smoke-tests/pg-migration-test.ts` — test Postgres migrations against local Docker (requires `docker-compose up postgres`)
- `bun scripts/smoke-tests/pg-smoke-test.ts` — verify Postgres schema, vector columns, and HNSW indexes
- `bun scripts/smoke-tests/embedding-smoke-test.ts` — test Ollama embedding pipeline end-to-end
- `bun scripts/smoke-tests/semantic-search-smoke-test.ts` — test vector similarity search
- `bun scripts/migrate-sqlite-to-pg.ts` — dry-run SQLite→Postgres data migration (add `--commit` to write)

## Conventions

- TypeScript strict mode, no `any`
- IDs are ULIDs, generated server-side
- Timestamps are ISO 8601 UTC strings
- SQL lives in repositories only — never in routes or services
- No ORMs — raw SQL via `bun:sqlite`
- Validation happens in services; routes parse HTTP and return errors
- Dependencies wired explicitly in `bootstrap.ts` — no globals or service locators
- No DEFAULT values in the schema
- Document-first: all rich content is stored as documents, linked to entities via typed references. Projects and tasks hold only `title` and `summary` (max 1000 chars) inline. Tasks also have `context` (freeform background/rationale, max 100K chars) and `acceptance_criteria` (freeform completion criteria, max 100K chars) as inline text fields.

### Document reference types

| Type | When to use |
|------|-------------|
| goal | What the entity is trying to achieve |
| plan | Steps and strategy to get there |
| requirements | Constraints, acceptance criteria, specifications |
| design | Architectural decisions, technical shape |
| reference | Supporting material, context, background |
| note | Freeform — anything that doesn't fit above |

References are "dumb pointers" — they do not enrich the document; the document is already enriched with its own title, summary, tags, and content.

### Embeddings

`projects`, `tasks`, and `documents` each have a `vector(768)` embedding column (pgvector, nomic-embed-text via Ollama). Embeddings are **opt-in**: set `EMBEDDINGS_ENABLED=true` to activate the pipeline (default: `false`). When disabled, Postgres runs without Ollama and embedding columns stay NULL. Embeddings are generated asynchronously via the embedding pipeline (`embedding-pipeline.ts`) on create/update events.

`buildEmbeddingText()` in `embedding.ts` controls what gets embedded: `title` + `summary`, with `context` and `acceptance_criteria` for tasks (truncated to 2000 chars each via `EMBEDDING_FIELD_LIMIT` to fit within nomic-embed-text's 8K token window). For documents without a summary, the first 500 chars of `content` are used as a fallback (`CONTENT_FALLBACK_LIMIT`). **If the summary column max length changes, update `CONTENT_FALLBACK_LIMIT` to match** — the two should stay in sync so the fallback produces vectors of comparable weight.

## Architecture

```
Route handler → Service → Repository → SQLite
```

Single process, single port (default 3000):
- `/api/*` — REST API (projects, tasks, documents, activity-log, health)
- `/mcp` — MCP endpoint (13 tools: create/read/update for projects, tasks, documents; dependency graph)
- `/*` — static web assets + SPA fallback

### Data model

Core tables: `projects`, `tasks`, `document_references`, `activity_log`.

**Projects:** `id`, `title`, `summary`, `created_at`, `updated_at`

**Tasks:** `id`, `project_id`, `title`, `summary`, `context`, `acceptance_criteria`, `status`, `effort`, `impact`, `category`, `group_key`, `is_blocked`, `created_at`, `updated_at`

**document_references:** `entity_type`, `entity_id`, `document_id`, `type` — composite PK on all four columns. Polymorphic (no FK on `entity_id`); FK CASCADE on `document_id`. Type is one of: goal, plan, requirements, design, reference, note. Same document can be attached to the same entity with different types. Multiple documents can share the same type on one entity.

**task_dependencies:** `source_task_id`, `target_task_id`, `dependency_type`, `created_at` — supports `blocks` and `relates_to` edge types. Edges are informational only — they do not enforce `is_blocked`, which is a user-managed field on tasks.

Knowledge base tables (migration 009+):
- `documents` — id, title, summary, content, folder, favorite, created_at, updated_at (top-level entity)
- `tags` — id, name (unique index), created_at
- `entity_tags` — entity_type, entity_id, tag_id (polymorphic join; composite PK; no FK on entity_id)

Migration history: `project_documents` (migration 009) was replaced by `document_references` (migration 019–020). Old project text columns (`goal`, `requirements`, `design`) migrated to documents in migration 021. Old task text columns (`description`, `plan`, `implementation`, `acceptance_criteria`) migrated in migration 022. Columns dropped in migration 023. Migration 024 added `folder` column to `documents`. Migration 026 re-added `context` and `acceptance_criteria` as inline text columns on tasks. Migration 027 materialized `is_blocked` as a column on tasks (previously computed at read time from dependency edges; now a plain user-managed boolean).

### REST API

All create/update endpoints use batch semantics with `{items: [...]}` request bodies.

- `POST /api/projects` — `{items: [{title, summary?, documents?}]}`
- `PATCH /api/projects` — `{items: [{id, title?, summary?, documents?}]}`
- `POST /api/tasks` — `{items: [{project_id, title, summary?, context?, acceptance_criteria?, status?, effort?, impact?, category?, group_key?, documents?}]}`
- `PATCH /api/tasks` — `{items: [{id, title?, summary?, context?, acceptance_criteria?, status?, effort?, impact?, category?, group_key?, is_blocked?, documents?, add_dependencies?, remove_dependencies?}]}`
- `GET /api/tasks` — supports filters: `project_id`, `status`, `effort`, `impact`, `category`, `group_key`, `title`, `blocked`
- `POST /api/documents` — `{items: [{title, summary?, content?, folder?, tags?, favorite?}]}` batch create
- `PATCH /api/documents` — `{items: [{id, title?, summary?, content?, folder?, tags?, favorite?}]}` batch update; tags array replaces all existing tags
- `GET /api/documents` — list with pagination, `?tag`, `?title`, `?search`, `?favorite`, `?folder`, `?entity_type`+`?entity_id` filters
- `GET /api/documents/:id` — full content with tags
- `DELETE /api/documents` — `{ids: [...]}` batch delete

The `documents` field on project/task endpoints uses merge-patch semantics:
```json
{
  "documents": {
    "doc-123": [{"type": "design"}, {"type": "reference"}],
    "doc-456": [{"type": "goal"}],
    "doc-789": null
  }
}
```
- **Key present with array** — replaces all reference types for that document on this entity
- **Key present with null** — removes all references to that document from this entity
- **Key absent** — no change

### MCP tools

13 tools total (no delete tools — deletion is REST-only):
- **Projects:** `list_projects`, `get_project`, `create_project`, `update_project`
- **Tasks:** `list_tasks`, `get_task`, `create_task`, `update_task`
- **Dependencies:** `get_dependency_graph` (returns tasks and edges only; no blocker computation)
- **Documents:** `list_documents`, `get_document`, `create_document`, `update_document`

`create_project` and `create_task` accept optional `documents` merge-patch field. `update_project` and `update_task` accept `documents` merge-patch field. `get_project` and `get_task` return a `references` array with document_id, type, title, summary, and favorite for each linked document. `create_task` and `update_task` accept optional `context` and `acceptance_criteria` string fields. `update_task` accepts `is_blocked` boolean. `get_task` returns all fields in the response.

### Tagging system

Polymorphic via `entity_tags` (entity_type + entity_id + tag_id). Tags resolved via findOrCreate (idempotent, INSERT OR IGNORE). `setTagsForEntity` does full replacement (delete + reinsert). Tag names normalized to lowercase by service layer. `entity_tags` rows explicitly cleaned up on entity delete (no FK cascade on polymorphic entity_id). 15 allowed tag values grouped into Domain, Content Type, and Concern categories.

### Frontend

Documents page at `/documents` with list/detail modes. Tag filtering, title search, markdown rendering. WebSocket-driven refetch on document entity events.

## Testing

- ALWAYS update tests alongside code changes. Tests are not a separate step — they ship with the code.
- ALWAYS run `bun test` after changes to domain or API code and confirm they pass.
- ALWAYS run Postgres smoke tests (`bun scripts/smoke-tests/pg-migration-test.ts`, `pg-smoke-test.ts`, `embedding-smoke-test.ts`, `semantic-search-smoke-test.ts`) after changes to Postgres migrations, repositories, schema, or embeddings.
- Test API changes against the dev server at http://localhost:3000 when it's running.
- NEVER attempt to start the dev server or Docker services — assume they're already running if needed.
