# Contributing to tab-for-projects

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- Node.js 25+ (for some tooling compatibility)

Both are pinned in `.tool-versions` if you use asdf or mise.

## Getting started

```bash
git clone https://github.com/alttab/project-management.git
cd project-management
bun install
bun run dev
```

`bun run dev` starts the Bun server (with hot reload) and the Vite dev server (with HMR). The API and MCP are available at `http://localhost:3000`, and the Vite dev server proxies to it from `http://localhost:3002`.

## Project structure

```
src/
├── index.ts                     Entry point (#!/usr/bin/env bun)
├── domain/                      Core business logic and data access
│   ├── bootstrap.ts             Wires up DB, repositories, services, connectors
│   ├── entities.ts              Entity types, enums, and validation constants
│   ├── events.ts                Domain event bus (for embedding pipeline)
│   ├── embedding.ts             Ollama embedding client and text builder
│   ├── embedding-pipeline.ts    Event-driven async embedding generation
│   ├── embedding-backfill.ts    One-time backfill for migrated data
│   ├── connectors/              Source connectors (GitHub, etc.)
│   │   ├── types.ts             SourceConnector interface
│   │   ├── registry.ts          ConnectorRegistry — resolves URLs to connectors
│   │   └── github.ts            GitHubConnector — files and READMEs
│   ├── db/
│   │   ├── connection.ts        SQLite connection (bun:sqlite, WAL mode)
│   │   ├── pg-connection.ts     PostgreSQL connection (postgres.js)
│   │   ├── migrator.ts          SQLite migration runner
│   │   ├── pg-migrator.ts       PostgreSQL migration runner
│   │   └── migrations/
│   │       ├── sqlite/          29 SQLite migration files
│   │       └── pg/              4 PostgreSQL migration files (with pgvector)
│   ├── repositories/
│   │   ├── sqlite/              SQLite implementations (7 repositories)
│   │   └── pg/                  PostgreSQL implementations (9 repositories, incl. embedding)
│   └── services/
│       ├── projects.ts          ProjectService
│       ├── tasks.ts             TaskService
│       ├── documents.ts         DocumentService (incl. semantic search)
│       ├── activity-log.ts      ActivityLogService
│       ├── document-references.ts  DocumentReferenceService
│       ├── task-dependencies.ts TaskDependencyService
│       └── sources.ts           SourceService (import, refresh, repo browsing)
├── server/                      Single Hono server (API + MCP + static web)
│   ├── index.ts                 Server class, middleware, WebSocket handler
│   └── routes/
│       ├── projects.ts          /api/projects
│       ├── tasks.ts             /api/tasks
│       ├── documents.ts         /api/documents (incl. import, search, refresh)
│       ├── sources.ts           /api/sources (GitHub tree browsing)
│       ├── activity-log.ts      /api/activity-log
│       └── validation.ts        Shared input validation helpers
├── mcp/                         MCP tool definitions (14 tools)
│   ├── server.ts                MCP tool registration and HTTP handler
│   └── standalone.ts            Standalone MCP server (for separate-process use)
└── web/                         Vite + React frontend
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api.ts
        ├── components/          UI component library (atoms, molecules, organisms)
        ├── hooks/               Custom React hooks
        └── pages/               Page components (dashboard, projects, documents, etc.)
scripts/
├── prune-activity-log.ts        Clean up old activity log entries
├── migrate-sqlite-to-pg.ts      SQLite → PostgreSQL data migration
└── smoke-tests/
    ├── pg-migration-test.ts     Test Postgres migrations end-to-end
    ├── pg-smoke-test.ts         Verify schema, vectors, HNSW indexes
    ├── embedding-smoke-test.ts  Test Ollama embedding pipeline
    └── semantic-search-smoke-test.ts  Test vector similarity search
```

## Architecture

### Single server

Everything runs in one process on one port (default 3000):

- `/api/*` — REST API (with request logging)
- `/mcp` — MCP endpoint (14 tools, no logging)
- `/ws` — WebSocket (broadcast-only domain events)
- `/*` — static web assets + SPA fallback

### Request lifecycle

An HTTP request flows through three layers:

```
Route handler  →  Service  →  Repository  →  SQLite or PostgreSQL
```

1. **Route handlers** (`src/server/routes/`) parse the request and return HTTP responses. They never write SQL.
2. **Services** (`src/domain/services/`) contain business logic and validation. They sit between route handlers and repositories.
3. **Repositories** (`src/domain/repositories/sqlite/` or `pg/`) own all database queries. They accept typed inputs and return typed outputs.
4. **Database** (`src/domain/db/`) manages connections and migrations. Migrations run once at startup.

The app auto-detects the backend: if `DATABASE_URL` is set it uses PostgreSQL, otherwise SQLite. Repository interfaces are identical across backends — the service layer doesn't know which database it's talking to.

### Dependency wiring

Dependencies are wired in `src/domain/bootstrap.ts` and passed down explicitly — no global singletons, no service locator. The `bootstrap()` function creates the database, builds repositories and services, and returns a context object:

```typescript
const ctx = bootstrap();
app.route("/api/projects", projectRoutes(ctx.projectService));
```

## Adding a new feature

Most features follow the same steps:

### 1. Add the migration

Add a new numbered SQL file in `src/domain/db/migrations/sqlite/` (and `pg/` if supporting PostgreSQL). The migrator runs files in order by filename.

```sql
-- src/domain/db/migrations/sqlite/030_my_feature.sql
CREATE TABLE IF NOT EXISTS my_table (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
```

Convention: no DEFAULT values in the schema — the service layer provides all values explicitly.

### 2. Create the repository

Add a repository in `src/domain/repositories/sqlite/` (and `pg/` for PostgreSQL). Implement the shared interface:

```typescript
// src/domain/repositories/sqlite/my-feature.ts
export class MyFeatureRepository {
  constructor(private db: Database) {}

  findAll(): MyFeature[] { ... }
  create(input: CreateMyFeatureInput): MyFeature { ... }
}
```

### 3. Create the service

Add a service in `src/domain/services/`. Services own validation and business logic:

```typescript
export class MyFeatureService {
  constructor(private repo: MyFeatureRepository) {}

  create(input: CreateMyFeatureInput): MyFeature {
    // validate, then delegate to repo
  }
}
```

### 4. Create the route handler

Add `src/server/routes/my-feature.ts`. Accept the service as a parameter:

```typescript
export function myFeatureRoutes(service: IMyFeatureService): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json(service.findAll()));
  return app;
}
```

### 5. Wire it up

In `src/domain/bootstrap.ts`, create the repository and service. In `src/server/index.ts`, mount the route:

```typescript
app.route("/api/my-feature", myFeatureRoutes(ctx.myFeatureService));
```

### 6. Test it

```bash
bun test                    # Run automated tests
curl -s http://localhost:3000/api/my-feature | jq   # Manual check
```

## Conventions

- **TypeScript strict mode** is enabled. Don't use `any` — type your inputs and outputs.
- **IDs** are ULIDs, generated server-side. Never accept client-generated IDs.
- **Timestamps** are ISO 8601 strings in UTC.
- **SQL lives in repositories only.** If you're writing a query in a route handler or service, move it to the repository.
- **No ORMs.** Raw SQL via `bun:sqlite` (SQLite) or `postgres` (PostgreSQL). Keep queries simple and readable.
- **Validation happens in services.** Route handlers parse HTTP input and return errors; services enforce business rules.
- **No DEFAULT values in the schema.** Services provide all column values explicitly.

## Running tests

```bash
bun test
```

Tests use an in-memory SQLite database so they run fast and don't touch your local data.

### Smoke tests (PostgreSQL + embeddings)

These verify the Postgres backend, pgvector indexes, and Ollama integration. They require Docker Compose services to be running (`docker compose up -d`).

```bash
bun scripts/smoke-tests/pg-migration-test.ts           # Drop + recreate schema, run all migrations
bun scripts/smoke-tests/pg-smoke-test.ts               # Verify schema, vector columns, HNSW indexes
bun scripts/smoke-tests/embedding-smoke-test.ts        # Generate a test embedding via Ollama
bun scripts/smoke-tests/semantic-search-smoke-test.ts  # Insert test data and run vector search
```

Run these after changes to Postgres migrations, repositories, schema, or embedding code.

## Testing locally

You can install `tab-for-projects` globally from your local checkout to test it as a user would.

### One-time setup: add bun's global bin to your PATH

Check if it's already on your PATH:

```bash
bun pm bin -g
```

If the output shows a `warn: not in $PATH` message, add it:

```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Install and run

```bash
# Build the frontend
bun run build

# Install globally from the local checkout (use the absolute path to the repo)
bun install -g /path/to/project-management

# Run it
tab-for-projects
```

Open `http://localhost:3000` in a browser and verify the web UI loads. In a separate terminal, check the API:

```bash
curl -s http://localhost:3000/api/health | jq
```

Press `Ctrl+C` to stop the server.

After making changes, rebuild (`bun run build`) and restart `tab-for-projects` — the global install symlinks to your local source, so no reinstall is needed.

### Uninstall

```bash
bun remove -g @x4lt7ab/tab-for-projects
```

## Building for production

```bash
bun run build
```

This builds the React frontend into static assets that the server serves alongside the API.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
