import { Hono } from "hono";
import type {
  ISessionService,
  CreateSessionInput,
  UpdateSessionInput,
} from "../../domain";

interface SessionRouteContext {
  sessionService: ISessionService;
}

export function sessionRoutes(ctx: SessionRouteContext): Hono {
  const app = new Hono();
  const service = ctx.sessionService;

  // GET /api/sessions
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const project_id = c.req.query("project_id");
    const filter: {
      project_id?: string;
      limit: number;
      offset: number;
    } = { limit, offset };
    if (project_id) filter.project_id = project_id;
    return c.json(service.list(filter));
  });

  // POST /api/sessions
  app.post("/", async (c) => {
    const body = await c.req.json<CreateSessionInput[]>();
    const entries = service.create(body);
    return c.json(entries, 201);
  });

  // GET /api/sessions/:id
  app.get("/:id", (c) => {
    return c.json(service.get(c.req.param("id")));
  });

  // PATCH /api/sessions
  app.patch("/", async (c) => {
    const body = await c.req.json<UpdateSessionInput[]>();
    const entries = service.update(body);
    return c.json(entries);
  });

  // DELETE /api/sessions
  app.delete("/", async (c) => {
    const { ids } = await c.req.json<{ ids: string[] }>();
    service.remove(ids);
    return c.body(null, 204);
  });

  return app;
}
