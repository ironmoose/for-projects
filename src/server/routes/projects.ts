import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  ServiceError,
  PROJECT_STATUSES,
  type IProjectService,
  type ProjectFilter,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "../../domain";

export function projectRoutes(service: IProjectService): Hono {
  const app = new Hono();

  // GET /api/projects
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const filter: ProjectFilter = {};
    const status = c.req.query("status");
    if (status && (PROJECT_STATUSES as readonly string[]).includes(status)) {
      filter.status = status as ProjectFilter["status"];
    }
    return c.json(service.findAll(limit, offset, filter));
  });

  // POST /api/projects
  app.post("/", async (c) => {
    try {
      const { name, slug, description, status } = await c.req.json<CreateProjectInput>();
      const project = service.create({ name, slug, description, status });
      return c.json(project, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // GET /api/projects/:slug
  app.get("/:slug", (c) => {
    const project = service.findBySlug(c.req.param("slug"));
    if (!project) return c.json({ error: "project not found" }, 404);
    return c.json(project);
  });

  // PATCH /api/projects/:slug
  app.patch("/:slug", async (c) => {
    try {
      const { name, description, status } = await c.req.json<UpdateProjectInput>();
      const project = service.update(c.req.param("slug"), { name, description, status });
      if (!project) return c.json({ error: "project not found" }, 404);
      return c.json(project);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE /api/projects/:slug
  app.delete("/:slug", (c) => {
    const deleted = service.delete(c.req.param("slug"));
    if (!deleted) return c.json({ error: "project not found" }, 404);
    return c.json({ ok: true });
  });

  return app;
}
