# tab-for-projects

Self-contained project management tool. TypeScript, Bun, Hono, React, SQLite.

## Tracker

When using the `tab-for-projects` MCP tools to manage tasks for this project, use project slug: `tab-projects`

## Quick reference

- `bun run dev` — start dev server (hot reload) + Vite HMR
- `bun run build` — build frontend assets
- `bun run start` — start production server
- `bun test` — run tests

## Conventions

- TypeScript strict mode, no `any`
- IDs are ULIDs, generated server-side
- Timestamps are ISO 8601 UTC strings
- SQL lives in repositories only — never in routes or services
- No ORMs — raw SQL via `bun:sqlite`
- Validation happens in services; routes parse HTTP and return errors
- Dependencies wired explicitly in `bootstrap.ts` — no globals or service locators

## Architecture

```
Route handler → Service → Repository → SQLite
```

Single process, single port (default 3000):
- `/api/*` — REST API
- `/mcp` — MCP endpoint
- `/*` — static web assets + SPA fallback
