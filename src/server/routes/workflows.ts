import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  ServiceError,
  type IWorkflowService,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type WorkflowStatus,
} from "../../domain";

export function workflowRoutes(workflowService: IWorkflowService): Hono {
  const app = new Hono();

  // GET /api/workflows
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const status = c.req.query("status") || undefined;
    const filter = status ? { status: status as WorkflowStatus } : undefined;
    return c.json(workflowService.findAll(limit, offset, filter));
  });

  // POST /api/workflows
  app.post("/", async (c) => {
    try {
      const { goal, cursor, status } = await c.req.json<CreateWorkflowInput>();
      const workflow = workflowService.create({ goal, cursor, status });
      return c.json(workflow, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // GET /api/workflows/:id
  app.get("/:id", (c) => {
    const workflow = workflowService.findById(c.req.param("id"));
    if (!workflow) return c.json({ error: "workflow not found" }, 404);
    return c.json(workflow);
  });

  // PATCH /api/workflows/:id
  app.patch("/:id", async (c) => {
    try {
      const { goal, cursor, status } = await c.req.json<UpdateWorkflowInput>();
      const workflow = workflowService.update(c.req.param("id"), { goal, cursor, status });
      if (!workflow) return c.json({ error: "workflow not found" }, 404);
      return c.json(workflow);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE /api/workflows/:id
  app.delete("/:id", (c) => {
    const deleted = workflowService.delete(c.req.param("id"));
    if (!deleted) return c.json({ error: "workflow not found" }, 404);
    return c.json({ ok: true });
  });

  return app;
}
