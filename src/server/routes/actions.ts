import { Hono } from "hono";
import type {
  IActionService,
  UpdateActionInput,
  ActionStatus,
} from "../../domain";

export function actionRoutes(service: IActionService): Hono {
  const app = new Hono();

  // GET /api/actions/dashboard — dashboard data (static, must be before /:id)
  app.get("/dashboard", (c) => {
    const data = service.getDashboardData();
    return c.json(data);
  });

  // GET /api/actions/:target/plan — action plan grouped by rank
  app.get("/:target/plan", (c) => {
    const target = c.req.param("target");
    const plan = service.getActionPlan(target);
    return c.json({ data: plan });
  });

  // PATCH /api/actions/:id/status — status transition
  app.patch("/:id/status", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{ status: string }>();

    if (!body.status) {
      return c.json({ error: "status field is required" }, 400);
    }

    const validStatuses = ["todo", "in_progress", "complete", "failed"];
    if (!validStatuses.includes(body.status)) {
      return c.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        400,
      );
    }

    const updated = service.updateStatus(id, body.status as ActionStatus);
    return c.json(updated);
  });

  // GET /api/actions?target={arn}&status={status}
  app.get("/", (c) => {
    const target = c.req.query("target");
    if (!target)
      return c.json({ error: "target query parameter is required" }, 400);
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset =
      Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const status = c.req.query("status");
    return c.json(service.findByTarget(target, limit, offset, status));
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
      actions: { rank: number; prompt?: string; agent?: string }[];
    }>();
    if (!target || !actions || !Array.isArray(actions)) {
      return c.json({ error: "target and actions array are required" }, 400);
    }
    const created = service.createMany(target, actions);
    return c.json({ data: created }, 201);
  });

  // PATCH /api/actions — bulk update
  app.patch("/", async (c) => {
    const { target, actions } = await c.req.json<{
      target: string;
      actions: UpdateActionInput[];
    }>();
    if (!target || !actions || !Array.isArray(actions)) {
      return c.json({ error: "target and actions array are required" }, 400);
    }
    const updated = service.updateMany(target, actions);
    return c.json({ data: updated });
  });

  // DELETE /api/actions — bulk delete
  app.delete("/", async (c) => {
    const { target, ids } = await c.req.json<{
      target: string;
      ids: string[];
    }>();
    if (!target || !ids || !Array.isArray(ids)) {
      return c.json({ error: "target and ids array are required" }, 400);
    }
    const count = service.deleteMany(target, ids);
    return c.json({ deleted: count });
  });

  return app;
}
