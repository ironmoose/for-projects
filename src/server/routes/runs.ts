import { Hono } from "hono";
import type {
  IRunService,
  CreateRunInput,
  UpdateRunInput,
} from "../../domain";

interface RunRouteContext {
  runService: IRunService;
}

export function runRoutes(ctx: RunRouteContext): Hono {
  const app = new Hono();
  const service = ctx.runService;

  // GET /api/runs
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const entity_type = c.req.query("entity_type");
    const entity_id = c.req.query("entity_id");
    const agent = c.req.query("agent");
    const status = c.req.query("status");
    const search = c.req.query("search");
    const started_after = c.req.query("started_after");
    const started_before = c.req.query("started_before");
    const finished_after = c.req.query("finished_after");
    const agent_identifier = c.req.query("agent_identifier");
    const filter: {
      entity_type?: string;
      entity_id?: string;
      agent?: string;
      status?: string;
      search?: string;
      started_after?: string;
      started_before?: string;
      finished_after?: string;
      agent_identifier?: string;
      limit: number;
      offset: number;
    } = { limit, offset };
    if (entity_type) filter.entity_type = entity_type;
    if (entity_id) filter.entity_id = entity_id;
    if (agent) filter.agent = agent;
    if (status) filter.status = status;
    if (search) filter.search = search;
    if (started_after) filter.started_after = started_after;
    if (started_before) filter.started_before = started_before;
    if (finished_after) filter.finished_after = finished_after;
    if (agent_identifier) filter.agent_identifier = agent_identifier;
    return c.json(service.list(filter));
  });

  // POST /api/runs
  app.post("/", async (c) => {
    const body = await c.req.json<CreateRunInput[]>();
    const entries = service.create(body);
    return c.json(entries, 201);
  });

  // GET /api/runs/stats
  app.get("/stats", (c) => {
    const rawDays = parseInt(c.req.query("days") ?? "", 10);
    const days = Number.isFinite(rawDays) && rawDays >= 1 ? Math.min(rawDays, 365) : 30;
    return c.json(service.stats(days));
  });

  // GET /api/runs/:id
  app.get("/:id", (c) => {
    return c.json(service.get(c.req.param("id")));
  });

  // PATCH /api/runs
  app.patch("/", async (c) => {
    const body = await c.req.json<UpdateRunInput[]>();
    const entries = service.update(body);
    return c.json(entries);
  });

  // DELETE /api/runs
  app.delete("/", async (c) => {
    const { ids } = await c.req.json<{ ids: string[] }>();
    service.remove(ids);
    return c.body(null, 204);
  });

  return app;
}
