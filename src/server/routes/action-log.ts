import { Hono } from "hono";
import type {
  IActionLogService,
  CreateActionLogInput,
  UpdateActionLogInput,
} from "../../domain";

export function actionLogRoutes(service: IActionLogService): Hono {
  const app = new Hono();

  // GET /api/action-log
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const entity_type = c.req.query("entity_type");
    const entity_id = c.req.query("entity_id");
    const action_id = c.req.query("action_id");
    const status = c.req.query("status");
    const started_after = c.req.query("started_after");
    const finished_after = c.req.query("finished_after");
    const filter: {
      entity_type?: string;
      entity_id?: string;
      action_id?: string;
      status?: string;
      started_after?: string;
      finished_after?: string;
      limit: number;
      offset: number;
    } = { limit, offset };
    if (entity_type) filter.entity_type = entity_type;
    if (entity_id) filter.entity_id = entity_id;
    if (action_id) filter.action_id = action_id;
    if (status) filter.status = status;
    if (started_after) filter.started_after = started_after;
    if (finished_after) filter.finished_after = finished_after;
    return c.json(service.list(filter));
  });

  // POST /api/action-log
  app.post("/", async (c) => {
    const body = await c.req.json<CreateActionLogInput[]>();
    const entries = service.create(body);
    return c.json(entries, 201);
  });

  // GET /api/action-log/:id
  app.get("/:id", (c) => {
    return c.json(service.get(c.req.param("id")));
  });

  // PATCH /api/action-log
  app.patch("/", async (c) => {
    const body = await c.req.json<UpdateActionLogInput[]>();
    const entries = service.update(body);
    return c.json(entries);
  });

  return app;
}
