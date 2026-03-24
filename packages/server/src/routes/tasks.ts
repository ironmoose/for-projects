import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  ServiceError,
  type ITaskService,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@alt-t4b/pm-domain";

export function taskRoutes(service: ITaskService): Hono {
  const app = new Hono();

  // GET /api/projects/:projectSlug/tasks
  app.get("/", (c) => {
    const projectSlug = c.req.param("projectSlug")!;
    try {
      return c.json(service.findByProjectSlug(projectSlug));
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST /api/projects/:projectSlug/tasks
  app.post("/", async (c) => {
    const projectSlug = c.req.param("projectSlug")!;
    const body = await c.req.json<CreateTaskInput>();
    try {
      const task = service.create(projectSlug, body);
      return c.json(task, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // PATCH /api/projects/:projectSlug/tasks/:id
  app.patch("/:id", async (c) => {
    const body = await c.req.json<UpdateTaskInput>();
    try {
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
