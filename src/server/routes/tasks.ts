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
    const filter: { project_id?: string; limit: number; offset: number } = { limit, offset };
    if (project_id) filter.project_id = project_id;
    return c.json(service.list(filter));
  });

  // POST /api/tasks
  app.post("/", async (c) => {
    const body = await c.req.json<CreateTaskInput[]>();
    const tasks = service.create(body);
    return c.json(tasks, 201);
  });

  // GET /api/tasks/:id
  app.get("/:id", (c) => {
    return c.json(service.get(c.req.param("id")));
  });

  // PATCH /api/tasks
  app.patch("/", async (c) => {
    const body = await c.req.json<UpdateTaskInput[]>();
    const tasks = service.update(body);
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
