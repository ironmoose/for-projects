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
import { entityActionRoutes } from "../server/routes/entity-actions";
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
  app.route("/entity-actions", entityActionRoutes(ctx.entityActionService));
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
      body: JSON.stringify({ name: "Test", prompt: "test action" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.prompt).toBe("test action");
  });

  it("POST /actions — with agent", async () => {
    const res = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Research", prompt: "research", agent: "research" }),
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
      body: JSON.stringify({ name: "X", prompt: "x", agent: "invalid" }),
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

  it("GET /actions/:id — returns action", async () => {
    const create = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Find", prompt: "find me" }),
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

  it("PATCH /actions/:id — updates prompt", async () => {
    const create = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Update", prompt: "update me" }),
    });
    const action = await create.json();
    const res = await req(`/actions/${action.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "updated" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).prompt).toBe("updated");
  });
});

describe("Project Routes", () => {
  it("POST /projects creates project", async () => {
    const res = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Route Project" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Route Project");
    expect(body.status).toBe("active");
  });

  it("GET /projects/:id returns project", async () => {
    const create = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Get Project" }),
    });
    const project = await create.json();
    const res = await req(`/projects/${project.id}`);
    const body = await res.json();
    expect(body.id).toBe(project.id);
    expect(body.name).toBe("Get Project");
  });

  it("PATCH /projects/:id updates fields", async () => {
    const create = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Patch Project" }),
    });
    const project = await create.json();
    const res = await req(`/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Patched", status: "archived" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Patched");
    expect(body.status).toBe("archived");
  });
});

describe("Task Routes", () => {
  let projectId: string;

  beforeAll(async () => {
    const p = ctx.projectService.create({ name: "Task Route Project" });
    projectId = p.id;
  });

  it("POST creates task", async () => {
    const res = await req(`/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: "Route Task" }),
    });
    expect(res.status).toBe(201);
    expect((await res.json()).summary).toBe("Route Task");
  });

  it("GET lists tasks by project", async () => {
    const res = await req(`/projects/${projectId}/tasks`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
  });

  it("PATCH updates task", async () => {
    const create = await req(`/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: "Patch task" }),
    });
    const task = await create.json();
    const res = await req(`/projects/${projectId}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: "Patched", status: "in_progress" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toBe("Patched");
    expect(body.status).toBe("in_progress");
  });
});

describe("Entity-Action Routes", () => {
  let projectId: string;
  let actionId: string;

  beforeAll(async () => {
    const pRes = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "EA Route Project" }),
    });
    projectId = (await pRes.json()).id;

    const aRes = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "EA", prompt: "EA route action" }),
    });
    actionId = (await aRes.json()).id;
  });

  it("POST /entity-actions creates link (201)", async () => {
    // Canned actions auto-create "goal" link; unlink it first so we can re-link
    await req(`/entity-actions/project/${projectId}/goal`, { method: "DELETE" });

    const res = await req("/entity-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: "project",
        entity_id: projectId,
        role: "goal",
        action_id: actionId,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.entity_type).toBe("project");
    expect(body.entity_id).toBe(projectId);
    expect(body.role).toBe("goal");
    expect(body.action_id).toBe(actionId);
    expect(body.status).toBe("todo");
    expect(body.output).toBeNull();
  });

  it("POST /entity-actions duplicate role returns 409", async () => {
    const res = await req("/entity-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: "project",
        entity_id: projectId,
        role: "goal",
        action_id: actionId,
      }),
    });
    expect(res.status).toBe(409);
  });

  it("POST /entity-actions invalid role for entity type returns 400", async () => {
    const res = await req("/entity-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: "project",
        entity_id: projectId,
        role: "implementation",
        action_id: actionId,
      }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /entity-actions/project/:id returns list", async () => {
    const res = await req(`/entity-actions/project/${projectId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeArray();
    expect(body.length).toBeGreaterThanOrEqual(3);
    const roles = body.map((ea: { role: string }) => ea.role).sort();
    expect(roles).toContain("goal");
    expect(roles).toContain("design");
    expect(roles).toContain("requirements");
  });

  it("GET /entity-actions/project/:id/:role returns single", async () => {
    const res = await req(`/entity-actions/project/${projectId}/goal`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("goal");
    expect(body.action_id).toBe(actionId);
  });

  it("PATCH .../goal/status transitions status", async () => {
    const res = await req(`/entity-actions/project/${projectId}/goal/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("in_progress");
  });

  it("PATCH .../goal updates output", async () => {
    const res = await req(`/entity-actions/project/${projectId}/goal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ output: "Some output text" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.output).toBe("Some output text");
  });

  it("DELETE .../goal returns 204", async () => {
    const res = await req(`/entity-actions/project/${projectId}/goal`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);

    // Verify it's gone
    const check = await req(`/entity-actions/project/${projectId}/goal`);
    expect(check.status).toBe(404);
  });
});
