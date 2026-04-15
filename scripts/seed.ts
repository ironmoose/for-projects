#!/usr/bin/env bun
/**
 * seed.ts — populate a dev database with a curated, representative dataset.
 *
 * Usage:
 *   bun scripts/seed.ts              # skip if data already exists
 *   bun scripts/seed.ts --fresh      # wipe everything first
 *
 * Requires a running dev server (default: http://localhost:3000).
 */

const BASE = process.argv[2]?.startsWith("http")
  ? process.argv[2]
  : "http://localhost:3000";
const FRESH = process.argv.includes("--fresh");

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

const get = <T = unknown>(path: string) => api<T>("GET", path);
const post = <T = unknown>(path: string, body: unknown) =>
  api<T>("POST", path, body);
const patch = <T = unknown>(path: string, body: unknown) =>
  api<T>("PATCH", path, body);
const del = (path: string, body: unknown) => api("DELETE", path, body);

function ids(items: { id: string }[]): string[] {
  return items.map((i) => i.id);
}

// ─── Health check ────────────────────────────────────────────────────────────

console.log(`\nSeed → ${BASE}`);
try {
  await get("/api/health");
} catch {
  console.error("  ✗ Server not reachable. Start it with: make dev");
  process.exit(1);
}
console.log("  ✓ Server is up\n");

// ─── Guard: skip if data exists (unless --fresh) ─────────────────────────────

if (FRESH) {
  console.log("--fresh: wiping existing data...");

  const tasks = await get<{ data: { id: string }[] }>("/api/tasks?limit=500");
  if (tasks.data.length > 0) {
    await del("/api/tasks", { ids: ids(tasks.data) });
    console.log(`  ✓ Deleted ${tasks.data.length} tasks`);
  }

  const docs = await get<{ data: { id: string }[] }>(
    "/api/documents?limit=500",
  );
  if (docs.data.length > 0) {
    await del("/api/documents", { ids: ids(docs.data) });
    console.log(`  ✓ Deleted ${docs.data.length} documents`);
  }

  const projects = await get<{ data: { id: string }[] }>("/api/projects");
  if (projects.data.length > 0) {
    await del("/api/projects", { ids: ids(projects.data) });
    console.log(`  ✓ Deleted ${projects.data.length} projects`);
  }

  console.log("");
} else {
  const existing = await get<{ data: { id: string }[] }>("/api/projects");
  if (existing.data.length > 0) {
    console.log(
      `  ⏭ ${existing.data.length} projects already exist. Use --fresh to wipe first.`,
    );
    process.exit(0);
  }
}

// ─── Documents (knowledge base) ──────────────────────────────────────────────

console.log("Creating documents...");

const documents = await post<{ id: string; title: string }[]>(
  "/api/documents",
  {
    items: [
      {
        title: "TypeScript Conventions",
        summary:
          "Shared TypeScript guidelines — strict mode, no any, barrel exports, error handling patterns.",
        content: `# TypeScript Conventions

## Strict Mode
All projects use \`strict: true\` in tsconfig. No exceptions.

## No \`any\`
Use \`unknown\` when the type is genuinely unknown. Use type guards to narrow.

\`\`\`typescript
// ✗ Bad
function parse(input: any) { return input.value; }

// ✓ Good
function parse(input: unknown): string {
  if (typeof input === 'object' && input !== null && 'value' in input) {
    return String((input as { value: unknown }).value);
  }
  throw new Error('Invalid input');
}
\`\`\`

## Barrel Exports
Each directory gets an \`index.ts\` that re-exports the public API. Internal modules are not exported.

## Error Handling
- Domain errors extend a base \`DomainError\` class
- Never throw raw strings
- Use result types (\`{ ok: true, value } | { ok: false, error }\`) for expected failures
- Reserve exceptions for unexpected failures`,
        folder: "conventions",
        tags: ["conventions", "guide"],
        favorite: true,
      },
      {
        title: "API Design Guidelines",
        summary:
          "REST API conventions — batch endpoints, error shapes, pagination, naming.",
        content: `# API Design Guidelines

## Batch Semantics
All create/update endpoints accept \`{ items: [...] }\` for batch operations.

## Error Shape
\`\`\`json
{
  "error": "Human-readable message",
  "details": [{ "field": "title", "message": "Required" }]
}
\`\`\`

## Pagination
List endpoints return \`{ data: [...], total: N }\`. Default limit: 50. Max: 200.

Query params: \`?limit=N&offset=N\`

## Naming
- Plural nouns for resources: \`/api/projects\`, \`/api/tasks\`
- No verbs in URLs except for actions: \`/api/documents/:id/refresh\`
- snake_case for JSON fields
- ISO 8601 UTC for timestamps`,
        folder: "conventions",
        tags: ["conventions", "reference"],
        favorite: false,
      },
      {
        title: "SQLite vs Postgres Decision",
        summary:
          "ADR: SQLite for development and single-node, Postgres for production with vectors.",
        content: `# ADR: Dual Database Support (SQLite + Postgres)

## Status
Accepted

## Context
We need fast local development (no Docker dependency for basic work) but also vector search and concurrent writes in production.

## Decision
Support both SQLite and Postgres behind a shared repository interface.

- **SQLite**: Default for development. Zero setup. Migrations auto-apply.
- **Postgres**: Production. pgvector for embeddings. Concurrent writes.

## Consequences
- Repository interface must be database-agnostic
- Two sets of migration files (syntax differences)
- Tests run against SQLite only (fast, no Docker)
- Postgres tested via smoke tests (require Docker)

## Trade-offs
- ✓ Developer experience: \`make dev\` works instantly
- ✓ Production readiness: vector search, connection pooling
- ✗ Two migration paths to maintain
- ✗ SQLite-specific bugs may not surface until Postgres smoke tests`,
        folder: "decisions",
        tags: ["architecture", "decision"],
        favorite: true,
      },
      {
        title: "Embedding Pipeline Guide",
        summary:
          "How the async embedding pipeline works — Ollama, nomic-embed-text, vector search.",
        content: `# Embedding Pipeline

## Overview
Entities (projects, tasks, documents) get 768-dimensional vectors via nomic-embed-text (Ollama). Embeddings power semantic search.

## Flow
1. Entity created/updated → event emitted
2. Embedding pipeline picks up event
3. \`buildEmbeddingText()\` assembles text: title (3×) + summary (200 chars) + context fields
4. Ollama generates vector
5. Vector stored in \`vector(768)\` column

## Configuration
- \`EMBEDDINGS_ENABLED=true\` to activate (default: false)
- Ollama runs on port 3002
- Model: nomic-embed-text (pulled automatically by Docker sidecar)

## Gotchas
- Pipeline is async — vectors appear after a short delay
- SQLite has no vector support; embeddings are Postgres-only
- \`CONTENT_FALLBACK_LIMIT\` must match summary max length
- Minimum similarity threshold: 0.4`,
        folder: "guides",
        tags: ["guide", "data", "infra"],
        favorite: false,
      },
      {
        title: "Accessibility Checklist",
        summary:
          "Required a11y patterns for all UI components — aria labels, keyboard nav, semantic HTML.",
        content: `# Accessibility Checklist

Every PR that touches UI must pass these checks:

## Required
- [ ] \`IconButton\` has \`aria-label\`
- [ ] Interactive elements have \`tabIndex\` and \`onKeyDown\`
- [ ] Toggles have \`aria-pressed\`
- [ ] Collapsible sections have \`aria-expanded\`
- [ ] Semantic HTML used (\`<main>\`, \`<nav>\`, \`<header>\`)
- [ ] Skip-to-content link present
- [ ] Toast notifications in \`aria-live\` region

## Testing
The \`a11y-pass.test.ts\` suite enforces these automatically. Update it when adding new interactive components.

## Common Mistakes
- Using \`<div onClick>\` instead of \`<button>\`
- Missing keyboard handler on clickable elements
- Color-only state indication (add icon or text)`,
        folder: "guides",
        tags: ["accessibility", "ui", "guide"],
        favorite: true,
      },
      {
        title: "Troubleshooting: Docker Services",
        summary:
          "Common issues with docker-compose — port conflicts, Ollama model pull, Postgres connection.",
        content: `# Troubleshooting: Docker Services

## Postgres won't start
- **Port 3001 in use**: \`lsof -i :3001\` → kill the process or change the port in docker-compose.yml
- **Data corruption**: \`docker-compose down -v\` to reset volumes, then \`docker-compose up\`

## Ollama model pull hangs
- Check network: \`curl -sf https://ollama.com\`
- Manual pull: \`docker exec -it ollama ollama pull nomic-embed-text\`
- The sidecar retries every 30s — check logs: \`docker-compose logs model-pull\`

## "Connection refused" from app
- Ensure \`docker-compose up\` is running (not \`--profile app\`)
- Check Postgres is ready: \`docker exec -it postgres pg_isready\`
- Verify ports: Postgres=3001, Ollama=3002

## Resetting everything
\`\`\`bash
docker-compose down -v
docker-compose up
\`\`\`
Wait for "model-pull" to complete before running \`make dev-pg\`.`,
        folder: "troubleshooting",
        tags: ["troubleshooting", "infra"],
        favorite: false,
      },
      {
        title: "Security Practices",
        summary:
          "Security guidelines — input validation, SQL injection prevention, auth patterns.",
        content: `# Security Practices

## Input Validation
- All inputs validated via Zod schemas in the service layer
- Routes parse HTTP; services enforce domain rules
- Never trust client-provided IDs for authorization

## SQL Injection
- Raw SQL only in repository layer
- Always use parameterized queries (\`?\` placeholders)
- Never interpolate user input into SQL strings

## Secrets Management
- No secrets in code or git
- Environment variables for all credentials
- \`.env\` files in .gitignore
- Reference secrets by name in docs, never by value

## Auth (when applicable)
- Short-lived JWTs (15 min)
- Refresh tokens stored httpOnly
- CORS restricted to known origins`,
        folder: "conventions",
        tags: ["security", "conventions"],
        favorite: false,
      },
      {
        title: "Performance Testing Baseline",
        summary:
          "Load testing results and targets — API response times, database query budgets.",
        content: `# Performance Baseline

## API Response Time Targets

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| GET /api/projects | 5ms | 15ms | 50ms |
| GET /api/tasks (filtered) | 10ms | 30ms | 80ms |
| POST /api/tasks (batch 10) | 20ms | 60ms | 150ms |
| GET /api/documents (paginated) | 8ms | 25ms | 70ms |
| Semantic search | 50ms | 150ms | 300ms |

## Database Query Budget
- Single entity fetch: <5ms
- List with filters: <20ms
- Batch insert (10 items): <30ms
- Vector similarity search: <100ms

## Memory
- Idle: <50MB RSS
- Under load (100 concurrent): <200MB RSS
- SQLite WAL checkpoint: every 1000 pages`,
        folder: "reference",
        tags: ["performance", "reference"],
        favorite: false,
      },
    ],
  },
);

const docMap = Object.fromEntries(documents.map((d) => [d.title, d.id]));

console.log(`  ✓ Created ${documents.length} documents`);

// ─── Projects ────────────────────────────────────────────────────────────────

console.log("Creating projects...");

const projects = await post<{ id: string; title: string }[]>("/api/projects", {
  items: [
    {
      title: "Platform API v2",
      summary:
        "Redesign the public API — batch semantics, consistent error shapes, OpenAPI spec generation.",
      context:
        "The v1 API grew organically over 18 months. Inconsistent naming, no batch support, three different error formats. External consumers are frustrated. Internal teams work around it with wrapper libraries. v2 is a clean-slate redesign with the constraint that v1 must keep running during migration.",
      requirements:
        "All endpoints use batch semantics ({items: [...]}). Error shape standardized. OpenAPI 3.1 spec auto-generated from route definitions. Backward-compatible v1 shim layer. Zero downtime migration path.",
      documents: {
        [docMap["API Design Guidelines"]]: [{ type: "reference" }],
        [docMap["TypeScript Conventions"]]: [{ type: "reference" }],
      },
    },
    {
      title: "Knowledge Base System",
      summary:
        "Document storage with tagging, folders, semantic search, and source connectors.",
      context:
        "Teams store knowledge in wikis, Google Docs, Notion, and Slack bookmarks. Nothing is searchable across tools. The KB system centralizes authored and imported content with vector search so context is always findable.",
      requirements:
        "CRUD for documents with markdown content. Polymorphic tagging. Folder organization. Semantic vector search via pgvector + Ollama. Source connectors for importing from GitHub, URLs. Refresh support for imported content.",
      documents: {
        [docMap["Embedding Pipeline Guide"]]: [{ type: "design" }],
        [docMap["SQLite vs Postgres Decision"]]: [{ type: "design" }],
      },
    },
    {
      title: "Frontend Redesign",
      summary:
        "Rebuild the SPA — new theme system, component library migration, accessibility pass.",
      context:
        "The frontend started as a prototype and never got a proper design system. Components are inconsistent, themes are hardcoded, and accessibility is an afterthought. This project migrates to @4lt7ab/ui, adds a real theme system, and makes a11y a first-class concern.",
      requirements:
        "Migrate all custom components to @4lt7ab/ui re-exports. Theme system with 4 themes (deepTeal, ember, nord, synth). Every interactive element meets WCAG 2.1 AA. Automated a11y test suite.",
      documents: {
        [docMap["Accessibility Checklist"]]: [{ type: "requirements" }],
      },
    },
  ],
});

const projMap = Object.fromEntries(projects.map((p) => [p.title, p.id]));

console.log(`  ✓ Created ${projects.length} projects`);

// ─── Tasks ───────────────────────────────────────────────────────────────────

console.log("Creating tasks...");

// --- Project 1: Platform API v2 ---
const apiTasks = await post<{ id: string; title: string }[]>("/api/tasks", {
  items: [
    {
      project_id: projMap["Platform API v2"],
      title: "Define batch request/response envelope",
      summary: "Standardize {items: [...]} input and {data: [], total} output.",
      context:
        "Every endpoint currently has its own shape. Some accept arrays, some accept objects, some accept both. The envelope must be consistent so clients can write generic batch helpers.",
      status: "done",
      effort: "low",
      impact: "high",
      category: "design",
      group_key: "api-design",
    },
    {
      project_id: projMap["Platform API v2"],
      title: "Standardize error response shape",
      summary:
        'Single error format: {error: string, details?: [{field, message}]}.',
      context:
        "v1 returns plain strings, {message}, and {error} depending on which dev wrote the route. Consumers can't reliably parse errors.",
      status: "done",
      effort: "medium",
      impact: "high",
      category: "design",
      group_key: "api-design",
    },
    {
      project_id: projMap["Platform API v2"],
      title: "Implement project endpoints (v2)",
      summary:
        "POST/PATCH /api/projects with batch semantics and document merge-patch.",
      context:
        "Projects are the simplest entity — good proving ground for the v2 pattern before tasks and documents.",
      acceptance_criteria:
        "- POST /api/projects accepts {items: [...]}\n- PATCH /api/projects accepts {items: [{id, ...}]}\n- Documents merge-patch works (add, replace types, remove)\n- Validation errors return standardized shape\n- Integration tests cover batch of 1, batch of N, validation failure",
      status: "done",
      effort: "medium",
      impact: "high",
      category: "feature",
      group_key: "api-endpoints",
    },
    {
      project_id: projMap["Platform API v2"],
      title: "Implement task endpoints (v2)",
      summary:
        "POST/PATCH/GET /api/tasks with filters, batch semantics, dependencies.",
      acceptance_criteria:
        "- Batch create/update with {items: [...]}\n- GET supports project_id, status, effort, impact, category, group_key filters\n- Dependencies via add_dependencies/remove_dependencies on PATCH\n- is_blocked as user-managed boolean",
      status: "in_progress",
      effort: "high",
      impact: "high",
      category: "feature",
      group_key: "api-endpoints",
    },
    {
      project_id: projMap["Platform API v2"],
      title: "Implement document endpoints (v2)",
      summary:
        "Full CRUD for documents — create, update, list (paginated), get, delete, import, refresh.",
      acceptance_criteria:
        "- Batch create/update/delete\n- List with pagination, tag/title/search/favorite/folder filters\n- Import from URL via source connectors\n- Refresh from original source\n- Semantic search endpoint (Postgres only)",
      status: "todo",
      effort: "high",
      impact: "high",
      category: "feature",
      group_key: "api-endpoints",
    },
    {
      project_id: projMap["Platform API v2"],
      title: "Build v1 → v2 shim layer",
      summary:
        "Middleware that translates v1 request/response shapes to v2 format.",
      context:
        "External consumers need at least 3 months of v1 support. The shim sits in front of v2 handlers and translates on the fly. No new v1 features — shim only covers existing behavior.",
      status: "todo",
      effort: "high",
      impact: "medium",
      category: "feature",
      group_key: "migration",
      is_blocked: true,
    },
    {
      project_id: projMap["Platform API v2"],
      title: "Generate OpenAPI 3.1 spec from route definitions",
      summary: "Auto-generate spec from Zod schemas and route metadata.",
      status: "todo",
      effort: "medium",
      impact: "medium",
      category: "docs",
      group_key: "api-design",
    },
    {
      project_id: projMap["Platform API v2"],
      title: "Write API migration guide for consumers",
      summary: "Document v1→v2 changes, breaking changes, and migration steps.",
      status: "todo",
      effort: "low",
      impact: "medium",
      category: "docs",
      group_key: "migration",
    },
  ],
});

// --- Project 2: Knowledge Base System ---
const kbTasks = await post<{ id: string; title: string }[]>("/api/tasks", {
  items: [
    {
      project_id: projMap["Knowledge Base System"],
      title: "Design document schema and migrations",
      summary:
        "Documents table with title, summary, content, folder, favorite, source fields.",
      status: "done",
      effort: "medium",
      impact: "high",
      category: "design",
      group_key: "core",
    },
    {
      project_id: projMap["Knowledge Base System"],
      title: "Implement polymorphic tagging system",
      summary:
        "Tags table + entity_tags join. 15 allowed tag values. findOrCreate semantics.",
      status: "done",
      effort: "medium",
      impact: "high",
      category: "feature",
      group_key: "core",
    },
    {
      project_id: projMap["Knowledge Base System"],
      title: "Build document CRUD service and repository",
      summary: "Create, read, update, delete with tag management and folder support.",
      status: "done",
      effort: "high",
      impact: "high",
      category: "feature",
      group_key: "core",
    },
    {
      project_id: projMap["Knowledge Base System"],
      title: "Implement source connector framework",
      summary:
        "Plugin interface for importing external content. Registry, import, refresh.",
      acceptance_criteria:
        "- SourceConnector interface (canHandle + fetch)\n- ConnectorRegistry with URL resolution\n- SourceService orchestrating import and refresh\n- GitHub connector as first implementation",
      status: "done",
      effort: "medium",
      impact: "medium",
      category: "feature",
      group_key: "connectors",
    },
    {
      project_id: projMap["Knowledge Base System"],
      title: "Build GitHub source connector",
      summary:
        "Fetch public files and READMEs from GitHub repos. Tree browsing API.",
      status: "done",
      effort: "medium",
      impact: "medium",
      category: "feature",
      group_key: "connectors",
    },
    {
      project_id: projMap["Knowledge Base System"],
      title: "Implement embedding pipeline",
      summary:
        "Async worker that generates vectors on entity create/update via Ollama.",
      context:
        "Embeddings are opt-in (EMBEDDINGS_ENABLED). Pipeline listens for domain events, builds embedding text (title 3×, summary, context), calls Ollama, stores vector.",
      status: "in_progress",
      effort: "high",
      impact: "high",
      category: "feature",
      group_key: "search",
    },
    {
      project_id: projMap["Knowledge Base System"],
      title: "Implement semantic vector search",
      summary:
        "GET /api/documents/search?q= with pgvector similarity + keyword boost.",
      acceptance_criteria:
        "- Returns documents ranked by hybrid similarity\n- Minimum similarity threshold: 0.4\n- Supports tag, folder, favorite, limit filters\n- Postgres-only (returns 501 on SQLite)",
      status: "in_progress",
      effort: "high",
      impact: "high",
      category: "feature",
      group_key: "search",
    },
    {
      project_id: projMap["Knowledge Base System"],
      title: "Add URL connector for generic web pages",
      summary:
        "Fetch and extract readable content from arbitrary URLs using readability.",
      status: "todo",
      effort: "medium",
      impact: "medium",
      category: "feature",
      group_key: "connectors",
    },
    {
      project_id: projMap["Knowledge Base System"],
      title: "Build document reference system",
      summary:
        "Polymorphic references linking documents to projects/tasks with typed relationships.",
      status: "done",
      effort: "medium",
      impact: "high",
      category: "feature",
      group_key: "core",
    },
  ],
});

// --- Project 3: Frontend Redesign ---
const feTasks = await post<{ id: string; title: string }[]>("/api/tasks", {
  items: [
    {
      project_id: projMap["Frontend Redesign"],
      title: "Set up @4lt7ab/ui ThemeProvider integration",
      summary:
        "Wire library ThemeProvider, define 4 custom themes, build compat layer.",
      status: "done",
      effort: "high",
      impact: "high",
      category: "infra",
      group_key: "theme",
    },
    {
      project_id: projMap["Frontend Redesign"],
      title: "Migrate atom components to library re-exports",
      summary:
        "Replace custom Button, Input, Select, Badge, Skeleton with @4lt7ab/ui.",
      status: "done",
      effort: "medium",
      impact: "medium",
      category: "refactor",
      group_key: "migration",
    },
    {
      project_id: projMap["Frontend Redesign"],
      title: "Build accessibility test suite",
      summary:
        "a11y-pass.test.ts — guards aria-labels, keyboard nav, semantic HTML, toggles.",
      acceptance_criteria:
        "- Tests for IconButton aria-label\n- Tests for keyboard navigation on tables and cards\n- Tests for aria-pressed on toggles\n- Tests for aria-expanded on collapsibles\n- Tests for semantic landmarks\n- Tests for skip-to-content link\n- Tests for toast aria-live region",
      status: "done",
      effort: "medium",
      impact: "high",
      category: "test",
      group_key: "a11y",
    },
    {
      project_id: projMap["Frontend Redesign"],
      title: "Redesign dashboard page",
      summary:
        "Mission control layout — project cards, recent activity, quick actions.",
      status: "in_progress",
      effort: "high",
      impact: "high",
      category: "feature",
      group_key: "pages",
    },
    {
      project_id: projMap["Frontend Redesign"],
      title: "Redesign knowledge base page",
      summary:
        "Library reader layout — folder nav, document grid, search, favorites.",
      status: "in_progress",
      effort: "high",
      impact: "high",
      category: "feature",
      group_key: "pages",
    },
    {
      project_id: projMap["Frontend Redesign"],
      title: "Implement synth theme glow effects",
      summary:
        "Animated canvas backgrounds and cycling CSS glow via glow token system.",
      context:
        "Synth theme is the showcase theme. Glow effects are driven by theme.glow.* tokens, not theme-name checks. Only SynthBackground checks themeName directly.",
      status: "todo",
      effort: "medium",
      impact: "low",
      category: "design",
      group_key: "theme",
    },
    {
      project_id: projMap["Frontend Redesign"],
      title: "Audit and fix color contrast ratios",
      summary: "Ensure all text meets WCAG 2.1 AA contrast ratios across all 4 themes.",
      status: "todo",
      effort: "medium",
      impact: "high",
      category: "design",
      group_key: "a11y",
    },
    {
      project_id: projMap["Frontend Redesign"],
      title: "Add keyboard shortcut system",
      summary:
        "Global keyboard shortcuts for navigation, search, and common actions.",
      status: "done",
      effort: "low",
      impact: "medium",
      category: "feature",
      group_key: "ux",
    },
  ],
});

console.log(
  `  ✓ Created ${apiTasks.length + kbTasks.length + feTasks.length} tasks across 3 projects`,
);

// ─── Task dependencies ───────────────────────────────────────────────────────

console.log("Adding task dependencies...");

// v2 shim layer is blocked by document endpoints
const shimTask = apiTasks.find(
  (t) => t.title === "Build v1 → v2 shim layer",
)!;
const docEndpointTask = apiTasks.find(
  (t) => t.title === "Implement document endpoints (v2)",
)!;
const taskEndpointTask = apiTasks.find(
  (t) => t.title === "Implement task endpoints (v2)",
)!;
const openApiTask = apiTasks.find(
  (t) => t.title === "Generate OpenAPI 3.1 spec from route definitions",
)!;
const migrationGuideTask = apiTasks.find(
  (t) => t.title === "Write API migration guide for consumers",
)!;

await patch("/api/tasks", {
  items: [
    {
      id: shimTask.id,
      add_dependencies: [
        { task_id: docEndpointTask.id, type: "blocks" },
        { task_id: taskEndpointTask.id, type: "blocks" },
      ],
    },
    {
      id: migrationGuideTask.id,
      add_dependencies: [
        { task_id: shimTask.id, type: "blocks" },
      ],
    },
    {
      id: openApiTask.id,
      add_dependencies: [
        { task_id: docEndpointTask.id, type: "relates_to" },
      ],
    },
  ],
});

// KB: semantic search relates to embedding pipeline
const embeddingTask = kbTasks.find(
  (t) => t.title === "Implement embedding pipeline",
)!;
const searchTask = kbTasks.find(
  (t) => t.title === "Implement semantic vector search",
)!;

await patch("/api/tasks", {
  items: [
    {
      id: searchTask.id,
      add_dependencies: [
        { task_id: embeddingTask.id, type: "blocks" },
      ],
    },
  ],
});

// FE: redesign pages relate to theme setup
const themeTask = feTasks.find(
  (t) => t.title === "Set up @4lt7ab/ui ThemeProvider integration",
)!;
const dashboardTask = feTasks.find(
  (t) => t.title === "Redesign dashboard page",
)!;
const kbPageTask = feTasks.find(
  (t) => t.title === "Redesign knowledge base page",
)!;
const contrastTask = feTasks.find(
  (t) => t.title === "Audit and fix color contrast ratios",
)!;

await patch("/api/tasks", {
  items: [
    {
      id: dashboardTask.id,
      add_dependencies: [
        { task_id: themeTask.id, type: "relates_to" },
      ],
    },
    {
      id: kbPageTask.id,
      add_dependencies: [
        { task_id: themeTask.id, type: "relates_to" },
      ],
    },
    {
      id: contrastTask.id,
      add_dependencies: [
        { task_id: themeTask.id, type: "blocks" },
      ],
    },
  ],
});

console.log("  ✓ Added dependencies");

// ─── Link documents to tasks ─────────────────────────────────────────────────

console.log("Linking documents to entities...");

const envelopeTask = apiTasks.find(
  (t) => t.title === "Define batch request/response envelope",
)!;
const errorTask = apiTasks.find(
  (t) => t.title === "Standardize error response shape",
)!;
const a11yTestTask = feTasks.find(
  (t) => t.title === "Build accessibility test suite",
)!;

await patch("/api/tasks", {
  items: [
    {
      id: envelopeTask.id,
      documents: {
        [docMap["API Design Guidelines"]]: [{ type: "reference" }],
      },
    },
    {
      id: errorTask.id,
      documents: {
        [docMap["API Design Guidelines"]]: [{ type: "reference" }],
      },
    },
    {
      id: a11yTestTask.id,
      documents: {
        [docMap["Accessibility Checklist"]]: [{ type: "requirements" }],
      },
    },
    {
      id: embeddingTask.id,
      documents: {
        [docMap["Embedding Pipeline Guide"]]: [{ type: "design" }],
      },
    },
  ],
});

console.log("  ✓ Linked documents to tasks");

// ─── Summary ─────────────────────────────────────────────────────────────────

const totalTasks = apiTasks.length + kbTasks.length + feTasks.length;

console.log(`
Done! Seeded:
  • ${documents.length} documents across 4 folders
  • ${projects.length} projects with document references
  • ${totalTasks} tasks (mixed statuses, dependencies, document links)
`);
