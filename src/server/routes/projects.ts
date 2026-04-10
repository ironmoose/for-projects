import { Hono } from "hono";
import type {
  IProjectService,
  ITaskService,
  ITaskDependencyService,
  CreateProjectInput,
  UpdateProjectInput,
} from "../../domain";
import { validateDocumentsMergePatch } from "./validation";

export function projectRoutes(service: IProjectService, taskService?: ITaskService, depService?: ITaskDependencyService): Hono {
  const app = new Hono();

  // GET /api/projects
  app.get("/", async (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const filter: { limit: number; offset: number; title?: string } = { limit, offset };
    const title = c.req.query("title");
    if (title) filter.title = title;
    return c.json(await service.list(filter));
  });

  // POST /api/projects
  app.post("/", async (c) => {
    const body = await c.req.json<{ items: CreateProjectInput[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: "items array is required" }, 400);
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      if (item.documents !== undefined) {
        item.documents = validateDocumentsMergePatch(item.documents, i);
      }
    }
    const projects = await service.create(body.items);
    return c.json(projects, 201);
  });

  // GET /api/projects/:id/dependency-graph
  app.get("/:id/dependency-graph", async (c) => {
    if (!depService || !taskService) return c.json({ error: "dependency service not available" }, 500);
    const projectId = c.req.param("id");
    const rawStatus = c.req.query("status");
    const status = rawStatus ? rawStatus.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const { edges, blocked_task_ids } = await depService.getGraph(projectId, status);
    const tasks = await taskService.listGraphSummaries(projectId, status);
    return c.json({
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
      edges,
      blocked_task_ids,
    });
  });

  // POST /api/projects/:id/dependencies
  app.post("/:id/dependencies", async (c) => {
    if (!depService) return c.json({ error: "dependency service not available" }, 500);
    const projectId = c.req.param("id");
    const body = await c.req.json<{ items: { source_task_id: string; target_task_id: string; dependency_type: string }[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: "items array is required" }, 400);
    const results = await depService.addDependencies(projectId, body.items);
    return c.json(results, 201);
  });

  // DELETE /api/projects/:id/dependencies
  app.delete("/:id/dependencies", async (c) => {
    if (!depService) return c.json({ error: "dependency service not available" }, 500);
    const projectId = c.req.param("id");
    const body = await c.req.json<{ items: { source_task_id: string; target_task_id: string }[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: "items array is required" }, 400);
    await depService.removeDependencies(projectId, body.items);
    return c.body(null, 204);
  });

  // GET /api/projects/:id
  app.get("/:id", async (c) => {
    return c.json(await service.get(c.req.param("id")));
  });

  // PATCH /api/projects
  app.patch("/", async (c) => {
    const body = await c.req.json<{ items: UpdateProjectInput[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: "items array is required" }, 400);
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      if (item.documents !== undefined) {
        item.documents = validateDocumentsMergePatch(item.documents, i);
      }
    }
    const projects = await service.update(body.items);
    return c.json(projects);
  });

  // DELETE /api/projects
  app.delete("/", async (c) => {
    const body = await c.req.json<{ ids: string[] }>();
    if (!Array.isArray(body.ids)) return c.json({ error: "ids array is required" }, 400);
    await service.remove(body.ids);
    return c.body(null, 204);
  });

  return app;
}
