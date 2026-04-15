# tab-for-projects

Self-contained project management tool. TypeScript, Bun, Hono, React, SQLite.

## Dev Environment

When running locally, three services are available:

| Service | Port | Description |
|---------|------|-------------|
| App (dev server) | `localhost:3000` | Hono API + static SPA. Started via `make dev` or `make dev-pg`. |
| PostgreSQL | `localhost:3001` | pgvector-enabled Postgres. Started via `docker-compose up`. |
| Ollama | `localhost:3002` | Embedding model server (nomic-embed-text). Started via `docker-compose up`. |

`docker-compose up` starts Postgres, Ollama, and the model pull sidecar. The `app` service is behind the `app` profile — it only starts with `docker-compose --profile app up`. For local dev, run the app directly via `make dev` or `make dev-pg` instead.

## Commands

```bash
make build           # build frontend assets (vite)
make test            # run tests (SQLite-backed, no external deps)
make typecheck       # tsc --noEmit
make verify          # typecheck + test + build (full check)
make dev             # start API + vite watch (requires SQLITE_PATH)
make dev-pg          # same but with Postgres + Ollama
make deploy          # bump patch, typecheck, test, build, tag, push
```

Smoke tests (require Docker services running):
```bash
bun scripts/smoke-tests/pg-migration-test.ts       # test Postgres migrations
bun scripts/smoke-tests/pg-smoke-test.ts            # verify schema, vectors, indexes
bun scripts/smoke-tests/embedding-smoke-test.ts     # Ollama embedding pipeline
bun scripts/smoke-tests/semantic-search-smoke-test.ts  # vector similarity search
```

Other scripts:
```bash
bun scripts/migrate-sqlite-to-pg.ts          # dry-run SQLite→Postgres migration (--commit to write)
bun scripts/prune-activity-log.ts            # prune old activity log entries
bun scripts/regenerate-embeddings.sh         # re-embed all entities
```

## Source Layout

```
src/
├── index.ts                     # server entry point
├── domain/
│   ├── bootstrap.ts             # dependency wiring — all services, repos, connectors
│   ├── entities.ts              # entity types, status enums, allowed values
│   ├── inputs.ts                # input validation schemas (Zod)
│   ├── errors.ts                # domain error classes
│   ├── events.ts                # event emitter for real-time updates
│   ├── embedding.ts             # buildEmbeddingText(), vector utilities
│   ├── embedding-pipeline.ts    # async embedding worker
│   ├── services/                # business logic (one file per entity)
│   │   ├── projects.ts
│   │   ├── tasks.ts
│   │   ├── documents.ts
│   │   ├── sources.ts           # import/refresh via source connectors
│   │   ├── activity-log.ts
│   │   ├── task-dependencies.ts
│   │   ├── document-references.ts
│   │   └── project-context.ts   # token-budgeted context assembly
│   ├── repositories/
│   │   ├── interfaces.ts        # repository interfaces (shared by SQLite + Pg)
│   │   ├── sqlite/              # SQLite implementations (one per entity)
│   │   └── pg/                  # Postgres implementations (one per entity)
│   ├── connectors/              # source connector plugins
│   │   ├── types.ts             # SourceConnector interface
│   │   ├── registry.ts          # ConnectorRegistry
│   │   └── github.ts            # GitHub file/README connector
│   └── db/
│       └── migrations/
│           ├── sqlite/          # numbered .sql migration files
│           └── pg/              # Postgres equivalents
├── server/
│   └── routes/                  # Hono route handlers (one per entity)
│       ├── projects.ts
│       ├── tasks.ts
│       ├── documents.ts
│       ├── sources.ts
│       ├── activity-log.ts
│       └── validation.ts        # shared request validation helpers
├── mcp/
│   ├── server.ts                # MCP tool definitions and handlers
│   ├── standalone.ts            # standalone MCP server (stdio transport)
│   └── index.ts
└── web/
    └── src/
        ├── main.tsx             # React entry — providers, error boundary
        ├── App.tsx              # root component, hash routing, keyboard shortcuts
        ├── components/
        │   ├── atoms/           # Button, Input, Select, Icon, Badge, Skeleton, etc.
        │   ├── molecules/       # Card, Stack, TagChip, Markdown, SearchToggle, etc.
        │   ├── organisms/       # TopBar, ModalShell, TaskTable, DocumentTable, etc.
        │   ├── templates/       # DetailPageLayout, ListPageLayout
        │   └── theme/           # ThemeContext (compat wrapper), lib-themes (ThemeDefinitions), compat (migration layer), theme (legacy tokens)
        ├── pages/               # DashboardPage, ProjectPage, DocumentsPage, etc.
        ├── hooks/               # useProject, useDocuments, useEventSubscription, etc.
        └── types/               # shared frontend types

scripts/                         # operational scripts (migrations, smoke tests, etc.)
```

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
- **Accessibility is required, not optional.** Every `IconButton` needs `aria-label`. Interactive elements need keyboard handlers (`tabIndex`, `onKeyDown`). Toggles need `aria-pressed`. Collapsible sections need `aria-expanded`. Use semantic HTML (`<main>`, `<nav>`, `<header>`). The `a11y-pass.test.ts` suite enforces these — update it when adding interactive components.

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

`buildEmbeddingText()` in `embedding.ts` controls what gets embedded: title is repeated 3× (`TITLE_REPEAT`) to dominate the vector, followed by summary (truncated to 200 chars via `SUMMARY_LIMIT`), then `context` and `acceptance_criteria` for tasks (truncated to 500 chars each via `EMBEDDING_FIELD_LIMIT`). For documents without a summary, the first 500 chars of `content` are used as a fallback (`CONTENT_FALLBACK_LIMIT`). Semantic search applies a minimum similarity threshold of 0.4 to filter low-precision results. **If the summary column max length changes, update `CONTENT_FALLBACK_LIMIT` to match** — the two should stay in sync so the fallback produces vectors of comparable weight.

## Architecture

```
Route handler → Service → Repository → SQLite or PostgreSQL
```

Single process, single port (default 3000):
- `/api/*` — REST API (projects, tasks, documents, automations, activity-log, health)
- `/mcp` — MCP endpoint (18 tools: create/read/update/search for projects, tasks, documents, automations; dependency graph)
- `/*` — static web assets + SPA fallback

### Data model

Core tables: `projects`, `tasks`, `automations`, `document_references`, `activity_log`.

**Projects:** `id`, `title`, `summary`, `created_at`, `updated_at`

**Tasks:** `id`, `project_id`, `title`, `summary`, `context`, `acceptance_criteria`, `status`, `effort`, `impact`, `category`, `group_key`, `is_blocked`, `created_at`, `updated_at`

**document_references:** `entity_type`, `entity_id`, `document_id`, `type` — composite PK on all four columns. Polymorphic (no FK on `entity_id`); FK CASCADE on `document_id`. Type is one of: goal, plan, requirements, design, reference, note. Same document can be attached to the same entity with different types. Multiple documents can share the same type on one entity.

**task_dependencies:** `source_task_id`, `target_task_id`, `dependency_type`, `created_at` — supports `blocks` and `relates_to` edge types. Edges are informational only — they do not enforce `is_blocked`, which is a user-managed field on tasks.

**automations:** `id`, `title`, `summary`, `prompt`, `agent`, `category`, `is_favorite`, `created_at`, `updated_at` — saved prompts with metadata. `prompt` is the big content field (equivalent to documents.content). `agent` hints the `--agent` CLI flag. Tags via polymorphic `entity_tags` (entity_type = 'automation'). Migration 030.

Knowledge base tables (migration 009+):
- `documents` — id, title, summary, content, folder, favorite, source_url, source_type, source_fetched_at, created_at, updated_at (top-level entity). `source_url` (TEXT nullable) is the original external URL; `source_type` (TEXT nullable) identifies the connector (e.g., `'github'`); `source_fetched_at` (TEXT nullable, ISO 8601 UTC) records when content was last fetched.
- `tags` — id, name (unique index), created_at
- `entity_tags` — entity_type, entity_id, tag_id (polymorphic join; composite PK; no FK on entity_id)

Migration history: `project_documents` (migration 009) was replaced by `document_references` (migration 019–020). Old project text columns (`goal`, `requirements`, `design`) migrated to documents in migration 021. Old task text columns (`description`, `plan`, `implementation`, `acceptance_criteria`) migrated in migration 022. Columns dropped in migration 023. Migration 024 added `folder` column to `documents`. Migration 026 re-added `context` and `acceptance_criteria` as inline text columns on tasks. Migration 027 materialized `is_blocked` as a column on tasks (previously computed at read time from dependency edges; now a plain user-managed boolean). Migration 029 added `source_url`, `source_type`, `source_fetched_at` to `documents`.

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
- `POST /api/documents/import` — `{url, folder?, tags?, favorite?}` — import content from an external URL via source connectors
- `POST /api/documents/:id/refresh` — re-fetch content from the document's original source
- `GET /api/documents/search?q=...` — semantic vector search (Postgres + embeddings only); additional filters: `tag`, `folder`, `favorite`, `limit`
- `GET /api/sources/github/tree?repo=owner/repo&q=filter` — browse files in a GitHub repository
- `POST /api/automations` — `{items: [{title, summary?, prompt?, agent?, category?, is_favorite?, tags?}]}` batch create
- `PATCH /api/automations` — `{items: [{id, title?, summary?, prompt?, agent?, category?, is_favorite?, tags?}]}` batch update
- `GET /api/automations` — list with pagination; filters: `title`, `category`, `is_favorite`, `tag`
- `GET /api/automations/:id` — full automation with tags
- `DELETE /api/automations` — `{ids: [...]}` batch delete

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

18 tools total (no delete tools — deletion is REST-only):
- **Projects:** `list_projects`, `get_project`, `create_project`, `update_project`
- **Tasks:** `list_tasks`, `get_task`, `create_task`, `update_task`
- **Dependencies:** `get_dependency_graph` (returns tasks and edges only; no blocker computation)
- **Documents:** `list_documents`, `get_document`, `create_document`, `update_document`, `search_documents`
- **Automations:** `list_automations`, `get_automation`, `create_automation`, `update_automation`

`search_documents` performs semantic vector search (Postgres + embeddings only). Returns documents ranked by hybrid similarity (vector + keyword boost). Parameters: `query` (required), `tag`, `folder`, `favorite`, `limit`.

`create_project` and `create_task` accept optional `documents` merge-patch field. `update_project` and `update_task` accept `documents` merge-patch field. `get_project` and `get_task` return a `references` array with document_id, type, title, summary, and favorite for each linked document. `create_task` and `update_task` accept optional `context` and `acceptance_criteria` string fields. `update_task` accepts `is_blocked` boolean. `get_task` returns all fields in the response.

### Source connectors

Plugin system for importing external content into documents. `SourceConnector` interface (`src/domain/connectors/types.ts`) defines two methods: `canHandle(url)` and `fetch(url)`. `ConnectorRegistry` (`registry.ts`) holds registered connectors and resolves URLs to the appropriate one. `SourceService` orchestrates import (create document from URL) and refresh (re-fetch content for an existing document).

Current connectors:
- `GitHubConnector` — fetches public files and READMEs from GitHub repositories

**Adding a new connector:**
1. Implement `SourceConnector` interface (`canHandle` + `fetch`)
2. Add the type string to `SOURCE_TYPES` in `entities.ts`
3. Register the connector in `bootstrap.ts`

### Tagging system

Polymorphic via `entity_tags` (entity_type + entity_id + tag_id). Tags resolved via findOrCreate (idempotent, INSERT OR IGNORE). `setTagsForEntity` does full replacement (delete + reinsert). Tag names normalized to lowercase by service layer. `entity_tags` rows explicitly cleaned up on entity delete (no FK cascade on polymorphic entity_id). 15 allowed tag values grouped into Domain, Content Type, and Concern categories.

### Frontend

React 19 SPA served as static assets from `/web/dist/`. Hash-based routing (`#/projects`, `#/documents`, etc.).

**Component hierarchy** (atomic design):
```
atoms/       → Button, Input, Select, Icon, Badge, Skeleton, StatusDot, etc.
molecules/   → Card, Stack, TagChip, Markdown, SearchToggle, Pagination, etc.
organisms/   → TopBar, ModalShell, TaskTable, DocumentTable, DependencyGraphView, etc.
templates/   → DetailPageLayout, ListPageLayout
pages/       → DashboardPage, ProjectPage, DocumentsPage, ActivityLogPage
```

**`@4lt7ab/ui` is the only component source. No exceptions.** Every UI element — buttons, inputs, modals, markdown rendering, layout primitives — must come from `@4lt7ab/ui` (subpaths: `/ui`, `/core`, `/content`, `/animations`). Never hand-roll a component that the library already provides. If something is missing, add it to the library first, then consume it here.

**Styling:** 100% inline styles via React `style` prop. No CSS files, no CSS modules, no Tailwind. Components read semantic tokens from the theme system. The `@4lt7ab/ui` component library is the underlying design system.

**Theme system:** Powered by `@4lt7ab/ui/core` ThemeProvider. 4 custom themes (deepTeal, ember, nord, synth) defined as `ThemeDefinition` objects in `theme/lib-themes.ts`. The library injects CSS custom properties (`var(--color-text)`, etc.) on the document root. Two import paths coexist:
- **Compat (widely used):** `import { useTheme } from "../theme/ThemeContext"` — returns nested token structure (`theme.color.text`, `theme.spacing.md`). Mapped tokens resolve to library CSS vars; unmapped tokens (glow, motion, layout) preserve original values from `theme/theme.ts`.
- **Library (preferred for new code):** `import { semantic as t } from "@4lt7ab/ui/core"` — flat token references (`t.colorText`, `t.spaceMd`).
- Compat layer: `theme/compat.ts` bridges old token shapes to library CSS vars. `theme/theme.ts` provides legacy theme definitions for unmapped tokens (glow, motion, layout, breakpoint). `theme/ThemeContext.tsx` wraps the library ThemeProvider and exposes the compat `useTheme()` hook. All three files are load-bearing — do not delete.
- The synth theme adds animated canvas backgrounds and cycling CSS glow effects via the glow token system (`theme.glow.*`). Only `SynthBackground` checks `themeName === 'synth'` directly; all other synth handling flows through glow tokens.

**State management:** React hooks + Context API. No external state libraries. Custom hooks for data fetching (`useProject`, `useDocuments`, etc.), real-time events (`useEventSubscription`), keyboard shortcuts (`useKeyboardShortcuts`), and D3 force simulation (`useForceGraph`).

**Real-time updates:** WebSocket connection pushes entity events. Components subscribe via `useEventSubscription` and refetch on relevant events.

## Every Commit

Three things are **always** touched alongside code changes:

1. **Tests** — tests ship with the code, not after it. Add or update tests for every functional change. Run `bun test` and confirm green before committing.
2. **CHANGELOG.md** — every commit adds a bullet to the changelog under the current `## [Unreleased]` section. **No category headers** (no `### Added`, `### Fixed`, etc.) — just flat bullets under the version. **Keep entries terse** — one short line per change, no implementation details. The changelog says *what* changed, not *how* or *why*. Example: `- Migrate Overlay atom to @4lt7ab/ui re-export`.
3. **CLAUDE.md** — if the change adds modules, changes conventions, alters architecture, or introduces new workflows, update this file. Keep it current — a stale CLAUDE.md teaches wrong patterns.

These are not optional. A commit without updated tests and changelog is incomplete.

## Testing

- ALWAYS update tests alongside code changes. Tests are not a separate step — they ship with the code.
- ALWAYS run `bun test` after changes to domain or API code and confirm they pass.
- ALWAYS run Postgres smoke tests (`bun scripts/smoke-tests/pg-migration-test.ts`, `pg-smoke-test.ts`, `embedding-smoke-test.ts`, `semantic-search-smoke-test.ts`) after changes to Postgres migrations, repositories, schema, or embeddings.
- Test API changes against the dev server at http://localhost:3000 when it's running.
- NEVER attempt to start the dev server or Docker services — assume they're already running if needed.
- **Accessibility tests (`a11y-pass.test.ts`) are load-bearing.** They guard: `aria-label` on every `IconButton`, semantic HTML landmarks (`<main>`, `<nav>`, `<header>`), keyboard navigation on table rows and document cards, `aria-pressed` on toggles, toast `aria-live` region, skip-to-content link, and `aria-expanded` on collapsible groups. When adding an `IconButton`, toggle, or interactive element — update these tests. Do not delete this file.

## Adding an API Route

1. Create route handler in `src/server/routes/{resource}.ts`
2. Add service method in `src/domain/services/{resource}.ts` with validation
3. Add repository method in `src/domain/repositories/sqlite/{resource}.ts` (and `pg/` if applicable)
4. Register route in `src/server/routes/` barrel and wire in `src/domain/bootstrap.ts`
5. Add tests in `src/domain/integration.test.ts` or a dedicated test file
6. Update CHANGELOG.md
7. `bun test && bun run typecheck`

## Adding a Migration

1. Create `src/domain/db/migrations/sqlite/{NNN}_{description}.sql` (next sequential number)
2. Create matching `src/domain/db/migrations/pg/{NNN}_{description}.sql`
3. Update repository code if the migration adds/changes columns
4. Update `entities.ts` if new fields or types are introduced
5. Update service validation in `inputs.ts` if new fields need validation
6. Add tests for the new schema behavior
7. Update CHANGELOG.md
8. `bun test` (SQLite migrations auto-apply in tests)
9. `bun scripts/smoke-tests/pg-migration-test.ts` (if Postgres is running)

## Adding a Frontend Component

1. Create component file in the appropriate tier: `src/web/src/components/{atoms|molecules|organisms}/{Name}.tsx`
2. Use theme tokens via `useTheme()` — no hardcoded colors or pixel values
3. Export from `src/web/src/components/index.ts` barrel
4. Update CHANGELOG.md
5. `bun run build` (vite build must succeed)

## Adding an MCP Tool

1. Define the tool in `src/mcp/server.ts` — add schema, description, and handler
2. Wire to the appropriate service method (create new service method if needed)
3. Add test in `src/mcp/server.test.ts`
4. Update the MCP tools count in this CLAUDE.md if the total changes
5. Update CHANGELOG.md
6. `bun test && bun run typecheck`

## Adding a Source Connector

1. Implement `SourceConnector` interface (`canHandle` + `fetch`) in `src/domain/connectors/{name}.ts`
2. Add the type string to `SOURCE_TYPES` in `entities.ts`
3. Register the connector in `bootstrap.ts`
4. Add tests in `src/domain/connectors/{name}.test.ts`
5. Update CHANGELOG.md
6. `bun test`

## Releasing

**Always use `make` targets, never call `deploy.sh` directly.**

```bash
make deploy              # bump patch  (0.1.8 → 0.1.9)
make deploy-minor        # bump minor  (0.1.8 → 0.2.0)
make deploy-major        # bump major  (0.1.8 → 1.0.0)
make deploy V=2.0.0      # exact version
```

The deploy target: typechecks, runs tests, builds frontend, bumps `package.json` version, stamps `CHANGELOG.md` with the version and date, commits, tags (`v{version}`), and pushes to origin with tags.

Other useful make targets:
```bash
make verify              # typecheck + test + build (no deploy)
make smoke               # run Postgres smoke tests
make smoke-all           # run all smoke tests including embeddings
make clean               # remove dist and caches
```

## Gotchas

- **CONTENT_FALLBACK_LIMIT must match summary max length.** `buildEmbeddingText()` uses the first 500 chars of document content as a fallback when no summary exists. If the summary column max length changes, update `CONTENT_FALLBACK_LIMIT` in `embedding.ts` to match — otherwise fallback vectors will have different weight than summary vectors.
- **SQLite migrations auto-apply; Postgres doesn't.** Tests use SQLite with auto-migration. Postgres migrations must be explicitly tested via `pg-migration-test.ts`. A migration that works in SQLite can fail in Postgres due to syntax differences (e.g., `BOOLEAN` vs `INTEGER`, `TEXT` vs `VARCHAR`).
- **Vite build output goes to `src/web/dist/`.** The server serves this directory as static assets. If `bun run build` fails, the server will serve stale assets without warning.
- **`document_references` has no FK on `entity_id`.** It's polymorphic — the same table references projects, tasks, and documents. Deleting an entity does NOT cascade-delete its references. Entity delete code must explicitly clean up references.
- **`entity_tags` has the same polymorphic pattern.** No FK cascade on `entity_id`. Tags must be explicitly cleaned up on entity delete.
- **`is_blocked` on tasks is user-managed, not computed.** Despite `task_dependencies` existing, `is_blocked` is a plain boolean set by the user. Dependency edges are informational only.
- **The synth theme uses glow tokens, not theme-name checks.** Components use `theme.glow.*` tokens for glow effects. Only `SynthBackground` checks `themeName === 'synth'` directly. Do not add new `themeName === 'synth'` branches — use glow tokens instead.
- **No DEFAULT values in SQLite schema.** All values must be explicitly provided in INSERT statements. This is by convention to keep the schema explicit.
