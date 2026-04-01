import { Hono } from "hono";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";
import { projectRoutes } from "../server/routes/projects";
import { taskRoutes } from "../server/routes/tasks";
import { agentRoutes } from "../server/routes/agents";
import { jobRoutes } from "../server/routes/jobs";
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
  app.route("/jobs", jobRoutes(ctx.jobService));
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

  it("GET /projects/:id returns full project entity", async () => {
    const create = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ title: "Get Project", goal: "A goal", requirements: "Reqs", design: "Design" }]),
    });
    const [project] = await create.json();
    const res = await req(`/projects/${project.id}`);
    const body = await res.json();
    expect(body.id).toBe(project.id);
    expect(body.title).toBe("Get Project");
    expect(body.goal).toBe("A goal");
    expect(body.requirements).toBe("Reqs");
    expect(body.design).toBe("Design");
    expect(body.created_at).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
  });

  it("GET /projects/:id returns 404 for nonexistent id", async () => {
    const res = await req("/projects/00000000000000000000000000");
    expect(res.status).toBe(404);
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

  it("GET /projects lists projects with summary fields", async () => {
    const res = await req("/projects");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(typeof body.total).toBe("number");
    expect(body.data.length).toBeGreaterThan(0);
    const summary = body.data[0];
    expect(summary.id).toBeTruthy();
    expect(summary.title).toBeTruthy();
    expect(summary.created_at).toBeTruthy();
    expect(summary.updated_at).toBeTruthy();
    // Summary must not include full-entity fields
    expect(summary.goal).toBeUndefined();
    expect(summary.requirements).toBeUndefined();
    expect(summary.design).toBeUndefined();
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

  it("GET /tasks lists tasks with summary fields", async () => {
    // Ensure at least one task with full fields exists
    await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ project_id: projectId, title: "Summary Check", plan: "P", description: "D", implementation: "I", acceptance_criteria: "AC" }]),
    });
    const res = await req(`/tasks?project_id=${projectId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
    const summary = body.data[0];
    expect(summary.id).toBeTruthy();
    expect(summary.project_id).toBe(projectId);
    expect(summary.title).toBeTruthy();
    expect(summary.status).toBeTruthy();
    expect(summary.created_at).toBeTruthy();
    expect(summary.updated_at).toBeTruthy();
    // Summary must not include full-entity fields
    expect(summary.plan).toBeUndefined();
    expect(summary.description).toBeUndefined();
    expect(summary.implementation).toBeUndefined();
    expect(summary.acceptance_criteria).toBeUndefined();
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

  it("POST /tasks creates task with new fields", async () => {
    const res = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        project_id: projectId,
        title: "New Fields Task",
        description: "A description",
        implementation: "Some impl",
        acceptance_criteria: "It passes",
      }]),
    });
    expect(res.status).toBe(201);
    const [body] = await res.json();
    expect(body.description).toBe("A description");
    expect(body.implementation).toBe("Some impl");
    expect(body.acceptance_criteria).toBe("It passes");
  });

  it("PATCH /tasks updates new fields", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ project_id: projectId, title: "Patch new fields" }]),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: task.id, description: "Patched desc" }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.description).toBe("Patched desc");
  });

  it("GET /tasks/:id returns full task entity", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ project_id: projectId, title: "Get Task", description: "Full desc", plan: "Full plan" }]),
    });
    const [task] = await create.json();
    const res = await req(`/tasks/${task.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(task.id);
    expect(body.title).toBe("Get Task");
    expect(body.description).toBe("Full desc");
    expect(body.plan).toBe("Full plan");
    expect(body.project_id).toBe(projectId);
    expect(body.created_at).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
  });

  it("GET /tasks/:id returns 404 for nonexistent id", async () => {
    const res = await req(`/tasks/00000000000000000000000000`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Agent Routes
// ---------------------------------------------------------------------------

describe("Agent Routes", () => {
  it("POST /agents creates agent", async () => {
    const res = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ name: "Route Agent", description: "Desc", prompt: "Do things" }]),
    });
    expect(res.status).toBe(201);
    const [body] = await res.json();
    expect(body.name).toBe("Route Agent");
    expect(body.description).toBe("Desc");
    expect(body.prompt).toBe("Do things");
  });

  it("GET /agents lists agents with summary fields", async () => {
    const res = await req("/agents");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
    const summary = body.data[0];
    expect(summary.id).toBeTruthy();
    expect(summary.name).toBeTruthy();
    expect(summary.created_at).toBeTruthy();
    expect(summary.updated_at).toBeTruthy();
    // Summary must not include full-entity fields
    expect(summary.description).toBeUndefined();
    expect(summary.prompt).toBeUndefined();
  });

  it("GET /agents/:id returns full agent entity", async () => {
    const create = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ name: "Get Agent", description: "Full desc", prompt: "Full prompt", platform_agent: "Explore" }]),
    });
    const [agent] = await create.json();
    const res = await req(`/agents/${agent.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(agent.id);
    expect(body.name).toBe("Get Agent");
    expect(body.description).toBe("Full desc");
    expect(body.prompt).toBe("Full prompt");
    expect(body.platform_agent).toBe("Explore");
    expect(body.created_at).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
  });

  it("GET /agents/:id returns 404 for nonexistent id", async () => {
    const res = await req("/agents/00000000000000000000000000");
    expect(res.status).toBe(404);
  });

  it("PATCH /agents updates fields", async () => {
    const create = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ name: "Patch Agent" }]),
    });
    const [agent] = await create.json();
    const res = await req("/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: agent.id, name: "Patched Agent", description: "New desc" }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.name).toBe("Patched Agent");
    expect(body.description).toBe("New desc");
  });

  it("DELETE /agents deletes agents", async () => {
    const create = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ name: "Delete Agent" }]),
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
// Job Routes
// ---------------------------------------------------------------------------

describe("Job Routes", () => {
  let agentId: string;

  beforeAll(async () => {
    const res = await req("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ name: "Job Route Agent" }]),
    });
    const [agent] = await res.json();
    agentId = agent.id;
  });

  it("POST /jobs creates job", async () => {
    const res = await req("/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ agent_id: agentId, input: "some input" }]),
    });
    expect(res.status).toBe(201);
    const [body] = await res.json();
    expect(body.agent_id).toBe(agentId);
    expect(body.input).toBe("some input");
    expect(body.status).toBeTruthy();
  });

  it("GET /jobs lists jobs with summary fields", async () => {
    const res = await req("/jobs");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
    const summary = body.data[0];
    expect(summary.id).toBeTruthy();
    expect(summary.agent_id).toBeTruthy();
    expect(summary.status).toBeTruthy();
    expect(summary.created_at).toBeTruthy();
    expect(summary.updated_at).toBeTruthy();
    // Summary must not include full-entity fields
    expect(summary.input).toBeUndefined();
    expect(summary.output).toBeUndefined();
  });

  it("GET /jobs?agent_id filters by agent", async () => {
    const res = await req(`/jobs?agent_id=${agentId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((j: { agent_id: string }) => j.agent_id === agentId)).toBe(true);
  });

  it("GET /jobs?status filters by status", async () => {
    const res = await req("/jobs?status=todo");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((j: { status: string }) => j.status === "todo")).toBe(true);
  });

  it("GET /jobs/:id returns full job entity", async () => {
    const create = await req("/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ agent_id: agentId, input: "full input" }]),
    });
    const [job] = await create.json();
    const res = await req(`/jobs/${job.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(job.id);
    expect(body.agent_id).toBe(agentId);
    expect(body.input).toBe("full input");
    expect(body.created_at).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
  });

  it("GET /jobs/:id returns 404 for nonexistent id", async () => {
    const res = await req("/jobs/00000000000000000000000000");
    expect(res.status).toBe(404);
  });

  it("PATCH /jobs updates fields", async () => {
    const create = await req("/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ agent_id: agentId }]),
    });
    const [job] = await create.json();
    const res = await req("/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: job.id, status: "running" }]),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.status).toBe("running");
  });

  it("DELETE /jobs deletes jobs", async () => {
    const create = await req("/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ agent_id: agentId }]),
    });
    const [job] = await create.json();
    const res = await req("/jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [job.id] }),
    });
    expect(res.status).toBe(204);

    const check = await req(`/jobs/${job.id}`);
    expect(check.status).toBe(404);
  });
});

