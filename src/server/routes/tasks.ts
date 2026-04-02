import { Hono } from "hono";
import type {
  ITaskService,
  CreateTaskInput,
  UpdateTaskInput,
} from "../../domain";

export function taskRoutes(service: ITaskService): Hono {
  const app = new Hono();

  // GET /api/tasks
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const project_id = c.req.query("project_id");
    const group_key = c.req.query("group_key");
    const status = c.req.query("status");
    const effort = c.req.query("effort");
    const impact = c.req.query("impact");
    const category = c.req.query("category");
    const title = c.req.query("title");
    const filter: { project_id?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string; title?: string; limit: number; offset: number } = { limit, offset };
    if (project_id) filter.project_id = project_id;
    if (group_key) filter.group_key = group_key;
    if (status) filter.status = status;
    if (effort) filter.effort = effort;
    if (impact) filter.impact = impact;
    if (category) filter.category = category;
    if (title) filter.title = title;
    return c.json(service.list(filter));
  });

  // POST /api/tasks
  app.post("/", async (c) => {
    const body = await c.req.json<{ items: CreateTaskInput[] }>();
    const tasks = service.create(body.items);
    return c.json(tasks, 201);
  });

  // GET /api/tasks/:id
  app.get("/:id", (c) => {
    return c.json(service.get(c.req.param("id")));
  });

  // PATCH /api/tasks
  app.patch("/", async (c) => {
    const body = await c.req.json<{ items: UpdateTaskInput[] }>();
    const tasks = service.update(body.items);
    return c.json(tasks);
  });

  // DELETE /api/tasks
  app.delete("/", async (c) => {
    const { ids } = await c.req.json<{ ids: string[] }>();
    service.remove(ids);
    return c.body(null, 204);
  });

  return app;
}
