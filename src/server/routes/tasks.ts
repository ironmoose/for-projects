import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  ServiceError,
  TASK_STATUSES,
  type ITaskService,
  type TaskFilter,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "../../domain";

export function taskRoutes(service: ITaskService): Hono {
  const app = new Hono();

  // GET /api/projects/:projectSlug/tasks
  app.get("/", (c) => {
    const projectSlug = c.req.param("projectSlug")!;
    const limit = Math.min(Number(c.req.query("limit")) || 100, 500);
    const offset = Math.max(Number(c.req.query("offset")) || 0, 0);
    const filter: TaskFilter = {};
    const status = c.req.query("status");
    if (status && (TASK_STATUSES as readonly string[]).includes(status)) {
      filter.status = status as TaskFilter["status"];
    }
    try {
      return c.json(service.findByProjectSlug(projectSlug, limit, offset, filter));
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST /api/projects/:projectSlug/tasks
  app.post("/", async (c) => {
    const projectSlug = c.req.param("projectSlug")!;
    try {
      const body = await c.req.json<CreateTaskInput>();
      const task = service.create(projectSlug, body);
      return c.json(task, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // PATCH /api/projects/:projectSlug/tasks/:id
  app.patch("/:id", async (c) => {
    try {
      const body = await c.req.json<UpdateTaskInput>();
      const task = service.update(c.req.param("id")!, body);
      if (!task) return c.json({ error: "task not found" }, 404);
      return c.json(task);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE /api/projects/:projectSlug/tasks/:id
  app.delete("/:id", (c) => {
    const deleted = service.delete(c.req.param("id")!);
    if (!deleted) return c.json({ error: "task not found" }, 404);
    return c.json({ ok: true });
  });

  return app;
}
