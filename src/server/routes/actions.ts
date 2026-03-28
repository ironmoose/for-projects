import { Hono } from "hono";
import type {
  IActionService,
  UpdateActionInput,
} from "../../domain";

export function actionRoutes(service: IActionService): Hono {
  const app = new Hono();

  // GET /api/actions?target={arn}
  app.get("/", (c) => {
    const target = c.req.query("target");
    if (!target) return c.json({ error: "target query parameter is required" }, 400);
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    return c.json(service.findByTarget(target, limit, offset));
  });

  // GET /api/actions/:id
  app.get("/:id", (c) => {
    const action = service.findById(c.req.param("id"));
    if (!action) return c.json({ error: "action not found" }, 404);
    return c.json(action);
  });

  // POST /api/actions — bulk create
  app.post("/", async (c) => {
    const { target, actions } = await c.req.json<{
      target: string;
      actions: { rank: number; prompt?: string; agent?: string; template_id?: string }[];
    }>();
    const created = service.createMany(target, actions);
    return c.json({ data: created }, 201);
  });

  // PATCH /api/actions — bulk update
  app.patch("/", async (c) => {
    const { target, actions } = await c.req.json<{
      target: string;
      actions: UpdateActionInput[];
    }>();
    const updated = service.updateMany(target, actions);
    return c.json({ data: updated });
  });

  // DELETE /api/actions — bulk delete
  app.delete("/", async (c) => {
    const { target, ids } = await c.req.json<{
      target: string;
      ids: string[];
    }>();
    const count = service.deleteMany(target, ids);
    return c.json({ deleted: count });
  });

  return app;
}
