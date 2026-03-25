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
├── domain/                  Core business logic and data access
│   ├── index.ts             Domain barrel export
│   ├── args.ts              CLI argument parsing and server utilities
│   ├── bootstrap.ts         Wires up DB, repositories, and services
│   ├── entities.ts          Entity types (Project, Task)
│   ├── errors.ts            ServiceError
│   ├── inputs.ts            Create/Update input types
│   ├── services.ts          Service interfaces
│   ├── statuses.ts          Status enums
│   ├── db/
│   │   ├── connection.ts    SQLite connection (bun:sqlite, WAL mode)
│   │   └── schema.ts        Table definitions and migrations
│   ├── repositories/
│   │   ├── projects.ts      ProjectRepository — all SQL for projects
│   │   └── tasks.ts         TaskRepository — all SQL for tasks
│   └── services/
│       ├── projects.ts      ProjectService
│       └── tasks.ts         TaskService
├── server/                  Single Hono server (API + MCP + static web)
│   ├── index.ts             Entrypoint — Server class, starts on port 3000
│   └── routes/
│       ├── projects.ts      HTTP handlers for /api/projects
│       └── tasks.ts         HTTP handlers for /api/projects/:slug/tasks
├── mcp/                     MCP tool definitions
│   ├── index.ts             MCP barrel export
│   ├── server.ts            MCP tool registration and HTTP handler
│   └── standalone.ts        Standalone MCP server (for separate-process use)
└── web/                     Vite + React frontend
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api.ts
        └── components/
```

## Architecture

### Single server

Everything runs in one process on one port (default 3000):

- `/api/*` — REST API (with request logging)
- `/mcp` — MCP endpoint (no logging)
- `/*` — static web assets + SPA fallback

### Request lifecycle

An HTTP request flows through three layers:

```
Route handler  →  Service  →  Repository  →  SQLite
```

1. **Route handlers** (`src/server/routes/`) parse the request, validate input, and return HTTP responses. They never write SQL.
2. **Services** (`src/domain/services/`) contain business logic and validation. They sit between route handlers and repositories.
3. **Repositories** (`src/domain/repositories/`) own all database queries. They accept typed inputs, return typed outputs, and are the only code that imports `bun:sqlite`.
4. **Database** (`src/domain/db/`) manages the connection and schema. Migrations run once at startup.

This separation means you can test business logic by swapping in a mock repository, and you can change query structure without touching HTTP code.

### Dependency wiring

Dependencies are wired in `src/domain/bootstrap.ts` and passed down explicitly — no global singletons, no service locator. The `bootstrap()` function creates the database, builds repositories and services, and returns a context object:

```typescript
const ctx = bootstrap();
app.route("/api/projects", projectRoutes(ctx.projectService));
```

## Adding a new feature

Most features follow the same steps:

### 1. Add the migration

Add a `CREATE TABLE` statement to `src/domain/db/schema.ts`:

```typescript
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id),
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'todo',
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);
```

### 2. Create the repository

Add `src/domain/repositories/tasks.ts`. Define your types and a repository class:

```typescript
export interface Task { ... }
export type CreateTaskInput = Pick<Task, "project_id" | "title">;

export class TaskRepository {
  constructor(private db: Database) {}

  findByProject(projectId: string): Task[] { ... }
  create(input: CreateTaskInput): Task { ... }
}
```

### 3. Create the route handler

Add `src/server/routes/tasks.ts`. Accept the service as a parameter:

```typescript
export function taskRoutes(service: ITaskService): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json(service.findByProjectSlug(c.req.param("projectSlug")!)));
  return app;
}
```

### 4. Wire it up

In `src/server/index.ts`:

```typescript
const ctx = bootstrap();
app.route("/api/projects/:projectSlug/tasks", taskRoutes(ctx.taskService));
```

### 5. Test it

```bash
bun run dev &
curl -s http://localhost:3000/api/tasks?project_id=... | jq
```

## Conventions

- **TypeScript strict mode** is enabled. Don't use `any` — type your inputs and outputs.
- **IDs** are ULIDs, generated server-side. Never accept client-generated IDs.
- **Timestamps** are ISO 8601 strings in UTC.
- **SQL lives in repositories only.** If you're writing a query in a route handler or service, move it to the repository.
- **No ORMs.** We use raw SQL via `bun:sqlite`. Keep queries simple and readable.
- **Validation happens in route handlers.** Return `400` with a `{"error": "..."}` body for bad input.

## Running tests

```bash
bun test
```

Tests use an in-memory SQLite database so they run fast and don't touch your local data.

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
