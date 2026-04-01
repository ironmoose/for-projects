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
- `/api/*` — REST API (projects, tasks, activity-log, health)
- `/mcp` — MCP endpoint (8 tools: CRUD for projects and tasks)
- `/*` — static web assets + SPA fallback

### Data model

Three tables: `projects`, `tasks`, `activity_log`. Agents and jobs were removed (April 2026) — migration 008 drops those tables. Old migration files (003, 004) are kept because the migrator tracks applied filenames in `schema_migrations`.

### REST API

All create/update endpoints use batch semantics with `{items: [...]}` request bodies.

- `POST /api/projects` — `{items: [{title, goal?, requirements?, design?}]}`
- `PATCH /api/projects` — `{items: [{id, title?, goal?, ...}]}`
- `POST /api/tasks` — `{items: [{project_id, title, status?, effort?, impact?, category?, group_key?}]}`
- `PATCH /api/tasks` — `{items: [{id, project_id, status?, ...}]}`
- `GET /api/tasks` — supports filters: `project_id`, `status`, `effort`, `impact`, `category`, `group_key`

## Testing

ALWAYS attempt to test changes to the api and domain modules by using the dev server hosted at http://localhost:3000. 
NEVER attempt to run the dev server or docker support established in this repository.