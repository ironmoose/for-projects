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

## Architecture

```
Route handler → Service → Repository → SQLite
```

Single process, single port (default 3000):
- `/api/*` — REST API (projects, tasks, documents, activity-log, health)
- `/mcp` — MCP endpoint (12 tools: CRUD for projects, tasks, and documents)
- `/*` — static web assets + SPA fallback

### Data model

Core tables: `projects`, `tasks`, `activity_log`. Agents and jobs were removed (April 2026) — migration 008 drops those tables. Old migration files (003, 004) are kept because the migrator tracks applied filenames in `schema_migrations`.

Knowledge base tables (migration 009):
- `documents` — id, title, content, created_at, updated_at (top-level entity, no project FK)
- `tags` — id, name (unique index), created_at
- `entity_tags` — entity_type, entity_id, tag_id (polymorphic join; composite PK; no FK on entity_id)
- `project_documents` — project_id, document_id (many-to-many join; FK cascade both sides)

### REST API

All create/update endpoints use batch semantics with `{items: [...]}` request bodies.

- `POST /api/projects` — `{items: [{title, goal?, requirements?, design?}]}`
- `PATCH /api/projects` — `{items: [{id, title?, goal?, ...}]}`
- `POST /api/tasks` — `{items: [{project_id, title, status?, effort?, impact?, category?, group_key?}]}`
- `PATCH /api/tasks` — `{items: [{id, project_id, status?, ...}]}`
- `GET /api/tasks` — supports filters: `project_id`, `status`, `effort`, `impact`, `category`, `group_key`
- `POST /api/documents` — `{items: [{title, content?, tags?}]}` batch create with tags
- `PATCH /api/documents` — `{items: [{id, title?, content?, tags?}]}` batch update; tags array replaces all existing tags
- `GET /api/documents` — list with pagination, `?tag`, `?title` filters
- `GET /api/documents/:id` — full content with tags
- `DELETE /api/documents` — `{ids: [...]}` batch delete
- `PATCH /api/projects` extended with `attach_documents` / `detach_documents` arrays

### MCP tools

12 tools total. Document tools (4 new): `list_documents`, `get_document`, `create_document`, `update_document`. `update_project` extended with `attach_documents` / `detach_documents`. No `delete_document` tool — delete is REST-only, consistent with projects/tasks.

### Tagging system

Polymorphic via `entity_tags` (entity_type + entity_id + tag_id). Tags resolved via findOrCreate (idempotent, INSERT OR IGNORE). `setTagsForEntity` does full replacement (delete + reinsert). Tag names normalized to lowercase by service layer. `entity_tags` rows explicitly cleaned up on entity delete (no FK cascade on polymorphic entity_id).

### Frontend

Documents page at `/documents` with list/detail modes. Tag filtering, title search, markdown rendering. WebSocket-driven refetch on document entity events.

## Testing

ALWAYS attempt to test changes to the api and domain modules by using the dev server hosted at http://localhost:3000. 
NEVER attempt to run the dev server or docker support established in this repository.