import { Hono } from "hono";
import type { IActionService } from "../../domain";

export function actionRoutes(service: IActionService): Hono {
  const app = new Hono();

  // POST /api/actions — create single action
  app.post("/", async (c) => {
    const { prompt, agent } = await c.req.json<{
      prompt?: string;
      agent?: string;
    }>();
    if (!prompt) return c.json({ error: "prompt is required" }, 400);
    const action = service.create({ prompt, agent });
    return c.json(action, 201);
  });

  // GET /api/actions — list actions (paginated, optional filters)
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset =
      Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const status = c.req.query("status");
    const agent = c.req.query("agent");
    const filter: Record<string, string> = {};
    if (status) filter.status = status;
    if (agent) filter.agent = agent;
    return c.json(
      service.findAll(
        limit,
        offset,
        Object.keys(filter).length ? filter : undefined,
      ),
    );
  });

  // GET /api/actions/:id — single action
  app.get("/:id", (c) => {
    const action = service.findById(c.req.param("id"));
    if (!action) return c.json({ error: "action not found" }, 404);
    return c.json(action);
  });

  // PATCH /api/actions/:id/status — status transition
  app.patch("/:id/status", async (c) => {
    const { status } = await c.req.json<{ status?: string }>();
    if (!status) return c.json({ error: "status is required" }, 400);
    const updated = service.updateStatus(c.req.param("id"), status as any);
    if (!updated) return c.json({ error: "action not found" }, 404);
    return c.json(updated);
  });

  // PATCH /api/actions/:id — update action fields
  app.patch("/:id", async (c) => {
    const { prompt, agent, output } = await c.req.json<{
      prompt?: string;
      agent?: string;
      output?: string;
    }>();
    const updated = service.update(c.req.param("id"), {
      prompt,
      agent,
      output,
    });
    if (!updated) return c.json({ error: "action not found" }, 404);
    return c.json(updated);
  });

  return app;
}
