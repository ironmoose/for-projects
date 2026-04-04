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
      const row = ctx.db.query("SELECT 1 AS ok").get() as { ok: number } | null;
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
      body: JSON.stringify({ items: [{ title: "Get Project", goal: "A goal", requirements: "Reqs", design: "Design" }] }),
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
      body: JSON.stringify({ items: [{ title: "Patch Project" }] }),
    });
    const [project] = await create.json();
    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: project.id, title: "Patched", goal: "New goal" }] }),
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
    const [p] = ctx.projectService.create([{ title: "Task Route Project" }]);
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
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Summary Check", plan: "P", description: "D", implementation: "I", acceptance_criteria: "AC" }] }),
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
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Patch task" }] }),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: task.id, title: "Patched", plan: "New plan" }] }),
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
      body: JSON.stringify({ items: [{
        project_id: projectId,
        title: "New Fields Task",
        description: "A description",
        implementation: "Some impl",
        acceptance_criteria: "It passes",
      }] }),
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
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Patch new fields" }] }),
    });
    const [task] = await create.json();
    const res = await req("/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: task.id, description: "Patched desc" }] }),
    });
    expect(res.status).toBe(200);
    const [body] = await res.json();
    expect(body.description).toBe("Patched desc");
  });

  it("GET /tasks/:id returns full task entity", async () => {
    const create = await req("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ project_id: projectId, title: "Get Task", description: "Full desc", plan: "Full plan" }] }),
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
  it("PATCH /projects with attach_documents includes documents in GET", async () => {
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

    // Attach document to project
    const patchRes = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: project.id, attach_documents: [doc.id] }] }),
    });
    expect(patchRes.status).toBe(200);

    // Verify GET includes the document
    const getRes = await req(`/projects/${project.id}`);
    const body = await getRes.json();
    expect(body.documents).toBeArray();
    expect(body.documents.length).toBe(1);
    expect(body.documents[0].id).toBe(doc.id);
  });

  it("PATCH /projects with detach_documents removes document", async () => {
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
      body: JSON.stringify({ items: [{ id: project.id, attach_documents: [doc.id] }] }),
    });

    // Detach
    const detachRes = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: project.id, detach_documents: [doc.id] }] }),
    });
    expect(detachRes.status).toBe(200);

    const getRes = await req(`/projects/${project.id}`);
    const body = await getRes.json();
    expect(body.documents).toBeArray();
    expect(body.documents.length).toBe(0);
  });

  it("PATCH /projects with conflicting attach/detach returns 400", async () => {
    const [project] = await (await req("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Conflict Test Project" }] }),
    })).json();
    const [doc] = await (await req("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ title: "Conflict Test Doc" }] }),
    })).json();

    const res = await req("/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{
        id: project.id,
        attach_documents: [doc.id],
        detach_documents: [doc.id],
      }] }),
    });
    expect(res.status).toBe(400);
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
    const [p] = ctx.projectService.create([{ title: "Enum Route Project" }]);
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
    const [project] = ctx.projectService.create([{ title: "Dep Endpoint Project" }]);
    projectId = project.id;
    const tasks = ctx.taskService.create([
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
    const [otherProject] = ctx.projectService.create([{ title: "Other Dep Project" }]);
    const [otherTask] = ctx.taskService.create([{ project_id: otherProject.id, title: "Other Task" }]);
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

  it("DELETE /projects/:id/dependencies with nonexistent edges is a no-op", async () => {
    const res = await req(`/projects/${projectId}/dependencies`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ source_task_id: taskAId, target_task_id: "00000000000000000000000000" }],
      }),
    });
    expect(res.status).toBe(204);
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
    const [project] = ctx.projectService.create([{ title: "Task Dep Route Project" }]);
    projectId = project.id;
    const tasks = ctx.taskService.create([
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
    ctx.taskDependencyService.addDependencies(projectId, [
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
    const [otherProject] = ctx.projectService.create([{ title: "Other Route Dep Project" }]);
    const [otherTask] = ctx.taskService.create([{ project_id: otherProject.id, title: "Other Route Task" }]);

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
    const [depA] = ctx.taskService.create([{ project_id: projectId, title: "CASCADE Source" }]);
    const [depB] = ctx.taskService.create([{ project_id: projectId, title: "CASCADE Target" }]);
    ctx.taskDependencyService.addDependencies(projectId, [
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
