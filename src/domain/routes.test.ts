import { Hono } from "hono";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";
import { actionRoutes } from "../server/routes/actions";
import type { ContentfulStatusCode } from "hono/utils/http-status";

let ctx: AppContext;
let tempDir: string;
let app: Hono;

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "route-test-"));
  ctx = await bootstrap(join(tempDir, "test.db"));

  // Wrap sub-app in a parent with the same error handling as the real server
  app = new Hono();
  app.route("/", actionRoutes(ctx.actionService));
  app.onError((err, c) => {
    if (err instanceof SyntaxError) return c.json({ error: "invalid JSON body" }, 400);
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.statusCode as ContentfulStatusCode);
    return c.json({ error: "internal server error" }, 500);
  });
});

afterAll(() => {
  ctx.db.close();
  rmSync(tempDir, { recursive: true, force: true });
});

// Helper to make requests
function req(path: string, options?: RequestInit) {
  return app.fetch(new Request(`http://localhost${path}`, options));
}

describe("Action Routes", () => {
  it("GET /dashboard returns dashboard shape", async () => {
    const res = await req("/dashboard");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("executable");
    expect(body).toHaveProperty("inProgress");
    expect(body).toHaveProperty("recentlyTerminal");
  });

  it("PATCH /:id/status returns 400 for invalid status", async () => {
    const project = ctx.projectService.create({ name: "Route Test" });
    const actions = ctx.actionService.createMany(`tab:project:${project.id}`, [
      { rank: 0, prompt: "test" },
    ]);
    const res = await req(`/${actions[0].id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "banana" }),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /:id/status returns 400 for invalid transition", async () => {
    const project = ctx.projectService.create({ name: "Route Test 2" });
    const actions = ctx.actionService.createMany(`tab:project:${project.id}`, [
      { rank: 0, prompt: "test" },
    ]);
    const res = await req(`/${actions[0].id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "complete" }),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /:id/status returns 200 for valid transition", async () => {
    const project = ctx.projectService.create({ name: "Route Test 3" });
    const actions = ctx.actionService.createMany(`tab:project:${project.id}`, [
      { rank: 0, prompt: "test" },
    ]);
    const res = await req(`/${actions[0].id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("in_progress");
  });

  it("GET /:target/plan returns tier structure", async () => {
    const project = ctx.projectService.create({ name: "Plan Route Test" });
    const target = `tab:project:${project.id}`;
    ctx.actionService.createMany(target, [
      { rank: 0, prompt: "t0" },
      { rank: 1, prompt: "t1" },
    ]);
    const res = await req(`/${encodeURIComponent(target)}/plan`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBe(2);
    expect(body.data[0].rank).toBe(0);
  });

  it("GET /?target=... returns 400 without target", async () => {
    const res = await req("/");
    expect(res.status).toBe(400);
  });

  it("GET /?target=...&status=todo filters by status", async () => {
    const project = ctx.projectService.create({ name: "Filter Route Test" });
    const target = `tab:project:${project.id}`;
    const actions = ctx.actionService.createMany(target, [
      { rank: 0, prompt: "a1" },
      { rank: 0, prompt: "a2" },
    ]);
    ctx.actionService.updateStatus(actions[0].id, "in_progress");

    const res = await req(`/?target=${encodeURIComponent(target)}&status=todo`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
  });
});
