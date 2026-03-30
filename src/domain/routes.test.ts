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
import { actionLogRoutes } from "../server/routes/action-log";
import type { ContentfulStatusCode } from "hono/utils/http-status";

let ctx: AppContext;
let tempDir: string;
let app: Hono;

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "route-test-"));
  ctx = await bootstrap(join(tempDir, "test.db"));

  app = new Hono();
  app.route("/projects", projectRoutes(ctx.projectService));
  app.route("/tasks", taskRoutes(ctx.taskService));
  app.route("/actions", actionRoutes(ctx.actionService));
  app.route("/action-log", actionLogRoutes(ctx.actionLogService));
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

function req(path: string, options?: RequestInit) {
  return app.fetch(new Request(`http://localhost${path}`, options));
}

// ---------------------------------------------------------------------------
// Project Routes
// ---------------------------------------------------------------------------

describe("Project Routes", () => {
  it("POST /projects creates project", async () => {
    const res = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ title: "Route Project" }]),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toBeArray();
    expect(body[0].title).toBe("Route Project");
  });

  it("GET /projects/:id returns project", async () => {
    const create = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ title: "Get Project" }]),
    });
    const [project] = await create.json();
    const res = await req(`/projects/${project.id}`);
    const body = await res.json();
    expect(body.id).toBe(project.id);
    expect(body.title).toBe("Get Project");
  });

  it("PATCH /projects updates fields", async () => {
    const create = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ title: "Patch Project" }]),
    });
    const [project] = await create.json();
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: project.id, title: "Patched", goal: "New goal" }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.title).toBe("Patched");
    expect(body.goal).toBe("New goal");
  });

  it("GET /projects lists projects", async () => {
    const res = await req("/projects");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(typeof body.total).toBe("number");
  });

  it("DELETE /projects deletes projects", async () => {
    const create = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ title: "Delete Me" }]),
    });
    const [project] = await create.json();
    const res = await req("/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [project.id] }),
    });
    expect(res.status).toBe(204);

    const check = await req(`/projects/${project.id}`);
    expect(check.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Task Routes
// ---------------------------------------------------------------------------

describe("Task Routes", () => {
  let projectId: string;

  beforeAll(async () => {
    const [p] = ctx.projectService.create([{ title: "Task Route Project" }]);
    projectId = p.id;
  });

  it("POST /tasks creates task", async () => {
    const res = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ project_id: projectId, title: "Route Task" }]),
    });
    expect(res.status).toBe(201);
    const [body] = await res.json();
    expect(body.title).toBe("Route Task");
    expect(body.project_id).toBe(projectId);
  });

  it("GET /tasks lists tasks by project", async () => {
    const res = await req(`/tasks?project_id=${projectId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
  });

  it("PATCH /tasks updates task", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ project_id: projectId, title: "Patch task" }]),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: task.id, title: "Patched", plan: "New plan" }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.title).toBe("Patched");
    expect(body.plan).toBe("New plan");
  });

  it("GET /tasks/:id returns task", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ project_id: projectId, title: "Get Task" }]),
    });
    const [task] = await create.json();
    const res = await req(`/tasks/${task.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(task.id);
  });
});

// ---------------------------------------------------------------------------
// Action Routes
// ---------------------------------------------------------------------------

describe("Action Routes", () => {
  it("POST /actions creates action", async () => {
    const res = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        kind: "plan",
        prompt: "test action",
        agent: "tab:orchestrator",
      }]),
    });
    expect(res.status).toBe(201);
    const [body] = await res.json();
    expect(body.kind).toBe("plan");
    expect(body.prompt).toBe("test action");
    expect(body.agent).toBe("tab:orchestrator");
  });

  it("POST /actions — invalid agent returns 400", async () => {
    const res = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ kind: "goal", prompt: "x", agent: "invalid" }]),
    });
    expect(res.status).toBe(400);
  });

  it("POST /actions — missing prompt returns 400", async () => {
    const res = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ kind: "goal", prompt: "", agent: "tab:orchestrator" }]),
    });
    expect(res.status).toBe(400);
  });

  it("GET /actions lists actions", async () => {
    const res = await req("/actions");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(typeof body.total).toBe("number");
  });

  it("GET /actions/:id returns action", async () => {
    const create = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ kind: "goal", prompt: "find me", agent: "tab:executor" }]),
    });
    const [action] = await create.json();
    const res = await req(`/actions/${action.id}`);
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(action.id);
  });

  it("GET /actions/:id — 404 for missing", async () => {
    const res = await req("/actions/nonexistent");
    expect(res.status).toBe(404);
  });

  it("PATCH /actions updates prompt", async () => {
    const create = await req("/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ kind: "design", prompt: "update me", agent: "tab:orchestrator" }]),
    });
    const [action] = await create.json();
    const res = await req("/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: action.id, prompt: "updated" }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.prompt).toBe("updated");
  });
});

// ---------------------------------------------------------------------------
// Action Log Routes
// ---------------------------------------------------------------------------

describe("Action Log Routes", () => {
  let actionId: string;
  let projectId: string;

  beforeAll(async () => {
    const [p] = ctx.projectService.create([{ title: "Log Route Project" }]);
    projectId = p.id;

    const [a] = ctx.actionService.create([{
      kind: "requirements",
      prompt: "log route action",
      agent: "tab:orchestrator",
    }]);
    actionId = a.id;
  });

  it("POST /action-log creates entry", async () => {
    const res = await req("/action-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        action_id: actionId,
        entity_type: "project",
        entity_id: projectId,
      }]),
    });
    expect(res.status).toBe(201);
    const [body] = await res.json();
    expect(body.action_id).toBe(actionId);
    expect(body.entity_type).toBe("project");
    expect(body.status).toBe("running");
    expect(body.output).toBeNull();
  });

  it("GET /action-log lists entries", async () => {
    const res = await req("/action-log");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /action-log/:id returns entry", async () => {
    const create = await req("/action-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        action_id: actionId,
        entity_type: "project",
        entity_id: projectId,
      }]),
    });
    const [entry] = await create.json();
    const res = await req(`/action-log/${entry.id}`);
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(entry.id);
  });

  it("PATCH /action-log updates status and output", async () => {
    const create = await req("/action-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        action_id: actionId,
        entity_type: "project",
        entity_id: projectId,
      }]),
    });
    const [entry] = await create.json();
    const now = new Date().toISOString();
    const res = await req("/action-log", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        id: entry.id,
        status: "done",
        output: "Result",
        finished_at: now,
      }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.status).toBe("done");
    expect(body.output).toBe("Result");
  });

  it("GET /action-log filters by entity_type", async () => {
    const res = await req("/action-log?entity_type=project");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((e: { entity_type: string }) => e.entity_type === "project")).toBe(true);
  });
});
