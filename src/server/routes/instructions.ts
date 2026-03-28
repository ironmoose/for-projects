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
 * Instruction + binding routes, mounted at
 * `/api/workflows/:workflowId/phases/:phaseId/instructions`.
 */
export function instructionRoutes(
  instructionService: IInstructionService,
  bindingService: IInstructionBindingService,
): Hono {
  const app = new Hono();

  /** Extract the phase ID injected by the parent route mount. */
  const phId = (c: { req: { param: (name: string) => string | undefined } }): string =>
    c.req.param("phaseId") as string;

  // -- Instructions ---------------------------------------------------------

  // GET .../instructions
  app.get("/", (c) => {
    try {
      const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
      const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
      const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
      return c.json(instructionService.findByPhase(phId(c), limit, offset));
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST .../instructions
  app.post("/", async (c) => {
    try {
      const { prompt, agent } = await c.req.json<CreateInstructionInput>();
      const instruction = instructionService.create(phId(c), { prompt, agent });
      return c.json(instruction, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // GET .../instructions/:instructionId
  app.get("/:instructionId", (c) => {
    try {
      const instruction = instructionService.findById(phId(c), c.req.param("instructionId"));
      if (!instruction) return c.json({ error: "instruction not found" }, 404);
      return c.json(instruction);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // PATCH .../instructions/:instructionId
  app.patch("/:instructionId", async (c) => {
    try {
      const { prompt, output, agent } = await c.req.json<UpdateInstructionInput>();
      const instruction = instructionService.update(
        phId(c),
        c.req.param("instructionId"),
        { prompt, output, agent },
      );
      if (!instruction) return c.json({ error: "instruction not found" }, 404);
      return c.json(instruction);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE .../instructions/:instructionId
  app.delete("/:instructionId", (c) => {
    try {
      const deleted = instructionService.delete(phId(c), c.req.param("instructionId"));
      if (!deleted) return c.json({ error: "instruction not found" }, 404);
      return c.json({ ok: true });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // -- Bindings -------------------------------------------------------------

  // GET .../instructions/:instructionId/bindings
  app.get("/:instructionId/bindings", (c) => {
    try {
      return c.json({ data: bindingService.findByInstruction(c.req.param("instructionId")) });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST .../instructions/:instructionId/bindings
  app.post("/:instructionId/bindings", async (c) => {
    try {
      const { arn } = await c.req.json<CreateInstructionBindingInput>();
      const binding = bindingService.create(c.req.param("instructionId"), { arn });
      return c.json(binding, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE .../instructions/:instructionId/bindings/:bindingId
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
