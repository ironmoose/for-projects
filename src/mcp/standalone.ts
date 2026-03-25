#!/usr/bin/env bun
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { bootstrap } from "../domain";
import { parseArgs, logListening, type ServerOptions } from "../domain/args";
import { createMcpHttpHandler } from "./server";

export class McpStandaloneServer {
  private options: ServerOptions;

  constructor(options?: Partial<ServerOptions>) {
    const defaults = parseArgs({ port: 3001, portEnv: "PM_MCP_PORT" });
    this.options = { ...defaults, ...options };
  }

  start(): void {
    const { port, host, dbPath } = this.options;
    const ctx = bootstrap(dbPath);

    const app = new Hono();
    app.use("*", secureHeaders());
    app.use(
      "*",
      cors({
        origin: (origin) =>
          origin?.startsWith("http://localhost") || origin?.startsWith("http://127.0.0.1")
            ? origin
            : null,
        allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "mcp-session-id", "Last-Event-ID", "mcp-protocol-version"],
        exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
      })
    );
    app.use("*", logger((str) => process.stderr.write(str + "\n")));
    const handleMcp = createMcpHttpHandler(ctx);
    app.all("/*", (c) => handleMcp(c.req.raw));

    logListening("tab-for-projects mcp (standalone)", host, port);

    Bun.serve({
      port,
      hostname: host,
      fetch: app.fetch,
    });
  }
}

// Direct execution
if (import.meta.main) {
  new McpStandaloneServer().start();
}
