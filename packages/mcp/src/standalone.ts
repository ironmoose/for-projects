#!/usr/bin/env bun
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bootstrap } from "@alttab/pm-domain";
import { handleMcpHttp } from "./server";
import { networkInterfaces } from "os";

function parseArgs(): {
  port: number;
  host: string;
  dbPath?: string;
} {
  const args = process.argv.slice(2);
  let port = Number(process.env.PM_MCP_PORT) || 3001;
  let host = process.env.PM_HOST ?? "127.0.0.1";
  let dbPath: string | undefined = process.env.SQLITE_PATH;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) port = Number(args[++i]);
    if (args[i] === "--host" && args[i + 1]) host = args[++i];
    if (args[i] === "--sqlite-path" && args[i + 1]) dbPath = args[++i];
  }

  return { port, host, dbPath };
}

const { port, host, dbPath } = parseArgs();
const ctx = bootstrap(dbPath);

const app = new Hono();
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
app.all("/*", (c) => handleMcpHttp(ctx, c.req.raw));

function getNetworkAddress(): string | undefined {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
}

const displayHost = host === "0.0.0.0" ? "localhost" : host;
console.error(`tab-pm mcp listening on http://${displayHost}:${port}`);
if (host === "0.0.0.0") {
  const networkAddr = getNetworkAddress();
  if (networkAddr) {
    console.error(`tab-pm mcp network: http://${networkAddr}:${port}`);
  }
}

export default {
  port,
  hostname: host,
  fetch: app.fetch,
};
