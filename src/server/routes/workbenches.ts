import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  ServiceError,
  type IWorkbenchService,
  type CreateWorkbenchInput,
  type UpdateWorkbenchInput,
} from "../../domain";

export function workbenchRoutes(workbenchService: IWorkbenchService): Hono {
  const app = new Hono();

  // GET /api/workbenches
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    return c.json(workbenchService.findAll(limit, offset));
  });

  // POST /api/workbenches
  app.post("/", async (c) => {
    try {
      const { goal } = await c.req.json<CreateWorkbenchInput>();
      const workbench = workbenchService.create({ goal });
      return c.json(workbench, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // GET /api/workbenches/:id
  app.get("/:id", (c) => {
    const workbench = workbenchService.findById(c.req.param("id"));
    if (!workbench) return c.json({ error: "workbench not found" }, 404);
    return c.json(workbench);
  });

  // PATCH /api/workbenches/:id
  app.patch("/:id", async (c) => {
    try {
      const { goal } = await c.req.json<UpdateWorkbenchInput>();
      const workbench = workbenchService.update(c.req.param("id"), { goal });
      if (!workbench) return c.json({ error: "workbench not found" }, 404);
      return c.json(workbench);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE /api/workbenches/:id
  app.delete("/:id", (c) => {
    const deleted = workbenchService.delete(c.req.param("id"));
    if (!deleted) return c.json({ error: "workbench not found" }, 404);
    return c.json({ ok: true });
  });

  return app;
}
