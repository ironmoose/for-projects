import { Hono } from "hono";
import type {
  IProjectService,
  CreateProjectInput,
  UpdateProjectInput,
} from "../../domain";

export function projectRoutes(service: IProjectService): Hono {
  const app = new Hono();

  // GET /api/projects
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    return c.json(service.list({ limit, offset }));
  });

  // POST /api/projects
  app.post("/", async (c) => {
    const body = await c.req.json<{ items: CreateProjectInput[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: "items array is required" }, 400);
    const projects = service.create(body.items);
    return c.json(projects, 201);
  });

  // GET /api/projects/:id
  app.get("/:id", (c) => {
    return c.json(service.get(c.req.param("id")));
  });

  // PATCH /api/projects
  app.patch("/", async (c) => {
    const body = await c.req.json<{ items: UpdateProjectInput[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: "items array is required" }, 400);
    const projects = service.update(body.items);
    return c.json(projects);
  });

  // DELETE /api/projects
  app.delete("/", async (c) => {
    const body = await c.req.json<{ ids: string[] }>();
    if (!Array.isArray(body.ids)) return c.json({ error: "ids array is required" }, 400);
    service.remove(body.ids);
    return c.body(null, 204);
  });

  return app;
}
