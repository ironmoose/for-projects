import { Hono } from "hono";
import type {
  IEntityActionService,
  CreateEntityActionInput,
  ActionStatus,
  EntityType,
  ActionRole,
} from "../../domain";

export function entityActionRoutes(service: IEntityActionService): Hono {
  const app = new Hono();

  // POST /api/entity-actions — link an action to an entity
  app.post("/", async (c) => {
    const { entity_type, entity_id, role, action_id, status } =
      await c.req.json<CreateEntityActionInput>();
    const ea = service.link({
      entity_type,
      entity_id,
      role,
      action_id,
      status,
    } as CreateEntityActionInput);
    return c.json(ea, 201);
  });

  // GET /api/entity-actions/:entity_type/:entity_id — list actions for entity
  app.get("/:entity_type/:entity_id", (c) => {
    const entity_type = c.req.param("entity_type") as EntityType;
    const entity_id = c.req.param("entity_id");
    return c.json(service.findByEntity(entity_type, entity_id));
  });

  // GET /api/entity-actions/:entity_type/:entity_id/:role — single entity-action
  app.get("/:entity_type/:entity_id/:role", (c) => {
    const entity_type = c.req.param("entity_type") as EntityType;
    const entity_id = c.req.param("entity_id");
    const role = c.req.param("role") as ActionRole;
    const ea = service.findByEntityAndRole(entity_type, entity_id, role);
    if (!ea) return c.json({ error: "entity-action not found" }, 404);
    return c.json(ea);
  });

  // PATCH /api/entity-actions/:entity_type/:entity_id/:role/status — update status
  app.patch("/:entity_type/:entity_id/:role/status", async (c) => {
    const entity_type = c.req.param("entity_type") as EntityType;
    const entity_id = c.req.param("entity_id");
    const role = c.req.param("role") as ActionRole;
    const { status } = await c.req.json<{ status: ActionStatus }>();
    const ea = service.updateStatus(entity_type, entity_id, role, status);
    return c.json(ea);
  });

  // PATCH /api/entity-actions/:entity_type/:entity_id/:role — update output
  app.patch("/:entity_type/:entity_id/:role", async (c) => {
    const entity_type = c.req.param("entity_type") as EntityType;
    const entity_id = c.req.param("entity_id");
    const role = c.req.param("role") as ActionRole;
    const { output } = await c.req.json<{ output: string | null }>();
    const ea = service.updateOutput(entity_type, entity_id, role, output);
    return c.json(ea);
  });

  // DELETE /api/entity-actions/:entity_type/:entity_id/:role — unlink
  app.delete("/:entity_type/:entity_id/:role", (c) => {
    const entity_type = c.req.param("entity_type") as EntityType;
    const entity_id = c.req.param("entity_id");
    const role = c.req.param("role") as ActionRole;
    const deleted = service.unlink(entity_type, entity_id, role);
    if (!deleted) return c.json({ error: "entity-action not found" }, 404);
    return c.body(null, 204);
  });

  return app;
}
