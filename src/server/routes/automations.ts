import { Hono } from "hono";
import type {
  IAutomationService,
  CreateAutomationInput,
  UpdateAutomationInput,
} from "../../domain";

export function automationRoutes(service: IAutomationService): Hono {
  const app = new Hono();

  // GET /api/automations
  app.get("/", async (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const title = c.req.query("title");
    const category = c.req.query("category");
    const tag = c.req.query("tag");
    const rawFav = c.req.query("is_favorite");
    const is_favorite = rawFav === "true" ? true : rawFav === "false" ? false : undefined;
    const filter: { title?: string; category?: string; is_favorite?: boolean; tag?: string; limit: number; offset: number } = { limit, offset };
    if (title) filter.title = title;
    if (category) filter.category = category;
    if (is_favorite !== undefined) filter.is_favorite = is_favorite;
    if (tag) filter.tag = tag;
    return c.json(await service.list(filter));
  });

  // POST /api/automations
  app.post("/", async (c) => {
    const body = await c.req.json<{ items: CreateAutomationInput[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: "items array is required" }, 400);
    const automations = await service.create(body.items);
    return c.json(automations, 201);
  });

  // GET /api/automations/:id
  app.get("/:id", async (c) => {
    return c.json(await service.get(c.req.param("id")));
  });

  // PATCH /api/automations
  app.patch("/", async (c) => {
    const body = await c.req.json<{ items: UpdateAutomationInput[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: "items array is required" }, 400);
    const automations = await service.update(body.items);
    return c.json(automations);
  });

  // DELETE /api/automations
  app.delete("/", async (c) => {
    const body = await c.req.json<{ ids?: string[] }>();
    if (!Array.isArray(body.ids)) return c.json({ error: "ids array is required" }, 400);
    await service.remove(body.ids);
    return c.body(null, 204);
  });

  return app;
}
