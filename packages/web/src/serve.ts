#!/usr/bin/env bun
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { compress } from "hono/compress";
import { secureHeaders } from "hono/secure-headers";
import { etag } from "hono/etag";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

const port = Number(process.env.PM_WEB_PORT) || 3002;
const host = process.env.PM_HOST ?? "127.0.0.1";
const apiPort = Number(process.env.PM_PORT) || 3000;
const apiOrigin = `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${apiPort}`;
const dist = join(import.meta.dir, "../dist");

const indexPath = join(dist, "index.html");
const indexHtml = existsSync(indexPath)
  ? readFileSync(indexPath, "utf-8")
  : null;

const app = new Hono();

app.use("*", secureHeaders());
app.use("*", compress());

// Hashed assets get long-lived cache
app.use(
  "/assets/*",
  etag(),
  async (c, next) => {
    await next();
    c.header("Cache-Control", "public, max-age=31536000, immutable");
  }
);

// Non-hashed files get short cache with revalidation
app.use("/*", etag());

app.use("/*", serveStatic({ root: dist }));

// Proxy /api requests to the API server
app.all("/api/*", async (c) => {
  const url = new URL(c.req.url);
  const target = `${apiOrigin}${url.pathname}${url.search}`;
  const res = await fetch(target, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body,
  });
  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
});

// SPA fallback
app.get("/*", (c) => {
  if (indexHtml) {
    return c.html(indexHtml);
  }
  return c.text("Not found — run `bun run build` first", 404);
});

const displayHost = host === "0.0.0.0" ? "localhost" : host;
console.error(`tab-pm web listening on http://${displayHost}:${port}`);

export default {
  port,
  hostname: host,
  fetch: app.fetch,
};
