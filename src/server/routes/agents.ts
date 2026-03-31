import { Hono } from "hono";
import type {
  IAgentService,
  CreateAgentInput,
  UpdateAgentInput,
} from "../../domain";

export function agentRoutes(service: IAgentService): Hono {
  const app = new Hono();

  // GET /api/agents
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    return c.json(service.list({ limit, offset }));
  });

  // POST /api/agents
  app.post("/", async (c) => {
    const body = await c.req.json<CreateAgentInput[]>();
    const agents = service.create(body);
    return c.json(agents, 201);
  });

  // GET /api/agents/:id
  app.get("/:id", (c) => {
    return c.json(service.get(c.req.param("id")));
  });

  // PATCH /api/agents
  app.patch("/", async (c) => {
    const body = await c.req.json<UpdateAgentInput[]>();
    const agents = service.update(body);
    return c.json(agents);
  });

  // DELETE /api/agents
  app.delete("/", async (c) => {
    const { ids } = await c.req.json<{ ids: string[] }>();
    service.remove(ids);
    return c.body(null, 204);
  });

  return app;
}
