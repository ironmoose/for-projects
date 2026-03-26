import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  ServiceError,
  type IInstructionService,
  type IInstructionBindingService,
  type CreateInstructionInput,
  type UpdateInstructionInput,
  type CreateInstructionBindingInput,
} from "../../domain";

/**
 * Instruction + binding routes, mounted at `/api/workbenches/:id/instructions`.
 *
 * The parent `:id` param (workbench ID) is provided by the mount path but isn't
 * in this Hono instance's type scope, so we extract it via a helper.
 */
export function instructionRoutes(
  instructionService: IInstructionService,
  bindingService: IInstructionBindingService,
): Hono {
  const app = new Hono();

  /** Extract the workbench ID injected by the parent route mount. */
  const wbId = (c: { req: { param: (name: string) => string | undefined } }): string =>
    c.req.param("id") as string;

  // ── Instructions ───────────────────────────────────────────────────

  // GET /api/workbenches/:id/instructions
  app.get("/", (c) => {
    try {
      const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
      const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
      const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
      return c.json(instructionService.findByWorkbench(wbId(c), limit, offset));
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST /api/workbenches/:id/instructions
  app.post("/", async (c) => {
    try {
      const { prompt, position } = await c.req.json<CreateInstructionInput>();
      const instruction = instructionService.create(wbId(c), { prompt, position });
      return c.json(instruction, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST /api/workbenches/:id/instructions/reorder
  app.post("/reorder", async (c) => {
    try {
      const { instruction_ids } = await c.req.json<{ instruction_ids: string[] }>();
      if (!Array.isArray(instruction_ids)) {
        return c.json({ error: "instruction_ids must be an array" }, 400);
      }
      const instructions = instructionService.reorder(wbId(c), instruction_ids);
      return c.json({ data: instructions });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // GET /api/workbenches/:id/instructions/:instructionId
  app.get("/:instructionId", (c) => {
    try {
      const instruction = instructionService.findById(wbId(c), c.req.param("instructionId"));
      if (!instruction) return c.json({ error: "instruction not found" }, 404);
      return c.json(instruction);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // PATCH /api/workbenches/:id/instructions/:instructionId
  app.patch("/:instructionId", async (c) => {
    try {
      const { prompt, output } = await c.req.json<UpdateInstructionInput>();
      const instruction = instructionService.update(
        wbId(c),
        c.req.param("instructionId"),
        { prompt, output },
      );
      if (!instruction) return c.json({ error: "instruction not found" }, 404);
      return c.json(instruction);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE /api/workbenches/:id/instructions/:instructionId
  app.delete("/:instructionId", (c) => {
    try {
      const deleted = instructionService.delete(wbId(c), c.req.param("instructionId"));
      if (!deleted) return c.json({ error: "instruction not found" }, 404);
      return c.json({ ok: true });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // ── Bindings ───────────────────────────────────────────────────────

  // GET /api/workbenches/:id/instructions/:instructionId/bindings
  app.get("/:instructionId/bindings", (c) => {
    try {
      return c.json({ data: bindingService.findByInstruction(c.req.param("instructionId")) });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST /api/workbenches/:id/instructions/:instructionId/bindings
  app.post("/:instructionId/bindings", async (c) => {
    try {
      const { arn, kind } = await c.req.json<CreateInstructionBindingInput>();
      const binding = bindingService.create(c.req.param("instructionId"), { arn, kind });
      return c.json(binding, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE /api/workbenches/:id/instructions/:instructionId/bindings/:bindingId
  app.delete("/:instructionId/bindings/:bindingId", (c) => {
    try {
      const deleted = bindingService.delete(c.req.param("instructionId"), c.req.param("bindingId"));
      if (!deleted) return c.json({ error: "binding not found" }, 404);
      return c.json({ ok: true });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  return app;
}
