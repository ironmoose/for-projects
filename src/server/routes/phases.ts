import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  ServiceError,
  type IPhaseService,
  type CreatePhaseInput,
  type UpdatePhaseInput,
} from "../../domain";

export function phaseRoutes(phaseService: IPhaseService): Hono {
  const app = new Hono();

  /** Extract the workflow ID injected by the parent route mount. */
  const wfId = (c: { req: { param: (name: string) => string | undefined } }): string =>
    c.req.param("workflowId") as string;

  // GET /api/workflows/:workflowId/phases
  app.get("/", (c) => {
    try {
      const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
      const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
      const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
      return c.json(phaseService.findByWorkflow(wfId(c), limit, offset));
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST /api/workflows/:workflowId/phases
  app.post("/", async (c) => {
    try {
      const { title, position } = await c.req.json<CreatePhaseInput>();
      const phase = phaseService.create(wfId(c), { title, position });
      return c.json(phase, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST /api/workflows/:workflowId/phases/reorder
  app.post("/reorder", async (c) => {
    try {
      const { phase_ids } = await c.req.json<{ phase_ids: string[] }>();
      if (!Array.isArray(phase_ids)) {
        return c.json({ error: "phase_ids must be an array" }, 400);
      }
      const phases = phaseService.reorder(wfId(c), phase_ids);
      return c.json({ data: phases });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // GET /api/workflows/:workflowId/phases/:phaseId
  app.get("/:phaseId", (c) => {
    try {
      const phase = phaseService.findById(wfId(c), c.req.param("phaseId"));
      if (!phase) return c.json({ error: "phase not found" }, 404);
      return c.json(phase);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // PATCH /api/workflows/:workflowId/phases/:phaseId
  app.patch("/:phaseId", async (c) => {
    try {
      const { title } = await c.req.json<UpdatePhaseInput>();
      const phase = phaseService.update(wfId(c), c.req.param("phaseId"), { title });
      if (!phase) return c.json({ error: "phase not found" }, 404);
      return c.json(phase);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE /api/workflows/:workflowId/phases/:phaseId
  app.delete("/:phaseId", (c) => {
    try {
      const deleted = phaseService.delete(wfId(c), c.req.param("phaseId"));
      if (!deleted) return c.json({ error: "phase not found" }, 404);
      return c.json({ ok: true });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  return app;
}
