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
    const limit = Math.min(Number(c.req.query("limit")) || 50, 200);
    const offset = Math.max(Number(c.req.query("offset")) || 0, 0);
    const filter: ProjectFilter = {};
    const status = c.req.query("status");
    if (status && (PROJECT_STATUSES as readonly string[]).includes(status)) {
      filter.status = status as ProjectFilter["status"];
    }
    return c.json(service.findAll(limit, offset, filter));
  });

  // POST /api/projects
  app.post("/", async (c) => {
    const body = await c.req.json<CreateProjectInput>();
    try {
      const project = service.create(body);
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
    const body = await c.req.json<UpdateProjectInput>();
    try {
      const project = service.update(c.req.param("slug"), body);
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
