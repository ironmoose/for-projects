# tab-for-projects

Self-contained project management tool. TypeScript, Bun, Hono, React, SQLite.

## Quick reference

- `bun run build` — build frontend assets
- `bun test` — run tests

## Conventions

- TypeScript strict mode, no `any`
- IDs are ULIDs, generated server-side
- Timestamps are ISO 8601 UTC strings
- SQL lives in repositories only — never in routes or services
- No ORMs — raw SQL via `bun:sqlite`
- Validation happens in services; routes parse HTTP and return errors
- Dependencies wired explicitly in `bootstrap.ts` — no globals or service locators
- No DEFAULT values in the schema
- Document-first: all rich content is stored as documents, linked to entities via typed references. Projects and tasks hold only `title` and `summary` (max 1000 chars) inline.

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

## Architecture

```
Route handler → Service → Repository → SQLite
```

Single process, single port (default 3000):
- `/api/*` — REST API (projects, tasks, documents, activity-log, health)
- `/mcp` — MCP endpoint (17 tools: CRUD for projects, tasks, documents; dependency graph; ready tasks)
- `/*` — static web assets + SPA fallback

### Data model

Core tables: `projects`, `tasks`, `document_references`, `activity_log`.

**Projects:** `id`, `title`, `summary`, `created_at`, `updated_at`

**Tasks:** `id`, `project_id`, `title`, `summary`, `status`, `effort`, `impact`, `category`, `group_key`, `is_blocked`, `created_at`, `updated_at`

**document_references:** `entity_type`, `entity_id`, `document_id`, `type` — composite PK on all four columns. Polymorphic (no FK on `entity_id`); FK CASCADE on `document_id`. Type is one of: goal, plan, requirements, design, reference, note. Same document can be attached to the same entity with different types. Multiple documents can share the same type on one entity.

**task_dependencies:** `source_task_id`, `target_task_id`, `dependency_type`, `created_at` — supports `blocks` and `relates_to` edge types.

Knowledge base tables (migration 009+):
- `documents` — id, title, summary, content, favorite, created_at, updated_at (top-level entity)
- `tags` — id, name (unique index), created_at
- `entity_tags` — entity_type, entity_id, tag_id (polymorphic join; composite PK; no FK on entity_id)

Migration history: `project_documents` (migration 009) was replaced by `document_references` (migration 019–020). Old project text columns (`goal`, `requirements`, `design`) migrated to documents in migration 021. Old task text columns (`description`, `plan`, `implementation`, `acceptance_criteria`) migrated in migration 022. Columns dropped in migration 023.

### REST API

All create/update endpoints use batch semantics with `{items: [...]}` request bodies.

- `POST /api/projects` — `{items: [{title, summary?, documents?}]}`
- `PATCH /api/projects` — `{items: [{id, title?, summary?, documents?}]}`
- `POST /api/tasks` — `{items: [{project_id, title, summary?, status?, effort?, impact?, category?, group_key?, documents?}]}`
- `PATCH /api/tasks` — `{items: [{id, title?, summary?, status?, effort?, impact?, category?, group_key?, documents?, add_dependencies?, remove_dependencies?}]}`
- `GET /api/tasks` — supports filters: `project_id`, `status`, `effort`, `impact`, `category`, `group_key`, `blocked`
- `POST /api/documents` — `{items: [{title, summary?, content?, tags?, favorite?}]}` batch create
- `PATCH /api/documents` — `{items: [{id, title?, summary?, content?, tags?, favorite?}]}` batch update; tags array replaces all existing tags
- `GET /api/documents` — list with pagination, `?tag`, `?title`, `?search`, `?favorite`, `?entity_type`+`?entity_id` filters
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

17 tools total:
- **Projects:** `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project`
- **Tasks:** `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`
- **Dependencies:** `get_dependency_graph`, `get_ready_tasks`
- **Documents:** `list_documents`, `get_document`, `create_document`, `update_document`, `delete_document`

`create_project` and `create_task` accept optional `documents` merge-patch field. `update_project` and `update_task` accept `documents` merge-patch field. `get_project` and `get_task` return a `references` array with document_id, type, title, summary, and favorite for each linked document.

### Tagging system

Polymorphic via `entity_tags` (entity_type + entity_id + tag_id). Tags resolved via findOrCreate (idempotent, INSERT OR IGNORE). `setTagsForEntity` does full replacement (delete + reinsert). Tag names normalized to lowercase by service layer. `entity_tags` rows explicitly cleaned up on entity delete (no FK cascade on polymorphic entity_id). 15 allowed tag values grouped into Domain, Content Type, and Concern categories.

### Frontend

Documents page at `/documents` with list/detail modes. Tag filtering, title search, markdown rendering. WebSocket-driven refetch on document entity events.

## Testing

ALWAYS attempt to test changes to the api and domain modules by using the dev server hosted at http://localhost:3000. 
NEVER attempt to run the dev server or docker support established in this repository.
