import { Hono } from "hono";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";
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
  app.route("/projects", projectRoutes(ctx.projectService));
  app.route("/tasks", taskRoutes(ctx.taskService));
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

