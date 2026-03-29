import { Hono } from "hono";
import type {
  IProjectService,
  ProjectFilter,
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
    const filter: ProjectFilter = {};
    const status = c.req.query("status");
    if (status) filter.status = status;
    return c.json(service.findAll(limit, offset, filter));
  });

  // POST /api/projects
  app.post("/", async (c) => {
    const { name, description, status } = await c.req.json<CreateProjectInput>();
    const project = service.create({ name, description, status });
    return c.json(project, 201);
  });

  // GET /api/projects/:id
  app.get("/:id", (c) => {
    const project = service.findById(c.req.param("id"));
    if (!project) return c.json({ error: "project not found" }, 404);
    return c.json(project);
  });

  // PATCH /api/projects/:id
  app.patch("/:id", async (c) => {
    const { name, description, status } = await c.req.json<UpdateProjectInput>();
    const project = service.update(c.req.param("id"), { name, description, status });
    if (!project) return c.json({ error: "project not found" }, 404);
    return c.json(project);
  });

  return app;
}
