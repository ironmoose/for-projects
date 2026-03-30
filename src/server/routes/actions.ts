import { Hono } from "hono";
import type {
  IActionService,
  CreateActionInput,
  UpdateActionInput,
} from "../../domain";

export function actionRoutes(service: IActionService): Hono {
  const app = new Hono();

  // GET /api/actions
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const kind = c.req.query("kind");
    const filter: { kind?: string; limit: number; offset: number } = { limit, offset };
    if (kind) filter.kind = kind;
    return c.json(service.list(filter));
  });

  // POST /api/actions
  app.post("/", async (c) => {
    const body = await c.req.json<CreateActionInput[]>();
    const actions = service.create(body);
    return c.json(actions, 201);
  });

  // GET /api/actions/:id
  app.get("/:id", (c) => {
    return c.json(service.get(c.req.param("id")));
  });

  // PATCH /api/actions
  app.patch("/", async (c) => {
    const body = await c.req.json<UpdateActionInput[]>();
    const actions = service.update(body);
    return c.json(actions);
  });

  // DELETE /api/actions
  app.delete("/", async (c) => {
    const { ids } = await c.req.json<{ ids: string[] }>();
    service.remove(ids);
    return c.body(null, 204);
  });

  return app;
}
