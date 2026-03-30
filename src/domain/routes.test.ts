import { Hono } from "hono";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";
import { agentRoutes } from "../server/routes/agents";
import { projectRoutes } from "../server/routes/projects";
import { taskRoutes } from "../server/routes/tasks";
import { runRoutes } from "../server/routes/runs";
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
  app.route("/agents", agentRoutes(ctx.agentService));
  app.route("/runs", runRoutes(ctx.runService));
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
// Agent Routes
// ---------------------------------------------------------------------------

describe("Agent Routes", () => {
  it("POST /agents creates agent (201)", async () => {
    const res = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        identifier: "plan",
        prompt: "test agent",
        agent: "tab:orchestrator",
      }]),
    });
    expect(res.status).toBe(201);
    const [body] = await res.json();
    expect(body.identifier).toBe("plan");
    expect(body.prompt).toBe("test agent");
    expect(body.agent).toBe("tab:orchestrator");
    expect(body.enabled).toBe(1);
  });

  it("POST /agents — invalid agent returns 400", async () => {
    const res = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ identifier: "bad-agent", prompt: "x", agent: "invalid" }]),
    });
    expect(res.status).toBe(400);
  });

  it("POST /agents — missing prompt returns 400", async () => {
    const res = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ identifier: "no-prompt", prompt: "", agent: "tab:orchestrator" }]),
    });
    expect(res.status).toBe(400);
  });

  it("GET /agents lists agents", async () => {
    const res = await req("/agents");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(typeof body.total).toBe("number");
  });

  it("GET /agents/:id returns agent", async () => {
    const create = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ identifier: "find-me", prompt: "find me", agent: "tab:executor" }]),
    });
    const [agent] = await create.json();
    const res = await req(`/agents/${agent.id}`);
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(agent.id);
  });

  it("GET /agents/:id — 404 for missing", async () => {
    const res = await req("/agents/nonexistent");
    expect(res.status).toBe(404);
  });

  it("PATCH /agents updates prompt", async () => {
    const create = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ identifier: "update-prompt", prompt: "update me", agent: "tab:orchestrator" }]),
    });
    const [agent] = await create.json();
    const res = await req("/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: agent.id, prompt: "updated" }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.prompt).toBe("updated");
  });

  it("PATCH /agents updates identifier", async () => {
    const create = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ identifier: "rename-route", prompt: "test", agent: "tab:orchestrator" }]),
    });
    const [agent] = await create.json();
    const res = await req("/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: agent.id, identifier: "renamed-route" }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.identifier).toBe("renamed-route");
  });

  it("PATCH /agents updates enabled", async () => {
    const create = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ identifier: "disable-route", prompt: "test", agent: "tab:executor" }]),
    });
    const [agent] = await create.json();
    const res = await req("/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: agent.id, enabled: 0 }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.enabled).toBe(0);
  });

  it("DELETE /agents removes agents (204)", async () => {
    const create = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ identifier: "delete-me", prompt: "bye", agent: "tab:orchestrator" }]),
    });
    const [agent] = await create.json();
    const res = await req("/agents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [agent.id] }),
    });
    expect(res.status).toBe(204);

    const check = await req(`/agents/${agent.id}`);
    expect(check.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Run Routes
// ---------------------------------------------------------------------------

describe("Run Routes", () => {
  let projectId: string;

  beforeAll(async () => {
    const [p] = ctx.projectService.create([{ title: "Run Route Project" }]);
    projectId = p.id;
  });

  it("POST /runs creates run (201)", async () => {
    const res = await req("/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        agent: "plan",
        entity_type: "project",
        entity_id: projectId,
      }]),
    });
    expect(res.status).toBe(201);
    const [body] = await res.json();
    expect(body.agent).toBe("plan");
    expect(body.entity_type).toBe("project");
    expect(body.status).toBe("running");
    expect(body.output).toBeNull();
  });

  it("GET /runs lists runs", async () => {
    const res = await req("/runs");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /runs/:id returns run", async () => {
    const create = await req("/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        agent: "goal",
        entity_type: "project",
        entity_id: projectId,
      }]),
    });
    const [entry] = await create.json();
    const res = await req(`/runs/${entry.id}`);
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(entry.id);
  });

  it("PATCH /runs updates status and output", async () => {
    const create = await req("/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        agent: "plan",
        entity_type: "project",
        entity_id: projectId,
      }]),
    });
    const [entry] = await create.json();
    const res = await req("/runs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        id: entry.id,
        status: "done",
        output: "Result",
      }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.status).toBe("done");
    expect(body.output).toBe("Result");
  });

  it("GET /runs filters by entity_type", async () => {
    const res = await req("/runs?entity_type=project");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((e: { entity_type: string }) => e.entity_type === "project")).toBe(true);
  });

  it("GET /runs filters by agent", async () => {
    const res = await req("/runs?agent=plan");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((e: { agent: string }) => e.agent === "plan")).toBe(true);
  });

  it("GET /runs/stats returns daily and summary stats", async () => {
    const res = await req("/runs/stats");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.daily).toBeArray();
    expect(body.summary).toBeDefined();
    expect(typeof body.summary.total).toBe("number");
  });
});
