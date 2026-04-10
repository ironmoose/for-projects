import { Hono } from "hono";
import type { IActivityLogService } from "../../domain";

export function activityLogRoutes(service: IActivityLogService): Hono {
  const app = new Hono();

  // GET /api/activity-log
  app.get("/", async (c) => {
    const entity_type = c.req.query("entity_type");
    const entity_id = c.req.query("entity_id");
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const filter: { entity_type?: string; entity_id?: string; limit: number; offset: number } = { limit, offset };
    if (entity_type) filter.entity_type = entity_type;
    if (entity_id) filter.entity_id = entity_id;

    return c.json(await service.list(filter));
  });

  return app;
}
