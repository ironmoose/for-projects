# Tab for Projects

A self-contained project management tool with a web UI, REST API, and MCP server. Manage projects, tasks, and a knowledge base of documents — all from a single process.

Built with TypeScript, Bun, Hono, React, and SQLite. Optionally runs on PostgreSQL with vector embeddings for semantic search.

## Quick Start

### Install and run (SQLite, zero config)

```bash
bun install
bun run serve
# Open http://localhost:3000
```

### Run with Docker (PostgreSQL + semantic search)

```bash
cp .env.example .env
docker compose up -d --build
# Open http://localhost:3000
```

The Docker stack includes PostgreSQL with pgvector, Ollama for embeddings, and the app server. The first launch pulls the `nomic-embed-text` model (~270MB); subsequent starts skip the download.

### Global install

```bash
bun install -g @x4lt7ab/tab-for-projects
tab-for-projects
```

## Features

- **Projects** — organize work into projects with titles, summaries, and linked documents
- **Tasks** — track work items with status, effort, impact, category, grouping, and dependency graphs
- **Knowledge Base** — a document store with markdown content, tags, folders, and favorites
- **Semantic Search** — vector similarity search across documents (PostgreSQL + Ollama)
- **MCP Server** — 14 tools for AI assistants to read and write project data
- **Real-time Updates** — WebSocket push keeps the UI in sync across tabs
- **Themes** — four built-in color themes including an animated synthwave mode

## Architecture

Single process, single port (default 3000):

```
/api/*   REST API (projects, tasks, documents, activity log, health)
/mcp     MCP endpoint (Model Context Protocol for AI tool use)
/ws      WebSocket (broadcast-only domain events)
/*       Static web assets + SPA fallback
```

Data flow:

```
Route handler -> Service -> Repository -> SQLite or PostgreSQL
```

No ORMs. Raw SQL. Dependencies wired explicitly in `bootstrap.ts`.

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and uncomment what you need.

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `SQLITE_PATH` | `./data/sqlite.db` | Path to SQLite database file. Used when `DATABASE_URL` is not set. |
| `DATABASE_URL` | — | PostgreSQL connection string. When set, the app uses Postgres instead of SQLite. |

### Embeddings

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDINGS_ENABLED` | `false` | Set to `true` to activate the embedding pipeline. Requires PostgreSQL and Ollama. |
| `OLLAMA_HOST` | — | Ollama API URL (e.g., `http://localhost:3002`). Required when embeddings are enabled. |

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PM_HOST` | `0.0.0.0` | Bind address for the HTTP server. |
| `PM_PORT` | `3000` | Port for the HTTP server. |

### Docker Compose

| Variable | Default | Description |
|----------|---------|-------------|
| `PG_PORT` | `3001` | Host port mapped to PostgreSQL. |
| `OLLAMA_PORT` | `3002` | Host port mapped to Ollama. |
| `POSTGRES_DB` | `tab_projects` | PostgreSQL database name. |
| `POSTGRES_USER` | `tab_projects` | PostgreSQL user. |
| `POSTGRES_PASSWORD` | `tab_projects` | PostgreSQL password. |

## Web UI

Access the web UI at `http://localhost:3000`. Navigation is via the top bar.

### Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Project list. Create projects, see task status summaries. |
| Project Detail | `/projects/{id}` | Tasks, dependency graph, and linked documents for a single project. |
| Knowledge Base | `/documents` | Browse, search, filter, create, and read documents. |
| Activity | `/activity` | Chronological log of all create/update/delete events. |
| Themes | `/themes` | Switch between color themes. |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Show keyboard shortcuts help |
| `g h` | Go to Dashboard |
| `g d` | Go to Knowledge Base |
| `g a` | Go to Activity |

### Search

The Knowledge Base search bar supports two modes:

- **Keyword search** (default) — filters documents by title substring match.
- **Semantic search** — uses vector similarity to find documents by meaning. Available when the backend runs PostgreSQL with Ollama embeddings enabled.

When semantic search is available, a toggle button appears inside the search bar. Click it to switch modes — the button slides across the input. Search icon (right side) for keyword mode, brain icon (left side) for semantic mode.

### Themes

Four built-in themes, selectable from the Themes page:

| Theme | Description |
|-------|-------------|
| Deep Teal | Dark teal background with cyan accents. The default. |
| Ember | Warm dark background with orange accents. |
| Nord | Cool arctic dark with ice-blue accents. |
| Synth | Neon retrowave with animated color-cycling glow effects. |

## Data Model

### Projects

Projects are containers for tasks. They have a title, an optional summary (max 1000 chars), and linked documents.

### Tasks

Tasks belong to a project. Each task has:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Required. |
| `summary` | string or null | Short description (max 1000 chars). |
| `context` | string or null | Background, rationale, or freeform notes. |
| `acceptance_criteria` | string or null | What "done" looks like. |
| `status` | enum | `todo`, `in_progress`, `done`, `archived` |
| `effort` | enum or null | `trivial`, `low`, `medium`, `high`, `extreme` |
| `impact` | enum or null | `trivial`, `low`, `medium`, `high`, `extreme` |
| `category` | enum or null | `feature`, `bugfix`, `refactor`, `test`, `perf`, `infra`, `docs`, `security`, `design`, `chore` |
| `group_key` | string or null | Freeform grouping label. |
| `is_blocked` | boolean | Whether the task is blocked. Set by the user, not computed. |

### Task Dependencies

Tasks can be linked with two edge types:

- **blocks** — "Task A blocks Task B" means B can't proceed until A is done.
- **relates_to** — An informational link between related tasks.

Dependencies are visible on the project detail page as an interactive force-directed graph.

### Documents

Documents are top-level knowledge base entities. They can exist standalone or be linked to projects and tasks via typed references.

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Required. |
| `summary` | string or null | Shown in list views (max 1000 chars). |
| `content` | string or null | Full markdown body. |
| `folder` | string or null | Flat grouping label (lowercase, alphanumeric + hyphens, max 64 chars). |
| `favorite` | boolean | Pin to favorites filter. |
| `tags` | enum array | 1-3 tags from the closed set below. |

### Tags

Tags are a closed enum of 15 values, organized into three categories:

| Category | Tags |
|----------|------|
| **Domain** | `ui`, `data`, `integration`, `infra`, `domain` |
| **Content Type** | `architecture`, `conventions`, `guide`, `reference`, `decision`, `troubleshooting` |
| **Concern** | `security`, `performance`, `testing`, `accessibility` |

### Document References

Documents are linked to projects and tasks via typed references. The same document can be attached to multiple entities with different reference types.

| Reference Type | When to use |
|----------------|-------------|
| `goal` | What the entity is trying to achieve |
| `plan` | Steps and strategy to get there |
| `requirements` | Constraints, specs, acceptance criteria |
| `design` | Architectural decisions, technical shape |
| `reference` | Supporting material, context, background |
| `note` | Anything that doesn't fit the above |

## REST API

All create and update endpoints use batch semantics with `{ items: [...] }` request bodies. All responses are JSON.

### Projects

```
GET    /api/projects                    List projects (paginated)
GET    /api/projects/:id                Get project with linked documents
POST   /api/projects                    Create projects  { items: [{ title, summary? }] }
PATCH  /api/projects                    Update projects  { items: [{ id, title?, summary?, documents? }] }
DELETE /api/projects                    Delete projects  { ids: [...] }
```

### Tasks

```
GET    /api/tasks                       List tasks (filterable)
GET    /api/tasks/:id                   Get full task detail
POST   /api/tasks                       Create tasks     { items: [{ project_id, title, ... }] }
PATCH  /api/tasks                       Update tasks     { items: [{ id, ... }] }
DELETE /api/tasks                       Delete tasks     { ids: [...] }
```

Task list query parameters: `project_id`, `status`, `effort`, `impact`, `category`, `group_key`, `title`, `blocked`.

Task update supports dependency management via `add_dependencies` and `remove_dependencies` arrays.

### Documents

```
GET    /api/documents                   List documents (paginated, filterable)
GET    /api/documents/:id               Get document with tags and references
GET    /api/documents/search?q=...      Semantic search (Postgres + embeddings only)
POST   /api/documents                   Create documents { items: [{ title, summary?, content?, tags?, folder?, favorite? }] }
PATCH  /api/documents                   Update documents { items: [{ id, ... }] }
DELETE /api/documents                   Delete documents { ids: [...] }
```

Document list query parameters: `tag`, `title`, `search`, `favorite`, `folder`, `entity_type` + `entity_id`.

Semantic search query parameters: `q` (required), `tag`, `folder`, `favorite`, `limit`.

### Document References (merge-patch)

Project and task create/update endpoints accept a `documents` field with merge-patch semantics:

```json
{
  "documents": {
    "doc-123": [{"type": "design"}, {"type": "reference"}],
    "doc-456": [{"type": "goal"}],
    "doc-789": null
  }
}
```

- **Key with array** — replaces all reference types for that document on this entity.
- **Key with null** — removes all references to that document.
- **Key absent** — no change.

### Document Import

Import content from external URLs into the knowledge base via source connectors.

```
POST   /api/documents/import               Import from URL  { url, folder?, tags?, favorite? }
POST   /api/documents/:id/refresh           Re-fetch content from original source
GET    /api/sources/github/tree?repo=...    Browse files in a GitHub repository
```

The import endpoint detects the source type (currently GitHub) and fetches the content automatically. Imported documents track their `source_url`, `source_type`, and `source_fetched_at` so they can be refreshed later.

### Other Endpoints

```
GET    /api/projects/:id/dependency-graph   Task dependency graph (nodes + edges)
GET    /api/tasks/status-counts?project_ids=...  Task counts by status per project
GET    /api/activity-log                    Activity log (paginated)
GET    /api/health                          Health check (db, ollama, backend type)
```

## MCP Server

The MCP endpoint at `/mcp` exposes 14 tools for AI assistants. Connect any MCP-compatible client to `http://localhost:3000/mcp`.

### Setup

**Claude Code:**

```bash
claude mcp add tab-for-projects --transport http http://localhost:3000/mcp
```

**Claude Desktop** (Settings > Developer > Edit Config):

```json
{
  "mcpServers": {
    "tab-for-projects": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**Cursor** (Settings > MCP Servers > Add):

- Name: `tab-for-projects`
- Type: `url`  
- URL: `http://localhost:3000/mcp`

**Any MCP client:**

```json
{
  "mcpServers": {
    "tab-for-projects": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List projects with pagination and title search. |
| `get_project` | Get a project with its linked document references. |
| `create_project` | Create projects with optional document links. |
| `update_project` | Update projects. Supports document merge-patch. |
| `list_tasks` | List tasks with filters for status, effort, impact, category, blocked, group. |
| `get_task` | Get full task detail including context, acceptance criteria, and document references. |
| `create_task` | Create tasks in a project. |
| `update_task` | Update tasks. Supports dependency management. |
| `list_documents` | List documents with tag, folder, search, and favorite filters. |
| `get_document` | Get full document content with tags and entity references. |
| `create_document` | Create documents with markdown content, tags, and folder. |
| `update_document` | Update documents. Tag array replaces all existing tags. |
| `get_dependency_graph` | Get the task dependency graph for a project. |
| `search_documents` | Semantic search using vector similarity. Requires Postgres + embeddings. |

## WebSocket

Connect to `ws://localhost:3000/ws` for real-time domain events. The connection is broadcast-only — client messages are ignored.

Event shape:

```json
{
  "type": "created | updated | deleted",
  "entity_type": "project | task | document",
  "ids": ["01JABBCD..."]
}
```

The web UI uses this to auto-refresh without polling.

## Development

### Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with hot reload (API watch + Vite watch). |
| `bun run build` | Build frontend assets. |
| `bun run start` | Start production server (SQLite). |
| `bun run serve` | Build then start. |
| `bun test` | Run all tests (SQLite-backed, no external deps). |
| `bun run typecheck` | TypeScript type checking. |
| `bun run prune` | Clean up old activity log entries. |

### Smoke Tests

These require the Docker Compose services to be running.

```bash
bun scripts/smoke-tests/pg-migration-test.ts           # Postgres migrations
bun scripts/smoke-tests/pg-smoke-test.ts               # Schema, vectors, indexes
bun scripts/smoke-tests/embedding-smoke-test.ts        # Ollama embedding pipeline
bun scripts/smoke-tests/semantic-search-smoke-test.ts  # Vector similarity search
```

### Managing Embeddings

Embeddings power semantic search and require PostgreSQL with pgvector and Ollama running the `nomic-embed-text` model. The Docker Compose stack handles all of this automatically.

**How it works:** When `EMBEDDINGS_ENABLED=true`, an event-driven pipeline listens for entity creates and updates. Each change triggers an async embedding generation via Ollama — the HTTP request returns immediately while the embedding is computed in the background.

**Verifying the pipeline:**

```bash
# Verify Ollama is healthy and the model is loaded
bun scripts/smoke-tests/embedding-smoke-test.ts

# Verify vector search returns ranked results
bun scripts/smoke-tests/semantic-search-smoke-test.ts
```

**Backfill after migration:** When migrating from SQLite to PostgreSQL, existing entities have no embeddings. The server automatically runs a one-time backfill on startup — it finds all rows with `NULL` embedding columns and generates vectors for them. Progress is logged to the console.

**Manual verification:** The health endpoint at `/api/health` reports Ollama connectivity and the current backend type. If `ollama` shows as unreachable, embeddings will degrade gracefully — search falls back to keyword matching and new entities simply skip embedding generation.

### SQLite to PostgreSQL Migration

```bash
bun scripts/migrate-sqlite-to-pg.ts          # Dry run
bun scripts/migrate-sqlite-to-pg.ts --commit # Write data
```

### Project Structure

```
src/
  domain/              Core logic — entities, services, repositories, migrations
    db/
      migrations/
        sqlite/        SQLite migration files
        pg/            PostgreSQL migration files
    repositories/
      sqlite/          SQLite repository implementations
      pg/              PostgreSQL repository implementations
    services/          Service implementations
  server/              HTTP server and route handlers
  mcp/                 MCP server and tool registration
  web/                 React frontend (Vite)
    src/
      components/      UI component library (atoms, molecules, organisms, templates)
      hooks/           React hooks
      pages/           Page components
scripts/               Maintenance and smoke test scripts
```

### Conventions

- TypeScript strict mode, no `any`.
- IDs are ULIDs, generated server-side.
- Timestamps are ISO 8601 UTC strings.
- SQL lives in repositories only — never in routes or services.
- Validation happens in services; routes parse HTTP and return errors.
- Dependencies wired explicitly in `bootstrap.ts` — no globals or service locators.

## Deployment Modes

### SQLite (default)

Zero configuration. Data stored in a single file. No vector search.

```bash
SQLITE_PATH=./data/sqlite.db bun run src/index.ts
```

### PostgreSQL + Embeddings

Full feature set including semantic search. Requires PostgreSQL with pgvector and Ollama with `nomic-embed-text`.

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db \
EMBEDDINGS_ENABLED=true \
OLLAMA_HOST=http://localhost:11434 \
bun run src/index.ts
```

### Docker Compose

Manages all services (app, Postgres, Ollama) together:

```bash
docker compose up -d --build
```

Image versions are pinned in `docker-compose.yml` and `Dockerfile` to avoid unnecessary re-pulls on rebuild.

## Upgrading

```bash
bun install -g @x4lt7ab/tab-for-projects@latest
```

Restart the server after upgrading. Database migrations run automatically on startup.

## License

MIT
