import { Hono } from "hono";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";
import { actionRoutes } from "../server/routes/actions";
import { projectRoutes } from "../server/routes/projects";
import { taskRoutes } from "../server/routes/tasks";
import type { ContentfulStatusCode } from "hono/utils/http-status";

let ctx: AppContext;
let tempDir: string;
let app: Hono;

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "route-test-"));
  ctx = await bootstrap(join(tempDir, "test.db"));

  app = new Hono();
  app.route("/actions", actionRoutes(ctx.actionService));
  app.route("/projects", projectRoutes(ctx.projectService));
  app.route("/projects", taskRoutes(ctx.taskService));
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
  it("POST /actions — creates action", async () => {
    const res = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test action" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.prompt).toBe("test action");
    expect(body.status).toBe("todo");
    expect(body.output).toBeNull();
  });

  it("POST /actions — with agent", async () => {
    const res = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "research", agent: "research" }),
    });
    expect(res.status).toBe(201);
    expect((await res.json()).agent).toBe("research");
  });

  it("POST /actions — no prompt returns 400", async () => {
    const res = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /actions — invalid agent returns 400", async () => {
    const res = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "x", agent: "invalid" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /actions — lists actions", async () => {
    const res = await req("/actions");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(typeof body.total).toBe("number");
  });

  it("GET /actions?status=todo — filters", async () => {
    const res = await req("/actions?status=todo");
    expect(res.status).toBe(200);
  });

  it("GET /actions/:id — returns action", async () => {
    const create = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "find me" }),
    });
    const action = await create.json();
    const res = await req(`/actions/${action.id}`);
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(action.id);
  });

  it("GET /actions/:id — 404 for missing", async () => {
    const res = await req("/actions/nonexistent");
    expect(res.status).toBe(404);
  });

  it("PATCH /actions/:id — updates output", async () => {
    const create = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "update me" }),
    });
    const action = await create.json();
    const res = await req(`/actions/${action.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ output: "result" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).output).toBe("result");
  });

  it("PATCH /actions/:id/status — valid transition", async () => {
    const create = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "status test" }),
    });
    const action = await create.json();
    const res = await req(`/actions/${action.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("in_progress");
  });

  it("PATCH /actions/:id/status — invalid transition returns 400", async () => {
    const create = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "bad transition" }),
    });
    const action = await create.json();
    const res = await req(`/actions/${action.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "complete" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("Project Routes with action_ids", () => {
  it("POST /projects with goal_action_id", async () => {
    const action = ctx.actionService.create({ prompt: "Goal" });
    const res = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "With Goal", goal_action_id: action.id }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.goal_action_id).toBe(action.id);
  });

  it("GET /projects/:id includes action_id fields", async () => {
    const action = ctx.actionService.create({ prompt: "Check fields" });
    const create = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Check", design_action_id: action.id }),
    });
    const project = await create.json();
    const res = await req(`/projects/${project.id}`);
    const body = await res.json();
    expect(body).toHaveProperty("goal_action_id");
    expect(body).toHaveProperty("design_action_id");
    expect(body).toHaveProperty("requirements_action_id");
    expect(body.design_action_id).toBe(action.id);
  });

  it("PATCH /projects/:id sets action_id", async () => {
    const create = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Patch Test" }),
    });
    const project = await create.json();
    const action = ctx.actionService.create({ prompt: "Requirements" });
    const res = await req(`/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirements_action_id: action.id }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).requirements_action_id).toBe(action.id);
  });
});

describe("Task Routes with action_ids", () => {
  let projectId: string;

  beforeAll(async () => {
    const p = ctx.projectService.create({ name: "Task Route Project" });
    projectId = p.id;
  });

  it("POST creates task with implementation_action_id", async () => {
    const action = ctx.actionService.create({ prompt: "Implement" });
    const res = await req(`/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: "With action", implementation_action_id: action.id }),
    });
    expect(res.status).toBe(201);
    expect((await res.json()).implementation_action_id).toBe(action.id);
  });

  it("PATCH sets validation_action_id", async () => {
    const create = await req(`/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: "Patch task" }),
    });
    const task = await create.json();
    const action = ctx.actionService.create({ prompt: "Validate" });
    const res = await req(`/projects/${projectId}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validation_action_id: action.id }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).validation_action_id).toBe(action.id);
  });

  it("GET includes action_id fields", async () => {
    const create = await req(`/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: "Check fields" }),
    });
    const task = await create.json();
    const res = await req(`/projects/${projectId}/tasks/${task.id}`);
    const body = await res.json();
    expect(body).toHaveProperty("implementation_action_id");
    expect(body).toHaveProperty("validation_action_id");
  });
});
