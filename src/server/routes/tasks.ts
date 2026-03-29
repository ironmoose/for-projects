import { Hono } from "hono";
import type {
  ITaskService,
  TaskFilter,
  CreateTaskInput,
  UpdateTaskInput,
} from "../../domain";

export function taskRoutes(service: ITaskService): Hono {
  const app = new Hono();

  // GET /api/projects/:projectId/tasks
  app.get("/:projectId/tasks", (c) => {
    const projectId = c.req.param("projectId")!;
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 500) : 100;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const filter: TaskFilter = {};
    const status = c.req.query("status");
    if (status) filter.status = status;
    return c.json(service.findByProjectId(projectId, limit, offset, filter));
  });

  // POST /api/projects/:projectId/tasks
  app.post("/:projectId/tasks", async (c) => {
    const projectId = c.req.param("projectId")!;
    const { summary, context, status } = await c.req.json<Omit<CreateTaskInput, "project_id">>();
    const task = service.create({ project_id: projectId, summary, context, status });
    return c.json(task, 201);
  });

  // GET /api/projects/:projectId/tasks/:id
  app.get("/:projectId/tasks/:id", (c) => {
    const task = service.findById(c.req.param("id")!);
    if (!task) return c.json({ error: "task not found" }, 404);
    return c.json(task);
  });

  // PATCH /api/projects/:projectId/tasks/:id
  app.patch("/:projectId/tasks/:id", async (c) => {
    const { summary, context, status } = await c.req.json<UpdateTaskInput>();
    const task = service.update(c.req.param("id")!, { summary, context, status });
    if (!task) return c.json({ error: "task not found" }, 404);
    return c.json(task);
  });

  return app;
}
