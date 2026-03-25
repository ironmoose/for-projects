import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ServiceError, type ITagService } from "../../domain";

export function tagRoutes(service: ITagService): Hono {
  const app = new Hono();

  // GET /api/tags
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 500) : 100;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    try {
      return c.json(service.findAll(limit, offset));
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST /api/tags
  app.post("/", async (c) => {
    try {
      const { name } = await c.req.json<{ name: string }>();
      const tag = service.create(name);
      return c.json(tag, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE /api/tags/:id
  app.delete("/:id", (c) => {
    try {
      const deleted = service.delete(c.req.param("id")!);
      if (!deleted) return c.json({ error: "tag not found" }, 404);
      return c.json({ ok: true });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // GET /api/tags/:name/tasks
  app.get("/:name/tasks", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 500) : 100;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    try {
      return c.json(service.findTasksByTag(c.req.param("name")!, limit, offset));
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  return app;
}
