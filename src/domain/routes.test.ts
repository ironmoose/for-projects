import { Hono } from "hono";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";
import { projectRoutes } from "../server/routes/projects";
import { taskRoutes } from "../server/routes/tasks";
import { documentRoutes } from "../server/routes/documents";
import type { ContentfulStatusCode } from "hono/utils/http-status";

let ctx: AppContext;
let tempDir: string;
let app: Hono;
let healthStartedAt: number;
let healthVersion: string;

beforeAll(async () => {
  healthStartedAt = Date.now();
  tempDir = mkdtempSync(join(tmpdir(), "route-test-"));
  ctx = await bootstrap(join(tempDir, "test.db"));

  const pkg = JSON.parse(readFileSync(join(import.meta.dir, "../../package.json"), "utf-8")) as { version: string };
  healthVersion = pkg.version;

  app = new Hono();
  app.route("/projects", projectRoutes(ctx.projectService, ctx.taskService, ctx.taskDependencyService));
  app.route("/tasks", taskRoutes(ctx.taskService, ctx.taskDependencyService));
  app.route("/documents", documentRoutes(ctx.documentService));

  app.get("/health", (c) => {
    let dbOk = false;
    try {
      const row = ctx.db!.query("SELECT 1 AS ok").get() as { ok: number } | null;
      dbOk = row?.ok === 1;
    } catch {
      dbOk = false;
    }
    return c.json({
      status: dbOk ? "ok" : "degraded",
      version: healthVersion,
      uptime_seconds: Math.floor((Date.now() - healthStartedAt) / 1000),
      database: dbOk ? "connected" : "unreachable",
      timestamp: new Date().toISOString(),
    });
  });

  app.onError((err, c) => {
    if (err instanceof SyntaxError) return c.json({ error: "invalid JSON body" }, 400);
    if (err instanceof ServiceError) return c.json({ error: err.message }, err.statusCode as ContentfulStatusCode);
    return c.json({ error: "internal server error" }, 500);
  });
});

afterAll(() => {
  ctx.db!.close();
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
      body: JSON.stringify({ items: [{ title: "Route Project" }] }),
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
      body: JSON.stringify({ items: [{ title: "Get Project", summary: "A summary" }] }),
    });
    const [project] = await create.json();
    const res = await req(`/projects/${project.id}`);
    const body = await res.json();
    expect(body.id).toBe(project.id);
    expect(body.title).toBe("Get Project");
    expect(body.summary).toBe("A summary");
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
      body: JSON.stringify({ items: [{ title: "Patch Project" }] }),
    });
    const [project] = await create.json();
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: project.id, title: "Patched", summary: "New summary" }] }),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.title).toBe("Patched");
    expect(body.summary).toBe("New summary");
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
    // Summary includes summary field (no removed fields to check)
  });

  it("GET /projects filters by title", async () => {
    await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "RouteTitleFilterUnique777" }] }),
    });

    const res = await req("/projects?title=RouteTitleFilterUnique777");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data.length).toBe(1);
    expect(body.data[0].title).toBe("RouteTitleFilterUnique777");
  });

  it("DELETE /projects deletes projects", async () => {
    const create = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Delete Me" }] }),
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
    const [p] = await ctx.projectService.create([{ title: "Task Route Project" }]);
    projectId = p.id;
  });

  it("POST /tasks creates task", async () => {
    const res = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Route Task" }] }),
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
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Summary Check", summary: "S" }] }),
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
  });

  it("PATCH /tasks updates task", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Patch task" }] }),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: task.id, title: "Patched", summary: "New summary" }] }),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.title).toBe("Patched");
    expect(body.summary).toBe("New summary");
  });

  it("POST /tasks creates task with summary", async () => {
    const res = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        project_id: projectId,
        title: "Summary Task",
        summary: "A summary",
      }] }),
    });
    expect(res.status).toBe(201);
    const [body] = await res.json();
    expect(body.summary).toBe("A summary");
  });

  it("PATCH /tasks updates summary", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Patch summary task" }] }),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: task.id, summary: "Patched summary" }] }),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.summary).toBe("Patched summary");
  });

  it("GET /tasks/:id returns full task entity", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Get Task", summary: "Full summary" }] }),
    });
    const [task] = await create.json();
    const res = await req(`/tasks/${task.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(task.id);
    expect(body.title).toBe("Get Task");
    expect(body.summary).toBe("Full summary");
    expect(body.project_id).toBe(projectId);
    expect(body.created_at).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
  });

  it("GET /tasks/:id returns 404 for nonexistent id", async () => {
    const res = await req(`/tasks/00000000000000000000000000`);
    expect(res.status).toBe(404);
  });

  it("POST /tasks creates task with context and acceptance_criteria", async () => {
    const res = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        project_id: projectId,
        title: "Context AC Task",
        context: "Background for this task",
        acceptance_criteria: "Tests pass, no regressions",
      }] }),
    });
    expect(res.status).toBe(201);
    const [body] = await res.json();
    expect(body.context).toBe("Background for this task");
    expect(body.acceptance_criteria).toBe("Tests pass, no regressions");
  });

  it("GET /tasks/:id returns context and acceptance_criteria", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        project_id: projectId,
        title: "Get Context Task",
        context: "Full context here",
        acceptance_criteria: "Full AC here",
      }] }),
    });
    const [task] = await create.json();
    const res = await req(`/tasks/${task.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.context).toBe("Full context here");
    expect(body.acceptance_criteria).toBe("Full AC here");
  });

  it("GET /tasks list excludes context and acceptance_criteria, includes has_ booleans", async () => {
    await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        project_id: projectId,
        title: "List Exclusion Check",
        context: "Should not appear in list",
        acceptance_criteria: "Should not appear in list",
      }] }),
    });
    const res = await req(`/tasks?project_id=${projectId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    const task = body.data.find((t: { title: string }) => t.title === "List Exclusion Check");
    expect(task).toBeTruthy();
    // Full text fields must not be in list response
    expect(task.context).toBeUndefined();
    expect(task.acceptance_criteria).toBeUndefined();
    // Boolean flags must be present
    expect(task.has_context).toBe(true);
    expect(task.has_acceptance_criteria).toBe(true);
  });

  it("PATCH /tasks updates context and acceptance_criteria", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Patch context task" }] }),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        id: task.id,
        context: "Patched context",
        acceptance_criteria: "Patched AC",
      }] }),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.context).toBe("Patched context");
    expect(body.acceptance_criteria).toBe("Patched AC");
  });

  it("PATCH /tasks clears context via null", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        project_id: projectId,
        title: "Clear context task",
        context: "Will be cleared",
      }] }),
    });
    const [task] = await create.json();
    expect(task.context).toBe("Will be cleared");

    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: task.id, context: null }] }),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.context).toBeNull();
  });

  it("PATCH /tasks clears acceptance_criteria via null", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        project_id: projectId,
        title: "Clear AC task",
        acceptance_criteria: "Will be cleared",
      }] }),
    });
    const [task] = await create.json();
    expect(task.acceptance_criteria).toBe("Will be cleared");

    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: task.id, acceptance_criteria: null }] }),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.acceptance_criteria).toBeNull();
  });

  it("GET /tasks/status-counts returns counts for multiple projects", async () => {
    // Create a second project with tasks in different statuses
    const [p2] = await ctx.projectService.create([{ title: "Status Counts Project 2" }]);
    await ctx.taskService.create([
      { project_id: p2.id, title: "SC Todo", status: "todo" },
      { project_id: p2.id, title: "SC Done", status: "done" },
      { project_id: p2.id, title: "SC Done 2", status: "done" },
      { project_id: p2.id, title: "SC InProgress", status: "in_progress" },
    ]);

    const res = await req(`/tasks/status-counts?project_ids=${projectId},${p2.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // projectId should have counts from earlier tests
    expect(body[projectId]).toBeDefined();
    expect(body[projectId].total).toBeGreaterThan(0);
    expect(body[projectId].counts).toBeDefined();

    // p2 should have exact counts we just created
    expect(body[p2.id]).toBeDefined();
    expect(body[p2.id].total).toBe(4);
    expect(body[p2.id].counts.todo).toBe(1);
    expect(body[p2.id].counts.done).toBe(2);
    expect(body[p2.id].counts.in_progress).toBe(1);
  });

  it("GET /tasks/status-counts returns empty for project with no tasks", async () => {
    const [emptyProject] = await ctx.projectService.create([{ title: "Empty Status Counts Project" }]);
    const res = await req(`/tasks/status-counts?project_ids=${emptyProject.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[emptyProject.id]).toBeDefined();
    expect(body[emptyProject.id].total).toBe(0);
    expect(body[emptyProject.id].counts).toEqual({});
  });

  it("GET /tasks/status-counts returns empty object for no project_ids", async () => {
    const res = await req("/tasks/status-counts");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({});
  });

  it("GET /tasks/status-counts handles mixed statuses correctly", async () => {
    const [p3] = await ctx.projectService.create([{ title: "Mixed Status Project" }]);
    await ctx.taskService.create([
      { project_id: p3.id, title: "Mixed 1", status: "todo" },
      { project_id: p3.id, title: "Mixed 2", status: "todo" },
      { project_id: p3.id, title: "Mixed 3", status: "archived" },
    ]);

    const res = await req(`/tasks/status-counts?project_ids=${p3.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[p3.id].total).toBe(3);
    expect(body[p3.id].counts.todo).toBe(2);
    expect(body[p3.id].counts.archived).toBe(1);
    expect(body[p3.id].counts.done).toBeUndefined();
    expect(body[p3.id].counts.in_progress).toBeUndefined();
  });

  it("POST /tasks with documents returns 201 and references are verifiable via GET", async () => {
    // Create a real document first so the service can validate the reference
    const docRes = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Task Doc" }] }),
    });
    const [doc] = await docRes.json();
    const res = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        project_id: projectId,
        title: "Task with docs",
        documents: { [doc.id]: [{ type: "goal" }] },
      }] }),
    });
    expect(res.status).toBe(201);
    const [task] = await res.json();

    // Verify via GET
    const getRes = await req(`/tasks/${task.id}`);
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.documents).toBeArray();
    expect(body.documents.length).toBe(1);
    expect(body.documents[0].document_id).toBe(doc.id);
    expect(body.documents[0].type).toBe("goal");
  });

  it("PATCH /tasks with documents returns 200 and references are verifiable via GET", async () => {
    const docRes = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Patch Task Doc" }] }),
    });
    const [doc] = await docRes.json();
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Patch docs task" }] }),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        id: task.id,
        documents: {
          [doc.id]: [{ type: "design" }, { type: "reference" }],
        },
      }] }),
    });
    expect(res.status).toBe(200);

    // Verify via GET
    const getRes = await req(`/tasks/${task.id}`);
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.documents).toBeArray();
    expect(body.documents.length).toBe(2);
    const types = body.documents.map((d: { type: string }) => d.type).sort();
    expect(types).toEqual(["design", "reference"]);
    expect(body.documents.every((d: { document_id: string }) => d.document_id === doc.id)).toBe(true);
  });

  it("PATCH /tasks returns 400 for invalid documents merge-patch (bad type)", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Bad docs task" }] }),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        id: task.id,
        documents: { "doc-1": [{ type: "invalid_type" }] },
      }] }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("documents");
  });

  it("PATCH /tasks returns 400 for invalid documents merge-patch (wrong shape)", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Wrong shape task" }] }),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        id: task.id,
        documents: { "doc-1": "not-an-array" },
      }] }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("documents");
  });

  it("PATCH /tasks works normally when documents field is absent", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: projectId, title: "No docs task" }] }),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: task.id, title: "Updated title" }] }),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.title).toBe("Updated title");
  });
});

// ---------------------------------------------------------------------------
// Document Routes
// ---------------------------------------------------------------------------

describe("Document Routes", () => {
  it("POST /documents batch creates with tags", async () => {
    const res = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Doc One", content: "Body one", tags: ["architecture", "domain"] }],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toBeArray();
    expect(body[0].title).toBe("Doc One");
    expect(body[0].content).toBe("Body one");
    expect(body[0].tags.sort()).toEqual(["architecture", "domain"]);
  });

  it("PATCH /documents batch updates with tag replacement", async () => {
    const create = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Patch Doc", content: "Original", tags: ["security"] }],
      }),
    });
    const [doc] = await create.json();

    const res = await req("/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: doc.id, title: "Patched Doc", tags: ["ui", "data"] }],
      }),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.title).toBe("Patched Doc");
    expect(body.tags.sort()).toEqual(["data", "ui"]);
  });

  it("GET /documents paginates via limit/offset", async () => {
    // Create a few documents to ensure pagination is meaningful
    await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { title: "Page Doc A" },
          { title: "Page Doc B" },
          { title: "Page Doc C" },
        ],
      }),
    });

    const res = await req("/documents?limit=2&offset=0");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeLessThanOrEqual(2);
    expect(typeof body.total).toBe("number");
    expect(body.total).toBeGreaterThanOrEqual(3);
  });

  it("GET /documents filters by tag", async () => {
    await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Tagged Doc", tags: ["troubleshooting"] }],
      }),
    });

    const res = await req("/documents?tag=troubleshooting");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.every((d: any) => d.tags.includes("troubleshooting"))).toBe(true);
  });

  it("GET /documents filters by title", async () => {
    await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "UniqueTitleSearch123" }],
      }),
    });

    const res = await req("/documents?title=UniqueTitleSearch123");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].title).toContain("UniqueTitleSearch123");
  });

  it("GET /documents/:id returns full content and tags", async () => {
    const create = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Full Doc", content: "Full content here", tags: ["reference"] }],
      }),
    });
    const [doc] = await create.json();

    const res = await req(`/documents/${doc.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(doc.id);
    expect(body.title).toBe("Full Doc");
    expect(body.content).toBe("Full content here");
    expect(body.tags).toEqual(["reference"]);
    expect(body.created_at).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
  });

  it("GET /documents/:id returns 404 for nonexistent id", async () => {
    const res = await req("/documents/00000000000000000000000000");
    expect(res.status).toBe(404);
  });

  it("POST /documents with invalid tag returns 400", async () => {
    const res = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Bad Tag Doc", tags: ["invalid-tag"] }],
      }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /documents batch deletes", async () => {
    const create = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Delete Me Doc" }],
      }),
    });
    const [doc] = await create.json();

    const res = await req("/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [doc.id] }),
    });
    expect(res.status).toBe(204);

    const check = await req(`/documents/${doc.id}`);
    expect(check.status).toBe(404);
  });

  it("PATCH /documents with tags=[] clears all tags", async () => {
    const create = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Clear Tags Route Doc", tags: ["security", "ui"] }],
      }),
    });
    const [doc] = await create.json();
    expect(doc.tags.length).toBe(2);

    const patchRes = await req("/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: doc.id, tags: [] }],
      }),
    });
    expect(patchRes.status).toBe(200);

    const getRes = await req(`/documents/${doc.id}`);
    const body = await getRes.json();
    expect(body.tags).toEqual([]);
  });

  it("GET /documents list returns summary without content", async () => {
    await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "SummaryShapeDoc", content: "Hidden content" }],
      }),
    });

    const res = await req("/documents?title=SummaryShapeDoc");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const summary = body.data[0];
    expect(summary.has_content).toBe(true);
    expect(summary.content).toBeUndefined();
    expect(summary.id).toBeTruthy();
    expect(summary.title).toBe("SummaryShapeDoc");
  });

  it("POST /documents with missing title returns 400", async () => {
    const res = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ content: "No title here" }],
      }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /documents with summary returns summary in response", async () => {
    const res = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Summary Route Doc", summary: "A brief summary", content: "Full body" }],
      }),
    });
    expect(res.status).toBe(201);
    const [doc] = await res.json();
    expect(doc.summary).toBe("A brief summary");
    expect(doc.content).toBe("Full body");
  });

  it("PATCH /documents with summary returns updated summary", async () => {
    const create = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Patch Summary Doc" }],
      }),
    });
    const [doc] = await create.json();
    expect(doc.summary).toBeNull();

    const res = await req("/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: doc.id, summary: "Updated summary" }],
      }),
    });
    expect(res.status).toBe(200);
    const [updated] = await res.json();
    expect(updated.summary).toBe("Updated summary");
  });

  it("GET /documents list includes summary field", async () => {
    await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "SummaryInListRouteDoc", summary: "Listed summary" }],
      }),
    });

    const res = await req("/documents?title=SummaryInListRouteDoc");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].summary).toBe("Listed summary");
  });

  it("GET /documents/:id returns summary", async () => {
    const create = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Get Summary Doc", summary: "Get me" }],
      }),
    });
    const [doc] = await create.json();

    const res = await req(`/documents/${doc.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toBe("Get me");
  });

  it("GET /documents?search= matches title", async () => {
    await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "RouteSearchTitleXYZ" }],
      }),
    });

    const res = await req("/documents?search=RouteSearchTitle");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((d: { title: string }) => d.title === "RouteSearchTitleXYZ")).toBe(true);
  });

  it("GET /documents?search= matches summary", async () => {
    await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "RouteSearchSummaryDoc", summary: "unique_route_summary_term" }],
      }),
    });

    const res = await req("/documents?search=unique_route_summary_term");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((d: { title: string }) => d.title === "RouteSearchSummaryDoc")).toBe(true);
  });

  it("GET /documents?search= returns empty for no match", async () => {
    const res = await req("/documents?search=zzz_no_route_match_999");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(0);
  });

  it("GET /documents supports both search and title together", async () => {
    await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "DualFilterDoc", summary: "dual filter summary xyz" }],
      }),
    });

    const res = await req("/documents?search=dual+filter&title=DualFilterDoc");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Extended Project Routes
// ---------------------------------------------------------------------------

describe("Extended Project Routes", () => {
  it("PATCH /projects with documents merge-patch attaches documents, verify via GET", async () => {
    // Create a project and a document
    const [project] = await (await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Attach Test Project" }] }),
    })).json();
    const [doc] = await (await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Attach Test Doc" }] }),
    })).json();

    // Attach document to project via merge-patch
    const patchRes = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: project.id, documents: { [doc.id]: [{ type: "reference" }] } }] }),
    });
    expect(patchRes.status).toBe(200);

    // Verify GET includes the document
    const getRes = await req(`/projects/${project.id}`);
    const body = await getRes.json();
    expect(body.documents).toBeArray();
    expect(body.documents.length).toBe(1);
    expect(body.documents[0].document_id).toBe(doc.id);
    expect(body.documents[0].type).toBe("reference");
  });

  it("PATCH /projects with documents merge-patch null removes document", async () => {
    // Create project + document, attach first
    const [project] = await (await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Detach Test Project" }] }),
    })).json();
    const [doc] = await (await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Detach Test Doc" }] }),
    })).json();

    await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: project.id, documents: { [doc.id]: [{ type: "design" }] } }] }),
    });

    // Detach via null
    const detachRes = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: project.id, documents: { [doc.id]: null } }] }),
    });
    expect(detachRes.status).toBe(200);

    const getRes = await req(`/projects/${project.id}`);
    const body = await getRes.json();
    expect(body.documents).toBeArray();
    expect(body.documents.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Extended Task Routes (documents merge-patch)
// ---------------------------------------------------------------------------

describe("Extended Task Routes", () => {
  it("PATCH /tasks with documents merge-patch attaches documents, verify via GET", async () => {
    const [project] = await ctx.projectService.create([{ title: "Task MP Attach Project" }]);
    const [doc] = await (await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Task MP Attach Doc" }] }),
    })).json();

    const createRes = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: project.id, title: "Task MP Attach" }] }),
    });
    const [task] = await createRes.json();

    // Attach document via merge-patch
    const patchRes = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: task.id, documents: { [doc.id]: [{ type: "requirements" }] } }] }),
    });
    expect(patchRes.status).toBe(200);

    // Verify GET includes the document
    const getRes = await req(`/tasks/${task.id}`);
    const body = await getRes.json();
    expect(body.documents).toBeArray();
    expect(body.documents.length).toBe(1);
    expect(body.documents[0].document_id).toBe(doc.id);
    expect(body.documents[0].type).toBe("requirements");
  });

  it("PATCH /tasks with documents merge-patch null removes document", async () => {
    const [project] = await ctx.projectService.create([{ title: "Task MP Detach Project" }]);
    const [doc] = await (await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Task MP Detach Doc" }] }),
    })).json();

    // Create task with document attached
    const createRes = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        project_id: project.id,
        title: "Task MP Detach",
        documents: { [doc.id]: [{ type: "design" }] },
      }] }),
    });
    const [task] = await createRes.json();

    // Verify attached
    let getRes = await req(`/tasks/${task.id}`);
    let body = await getRes.json();
    expect(body.documents.some((d: { document_id: string }) => d.document_id === doc.id)).toBe(true);

    // Detach via null
    const detachRes = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: task.id, documents: { [doc.id]: null } }] }),
    });
    expect(detachRes.status).toBe(200);

    getRes = await req(`/tasks/${task.id}`);
    body = await getRes.json();
    expect(body.documents).toBeArray();
    expect(body.documents.length).toBe(0);
  });

  it("POST /tasks with documents creates task with references attached", async () => {
    const [project] = await ctx.projectService.create([{ title: "Task MP Create Project" }]);
    const [doc] = await (await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Task MP Create Doc" }] }),
    })).json();

    const res = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        project_id: project.id,
        title: "Task MP Create",
        documents: { [doc.id]: [{ type: "goal" }, { type: "note" }] },
      }] }),
    });
    expect(res.status).toBe(201);
    const [task] = await res.json();

    // Verify via GET
    const getRes = await req(`/tasks/${task.id}`);
    const body = await getRes.json();
    expect(body.documents).toBeArray();
    expect(body.documents.length).toBe(2);
    const types = body.documents.map((d: { type: string }) => d.type).sort();
    expect(types).toEqual(["goal", "note"]);
  });
});

// ---------------------------------------------------------------------------
// Documents Merge-Patch Validation
// ---------------------------------------------------------------------------

describe("Documents Merge-Patch Validation", () => {
  let projectId: string;
  let taskId: string;
  let docId: string;

  beforeAll(async () => {
    const [project] = await ctx.projectService.create([{ title: "MergePatch Test Project" }]);
    projectId = project.id;
    const [task] = await ctx.taskService.create([{ project_id: projectId, title: "MergePatch Test Task" }]);
    taskId = task.id;
    const [doc] = await ctx.documentService.create([{ title: "MergePatch Test Doc" }]);
    docId = doc.id;
  });

  it("PATCH /projects accepts documents field with valid merge-patch shape", async () => {
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: projectId,
          documents: {
            [docId]: [{ type: "design" }, { type: "reference" }],
          },
        }],
      }),
    });
    expect(res.status).toBe(200);
  });

  it("PATCH /tasks accepts documents field and actually applies merge-patch", async () => {
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: taskId,
          documents: {
            [docId]: [{ type: "plan" }],
          },
        }],
      }),
    });
    expect(res.status).toBe(200);

    // Verify the documents were actually applied via GET
    const getRes = await req(`/tasks/${taskId}`);
    const body = await getRes.json();
    expect(body.documents).toBeArray();
    expect(body.documents.length).toBeGreaterThanOrEqual(1);
    expect(body.documents.some((d: { document_id: string; type: string }) => d.document_id === docId && d.type === "plan")).toBe(true);
  });

  it("PATCH /projects accepts null value (remove references)", async () => {
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: projectId,
          documents: {
            [docId]: null,
          },
        }],
      }),
    });
    expect(res.status).toBe(200);
  });

  it("PATCH /projects accepts empty documents object (no-op)", async () => {
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: projectId,
          documents: {},
        }],
      }),
    });
    expect(res.status).toBe(200);
  });

  it("absent documents field means no reference changes", async () => {
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: projectId, title: "Renamed" }],
      }),
    });
    expect(res.status).toBe(200);
  });

  it("PATCH /projects with invalid type value returns 400", async () => {
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: projectId,
          documents: {
            [docId]: [{ type: "invalid_type" }],
          },
        }],
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/documents/i);
  });


  it("PATCH /projects with non-object documents value returns 400", async () => {
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: projectId,
          documents: "not_an_object",
        }],
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/documents/i);
  });

  it("PATCH /projects with valid multiple reference types accepted", async () => {
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: projectId,
          documents: {
            [docId]: [{ type: "goal" }, { type: "plan" }, { type: "requirements" }, { type: "design" }, { type: "reference" }, { type: "note" }],
          },
        }],
      }),
    });
    expect(res.status).toBe(200);
  });

  it("PATCH /projects with mixed set and null operations accepted", async () => {
    const [doc2] = await ctx.documentService.create([{ title: "MergePatch Doc 2" }]);
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: projectId,
          documents: {
            [docId]: [{ type: "design" }],
            [doc2.id]: null,
          },
        }],
      }),
    });
    expect(res.status).toBe(200);
  });

  it("PATCH /projects with empty array value accepted (set zero types)", async () => {
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: projectId,
          documents: {
            [docId]: [],
          },
        }],
      }),
    });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Batch Endpoint Validation
// ---------------------------------------------------------------------------

describe("Batch Endpoint Validation", () => {
  it("POST /projects with non-array items returns 400", async () => {
    const res = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: "not an array" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/items array/i);
  });

  it("POST /tasks with non-array items returns 400", async () => {
    const res = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: "not an array" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/items array/i);
  });

  it("POST /documents with non-array items returns 400", async () => {
    const res = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: "not an array" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/items array/i);
  });

  it("PATCH /projects with non-array items returns 400", async () => {
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: { not: "an array" } }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/items array/i);
  });

  it("POST /projects with invalid JSON returns 400", async () => {
    const res = await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{this is not valid json",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid JSON/i);
  });

  it("POST /tasks with empty items array returns 201 with empty array", async () => {
    const res = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toBeArray();
    expect(body.length).toBe(0);
  });

  it("POST /documents with missing title returns 400", async () => {
    const res = await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{}] }),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /tasks with invalid status enum returns 400", async () => {
    // Create a valid task first
    const [p] = await ctx.projectService.create([{ title: "Enum Route Project" }]);
    const createRes = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: p.id, title: "Enum task" }] }),
    });
    const [task] = await createRes.json();

    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: task.id, status: "completed" }] }),
    });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Project Dependency Endpoints
// ---------------------------------------------------------------------------

describe("Project Dependency Endpoints", () => {
  let projectId: string;
  let taskAId: string;
  let taskBId: string;
  let taskCId: string;

  beforeAll(async () => {
    const [project] = await ctx.projectService.create([{ title: "Dep Endpoint Project" }]);
    projectId = project.id;
    const tasks = await ctx.taskService.create([
      { project_id: projectId, title: "Dep Task A" },
      { project_id: projectId, title: "Dep Task B" },
      { project_id: projectId, title: "Dep Task C" },
    ]);
    taskAId = tasks[0].id;
    taskBId = tasks[1].id;
    taskCId = tasks[2].id;
  });

  it("POST /projects/:id/dependencies creates dependencies and returns 201", async () => {
    const res = await req(`/projects/${projectId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ source_task_id: taskAId, target_task_id: taskBId, dependency_type: "blocks" }],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toBeArray();
    expect(body.length).toBe(1);
    expect(body[0].source_task_id).toBe(taskAId);
    expect(body[0].target_task_id).toBe(taskBId);
    expect(body[0].dependency_type).toBe("blocks");
  });

  it("POST /projects/:id/dependencies with non-array items returns 400", async () => {
    const res = await req(`/projects/${projectId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: "not an array" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/items array/i);
  });

  it("POST /projects/:id/dependencies with cycle succeeds", async () => {
    // A already blocks B (from previous test), B blocks C, then C blocks A creates a cycle — now allowed
    await req(`/projects/${projectId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ source_task_id: taskBId, target_task_id: taskCId, dependency_type: "blocks" }],
      }),
    });
    const res = await req(`/projects/${projectId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ source_task_id: taskCId, target_task_id: taskAId, dependency_type: "blocks" }],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toBeArray();
    expect(body.length).toBe(1);
    expect(body[0].source_task_id).toBe(taskCId);
    expect(body[0].target_task_id).toBe(taskAId);
  });

  it("POST /projects/:id/dependencies with cross-project tasks returns 400", async () => {
    const [otherProject] = await ctx.projectService.create([{ title: "Other Dep Project" }]);
    const [otherTask] = await ctx.taskService.create([{ project_id: otherProject.id, title: "Other Task" }]);
    const res = await req(`/projects/${projectId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ source_task_id: taskAId, target_task_id: otherTask.id, dependency_type: "blocks" }],
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/same project/i);
  });

  it("POST /projects/:id/dependencies with nonexistent task returns 404", async () => {
    const res = await req(`/projects/${projectId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ source_task_id: taskAId, target_task_id: "00000000000000000000000000", dependency_type: "blocks" }],
      }),
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /projects/:id/dependencies removes dependencies and returns 204", async () => {
    const res = await req(`/projects/${projectId}/dependencies`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ source_task_id: taskAId, target_task_id: taskBId }],
      }),
    });
    expect(res.status).toBe(204);
  });

  it("DELETE /projects/:id/dependencies with nonexistent task returns 404", async () => {
    const res = await req(`/projects/${projectId}/dependencies`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ source_task_id: taskAId, target_task_id: "00000000000000000000000000" }],
      }),
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /projects/:id/dependencies with non-array items returns 400", async () => {
    const res = await req(`/projects/${projectId}/dependencies`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: "not an array" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/items array/i);
  });
});

// ---------------------------------------------------------------------------
// Task Dependency Routes (via PATCH /tasks and GET endpoints)
// ---------------------------------------------------------------------------

describe("Task Dependency Routes", () => {
  let projectId: string;
  let taskAId: string;
  let taskBId: string;
  let taskCId: string;

  beforeAll(async () => {
    const [project] = await ctx.projectService.create([{ title: "Task Dep Route Project" }]);
    projectId = project.id;
    const tasks = await ctx.taskService.create([
      { project_id: projectId, title: "Dep Route Task A" },
      { project_id: projectId, title: "Dep Route Task B" },
      { project_id: projectId, title: "Dep Route Task C" },
    ]);
    taskAId = tasks[0].id;
    taskBId = tasks[1].id;
    taskCId = tasks[2].id;
  });

  it("PATCH /tasks with add_dependencies creates dependency and returns 200", async () => {
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: taskBId,
          add_dependencies: [{ task_id: taskAId, type: "blocks" }],
        }],
      }),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.id).toBe(taskBId);
  });

  it("PATCH /tasks with remove_dependencies removes dependency and returns 200", async () => {
    // First add a dependency to remove
    await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskAId, target_task_id: taskCId, dependency_type: "blocks" },
    ]);

    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: taskCId,
          remove_dependencies: [{ task_id: taskAId }],
        }],
      }),
    });
    expect(res.status).toBe(200);

    // Verify the dependency is gone
    const depRes = await req(`/tasks/${taskCId}/dependencies`);
    const deps = await depRes.json();
    expect(deps.blocked_by.every((d: { task_id: string }) => d.task_id !== taskAId)).toBe(true);
  });

  it("GET /tasks/:id/dependencies returns correct shape with blocks, blocked_by, relates_to, is_blocked", async () => {
    const res = await req(`/tasks/${taskBId}/dependencies`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.blocks).toBeArray();
    expect(body.blocked_by).toBeArray();
    expect(body.relates_to).toBeArray();
    expect(typeof body.is_blocked).toBe("boolean");
  });

  it("GET /tasks/:id/dependencies items have task_id, task_title, task_status, dependency_type", async () => {
    // taskB is blocked by taskA (from earlier test)
    const res = await req(`/tasks/${taskBId}/dependencies`);
    const body = await res.json();
    expect(body.blocked_by.length).toBeGreaterThanOrEqual(1);
    const dep = body.blocked_by[0];
    expect(dep.task_id).toBeTruthy();
    expect(dep.task_title).toBeTruthy();
    expect(dep.task_status).toBeTruthy();
    expect(dep.dependency_type).toBeTruthy();
  });

  it("GET /projects/:id/dependency-graph returns tasks, edges, blocked_task_ids", async () => {
    const res = await req(`/projects/${projectId}/dependency-graph`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toBeArray();
    expect(body.edges).toBeArray();
    expect(body.blocked_task_ids).toBeArray();
    expect(body.tasks.length).toBeGreaterThanOrEqual(3);
    // Verify task shape in graph
    const task = body.tasks[0];
    expect(task.id).toBeTruthy();
    expect(task.title).toBeTruthy();
    expect(task.status).toBeTruthy();
  });

  it("PATCH /tasks with add_dependencies creating a cycle succeeds", async () => {
    // A blocks B already. Making B block A creates a cycle — now allowed.
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: taskAId,
          add_dependencies: [{ task_id: taskBId, type: "blocks" }],
        }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeArray();
    expect(body.length).toBe(1);
  });

  it("PATCH /tasks with add_dependencies for cross-project task returns 400", async () => {
    const [otherProject] = await ctx.projectService.create([{ title: "Other Route Dep Project" }]);
    const [otherTask] = await ctx.taskService.create([{ project_id: otherProject.id, title: "Other Route Task" }]);

    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: taskBId,
          add_dependencies: [{ task_id: otherTask.id, type: "blocks" }],
        }],
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/same project/i);
  });

  it("PATCH /tasks with add_dependencies referencing nonexistent task returns 404", async () => {
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: taskBId,
          add_dependencies: [{ task_id: "00000000000000000000000000", type: "blocks" }],
        }],
      }),
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /tasks cleans up dependency rows via CASCADE", async () => {
    // Create fresh tasks for this test
    const [depA] = await ctx.taskService.create([{ project_id: projectId, title: "CASCADE Source" }]);
    const [depB] = await ctx.taskService.create([{ project_id: projectId, title: "CASCADE Target" }]);
    await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: depA.id, target_task_id: depB.id, dependency_type: "blocks" },
    ]);

    // Verify the dependency exists
    const beforeRes = await req(`/tasks/${depB.id}/dependencies`);
    const beforeBody = await beforeRes.json();
    expect(beforeBody.blocked_by.length).toBe(1);

    // Delete the source task
    const deleteRes = await req("/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [depA.id] }),
    });
    expect(deleteRes.status).toBe(204);

    // Verify the dependency is gone
    const afterRes = await req(`/tasks/${depB.id}/dependencies`);
    const afterBody = await afterRes.json();
    expect(afterBody.blocked_by.length).toBe(0);
    expect(afterBody.is_blocked).toBe(false);
  });

  it("PATCH /tasks with add_dependencies relates_to type succeeds", async () => {
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: taskCId,
          add_dependencies: [{ task_id: taskBId, type: "relates_to" }],
        }],
      }),
    });
    expect(res.status).toBe(200);

    const depRes = await req(`/tasks/${taskCId}/dependencies`);
    const deps = await depRes.json();
    expect(deps.relates_to.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /projects/:id/dependency-graph blocked_task_ids includes blocked tasks", async () => {
    // taskB is blocked by taskA (which is still todo), so should appear in blocked_task_ids
    const res = await req(`/projects/${projectId}/dependency-graph`);
    const body = await res.json();
    expect(body.blocked_task_ids).toContain(taskBId);
  });
});

// ---------------------------------------------------------------------------
// Dependency Graph Status Filtering
// ---------------------------------------------------------------------------

describe("Dependency Graph Status Filtering", () => {
  let projectId: string;
  let taskAId: string; // todo — blocks taskB
  let taskBId: string; // in_progress — blocked by taskA
  let taskCId: string; // done — blocks taskD
  let taskDId: string; // todo — blocked by taskC (but taskC is done, so not actually blocked)

  beforeAll(async () => {
    const [project] = await ctx.projectService.create([{ title: "Dep Graph Filter Project" }]);
    projectId = project.id;

    // Create tasks — all default to "todo"
    const tasks = await ctx.taskService.create([
      { project_id: projectId, title: "Filter Task A" },
      { project_id: projectId, title: "Filter Task B" },
      { project_id: projectId, title: "Filter Task C" },
      { project_id: projectId, title: "Filter Task D" },
    ]);
    taskAId = tasks[0].id;
    taskBId = tasks[1].id;
    taskCId = tasks[2].id;
    taskDId = tasks[3].id;

    // Set statuses: B -> in_progress, C -> done
    await ctx.taskService.update([{ id: taskBId, status: "in_progress" }]);
    await ctx.taskService.update([{ id: taskCId, status: "done" }]);

    // A blocks B
    await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskAId, target_task_id: taskBId, dependency_type: "blocks" },
    ]);
    // C blocks D
    await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskCId, target_task_id: taskDId, dependency_type: "blocks" },
    ]);
    // B relates_to C
    await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskBId, target_task_id: taskCId, dependency_type: "relates_to" },
    ]);
  });

  it("GET /projects/:id/dependency-graph?status=todo returns only todo tasks", async () => {
    const res = await req(`/projects/${projectId}/dependency-graph?status=todo`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks.every((t: { status: string }) => t.status === "todo")).toBe(true);
    const taskIds = body.tasks.map((t: { id: string }) => t.id);
    expect(taskIds).toContain(taskAId);
    expect(taskIds).toContain(taskDId);
    expect(taskIds).not.toContain(taskBId);
    expect(taskIds).not.toContain(taskCId);
  });

  it("GET /projects/:id/dependency-graph?status=todo edges only connect visible tasks", async () => {
    const res = await req(`/projects/${projectId}/dependency-graph?status=todo`);
    const body = await res.json();
    const taskIds = new Set(body.tasks.map((t: { id: string }) => t.id));
    for (const edge of body.edges) {
      expect(taskIds.has(edge.source_task_id)).toBe(true);
      expect(taskIds.has(edge.target_task_id)).toBe(true);
    }
  });

  it("GET /projects/:id/dependency-graph?status=todo,in_progress returns tasks with either status", async () => {
    const res = await req(`/projects/${projectId}/dependency-graph?status=todo,in_progress`);
    expect(res.status).toBe(200);
    const body = await res.json();
    const statuses = new Set<string>(body.tasks.map((t: { status: string }) => t.status));
    for (const s of statuses) {
      expect(["todo", "in_progress"]).toContain(s);
    }
    const taskIds = body.tasks.map((t: { id: string }) => t.id);
    expect(taskIds).toContain(taskAId);
    expect(taskIds).toContain(taskBId);
    expect(taskIds).toContain(taskDId);
    expect(taskIds).not.toContain(taskCId);
  });

  it("GET /projects/:id/dependency-graph without status returns all tasks (backward compatible)", async () => {
    const res = await req(`/projects/${projectId}/dependency-graph`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks.length).toBe(4);
    const taskIds = body.tasks.map((t: { id: string }) => t.id);
    expect(taskIds).toContain(taskAId);
    expect(taskIds).toContain(taskBId);
    expect(taskIds).toContain(taskCId);
    expect(taskIds).toContain(taskDId);
    // All 3 edges should be present
    expect(body.edges.length).toBe(3);
  });

  it("blocked_task_ids reflects full graph even when status filter is active", async () => {
    const res = await req(`/projects/${projectId}/dependency-graph?status=todo`);
    const body = await res.json();
    // Task B is blocked by incomplete Task A (todo) — B should be in blocked_task_ids
    // even though B is not in the filtered task list (B is in_progress)
    expect(body.blocked_task_ids).toContain(taskBId);
    // Task D's only blocker (C) is done, so D should NOT be in blocked_task_ids
    expect(body.blocked_task_ids).not.toContain(taskDId);
  });
});

// ---------------------------------------------------------------------------
// Health Endpoint
// ---------------------------------------------------------------------------

describe("Health Endpoint", () => {
  it("GET /health returns 200 with expected shape", async () => {
    const res = await req("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
    expect(typeof body.uptime_seconds).toBe("number");
    expect(body.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(body.version).toBe(healthVersion);
    // Verify timestamp is ISO 8601
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
