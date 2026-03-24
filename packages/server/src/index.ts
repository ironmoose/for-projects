#!/usr/bin/env bun
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { networkInterfaces } from "os";
import { bootstrap, ServiceError } from "@alt-t4b/pm-domain";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { projectRoutes } from "./routes/projects";
import { taskRoutes } from "./routes/tasks";

// Parse CLI flags (--port, --host, --sqlite-path)
function parseArgs(): {
  port: number;
  host: string;
  dbPath?: string;
} {
  const args = process.argv.slice(2);
  let port = Number(process.env.PM_PORT) || 3000;
  let host = process.env.PM_HOST ?? "127.0.0.1";
  let dbPath: string | undefined = process.env.SQLITE_PATH;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) port = Number(args[++i]);
    if (args[i] === "--host" && args[i + 1]) host = args[++i];
    if (args[i] === "--sqlite-path" && args[i + 1]) dbPath = args[++i];
  }

  return { port, host, dbPath };
}

// Bootstrap
const { port, host, dbPath } = parseArgs();
const ctx = bootstrap(dbPath);

// Web application
const app = new Hono();
app.use(
  "*",
  cors({
    origin: (origin) =>
      origin?.startsWith("http://localhost") || origin?.startsWith("http://127.0.0.1")
        ? origin
        : null,
    allowMethods: ["GET", "POST", "PATCH", "DELETE"],
  })
);
app.use("*", logger((str) => process.stderr.write(str + "\n")));
app.route("/api/projects/:projectSlug/tasks", taskRoutes(ctx.taskService));
app.route("/api/projects", projectRoutes(ctx.projectService));
app.get("/api/health", (c) => c.json({ status: "ok" }));

app.onError((err, c) => {
  if (err instanceof SyntaxError) return c.json({ error: "invalid JSON body" }, 400);
  if (err instanceof ServiceError) return c.json({ error: err.message }, err.statusCode as ContentfulStatusCode);
  console.error(err);
  return c.json({ error: "internal server error" }, 500);
});

function getNetworkAddress(): string | undefined {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
}

const displayHost = host === "0.0.0.0" ? "localhost" : host;
console.error(`tab-pm listening on http://${displayHost}:${port}`);
if (host === "0.0.0.0") {
  const networkAddr = getNetworkAddress();
  if (networkAddr) {
    console.error(`tab-pm network: http://${networkAddr}:${port}`);
  }
}

Bun.serve({
  port,
  hostname: host,
  fetch: app.fetch,
});
