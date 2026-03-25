#!/usr/bin/env bun
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { compress } from "hono/compress";
import { secureHeaders } from "hono/secure-headers";
import { etag } from "hono/etag";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { bootstrap, ServiceError } from "../domain";
import { parseArgs, logListening, type ServerOptions } from "../domain/args";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { projectRoutes } from "./routes/projects";
import { taskRoutes } from "./routes/tasks";
import { handleMcpHttp } from "../mcp/server";

export class Server {
  private options: ServerOptions;

  constructor(options?: Partial<ServerOptions>) {
    const defaults = parseArgs({ port: 3000, portEnv: "PM_PORT" });
    this.options = { ...defaults, ...options };
  }

  start(): void {
    const { port, host, dbPath } = this.options;
    const ctx = bootstrap(dbPath);

    const app = new Hono();

    // ── Global middleware ──────────────────────────────────
    app.use("*", secureHeaders());
    app.use("*", compress());
    app.use(
      "*",
      cors({
        origin: (origin) =>
          origin?.startsWith("http://localhost") || origin?.startsWith("http://127.0.0.1")
            ? origin
            : null,
        allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "mcp-session-id", "Last-Event-ID", "mcp-protocol-version"],
        exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
      })
    );

    // ── API (with logging) ────────────────────────────────
    app.use("/api/*", logger((str) => process.stderr.write(str + "\n")));
    app.route("/api/projects/:projectSlug/tasks", taskRoutes(ctx.taskService));
    app.route("/api/projects", projectRoutes(ctx.projectService));
    app.get("/api/health", (c) => c.json({ status: "ok" }));

    // ── MCP (no logging) ──────────────────────────────────
    app.all("/mcp", (c) => handleMcpHttp(ctx, c.req.raw));

    // ── Static web assets ─────────────────────────────────
    const dist = join(import.meta.dir, "../web/dist");
    const indexPath = join(dist, "index.html");
    const indexHtml = existsSync(indexPath)
      ? readFileSync(indexPath, "utf-8")
      : null;

    app.use(
      "/assets/*",
      etag(),
      async (c, next) => {
        await next();
        c.header("Cache-Control", "public, max-age=31536000, immutable");
      }
    );
    app.use("/*", etag());
    app.use("/*", serveStatic({ root: dist }));

    // SPA fallback
    app.get("/*", (c) => {
      if (indexHtml) return c.html(indexHtml);
      return c.text("Not found — run `bun run build` first", 404);
    });

    // ── Error handling ────────────────────────────────────
    app.onError((err, c) => {
      if (err instanceof SyntaxError) return c.json({ error: "invalid JSON body" }, 400);
      if (err instanceof ServiceError) return c.json({ error: err.message }, err.statusCode as ContentfulStatusCode);
      console.error(err);
      return c.json({ error: "internal server error" }, 500);
    });

    logListening("tab-for-projects", host, port);

    Bun.serve({
      port,
      hostname: host,
      fetch: app.fetch,
    });
  }
}

// Direct execution
if (import.meta.main) {
  new Server().start();
}
