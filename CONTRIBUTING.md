# Contributing to tab-pm

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- Node.js 25+ (for some tooling compatibility)

Both are pinned in `.tool-versions` if you use asdf or mise.

## Getting started

```bash
git clone https://github.com/alttab/project-management.git
cd project-management
bun install
bun dev
```

`bun dev` starts the API server with hot reload. The server is available at `http://localhost:3000`.

## Project structure

```
packages/
├── server/                  Hono API server
│   └── src/
│       ├── index.ts         Entrypoint — wires up dependencies and starts the server
│       ├── db/
│       │   ├── connection.ts   SQLite connection (bun:sqlite, WAL mode)
│       │   └── schema.ts       Table definitions and migrations
│       ├── repositories/
│       │   └── projects.ts     ProjectRepository — all SQL for projects
│       └── routes/
│           └── projects.ts     HTTP handlers for /api/projects
└── web/                     Vite + React frontend (planned)
```

## Architecture

### Request lifecycle

An HTTP request flows through three layers:

```
Route handler  →  Repository  →  SQLite
```

1. **Route handlers** (`src/routes/`) parse the request, validate input, and return HTTP responses. They never write SQL.
2. **Repositories** (`src/repositories/`) own all database queries. They accept typed inputs, return typed outputs, and are the only code that imports `bun:sqlite`.
3. **Database** (`src/db/`) manages the connection and schema. Migrations run once at startup.

This separation means you can test business logic by swapping in a mock repository, and you can change query structure without touching HTTP code.

### Dependency wiring

Dependencies are wired in `src/index.ts` and passed down explicitly — no global singletons, no service locator. The server entrypoint creates the database, builds repositories, and hands them to route constructors:

```typescript
const db = createDatabase();
runMigrations(db);

const projectRepo = new ProjectRepository(db);
app.route("/api/projects", projectRoutes(projectRepo));
```

## Adding a new feature

Most features follow the same steps:

### 1. Add the migration

Add a `CREATE TABLE` statement to `src/db/schema.ts`:

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

Add `src/repositories/tasks.ts`. Define your types and a repository class:

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

Add `src/routes/tasks.ts`. Accept the repository as a parameter:

```typescript
export function taskRoutes(repo: TaskRepository): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json(repo.findByProject(c.req.query("project_id")!)));
  return app;
}
```

### 4. Wire it up

In `src/index.ts`:

```typescript
const taskRepo = new TaskRepository(db);
app.route("/api/tasks", taskRoutes(taskRepo));
```

### 5. Test it

```bash
bun dev &
curl -s http://localhost:3000/api/tasks?project_id=... | jq
```

## Conventions

- **TypeScript strict mode** is enabled. Don't use `any` — type your inputs and outputs.
- **IDs** are ULIDs, generated server-side. Never accept client-generated IDs.
- **Timestamps** are ISO 8601 strings in UTC.
- **SQL lives in repositories only.** If you're writing a query in a route handler, move it to the repository.
- **No ORMs.** We use raw SQL via `bun:sqlite`. Keep queries simple and readable.
- **Validation happens in route handlers.** Return `400` with a `{"error": "..."}` body for bad input.

## Running tests

```bash
bun test
```

Tests use an in-memory SQLite database so they run fast and don't touch your local data.

## Testing the CLI locally

You can install `tab-pm` globally from your local checkout to test it as a user would.

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
# Build the frontend and server
bun run build

# Install globally from the local checkout (use the absolute path to the repo)
bun install -g /path/to/project-management

# Run it
tab-pm
```

The server runs in the foreground. Open `http://localhost:3000` in a browser and verify the web UI loads. In a separate terminal, check the API:

```bash
curl -s http://localhost:3000/api/health | jq
```

Press `Ctrl+C` to stop the server.

After making changes, rebuild (`bun run build`) and restart `tab-pm` — the global install symlinks to your local source, so no reinstall is needed.

### Uninstall

```bash
bun remove -g @alttab/project-management
```

## Building for production

```bash
bun run build
```

This builds the React frontend into static assets that the server serves alongside the API.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
