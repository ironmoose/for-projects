import { Hono } from "hono";
import type {
  IAgentService,
  CreateAgentInput,
  UpdateAgentInput,
} from "../../domain";

interface AgentRouteContext {
  agentService: IAgentService;
}

export function agentRoutes(ctx: AgentRouteContext): Hono {
  const app = new Hono();
  const service = ctx.agentService;

  // GET /api/agents
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const identifier = c.req.query("identifier");
    const enabled = c.req.query("enabled");
    const filter: {
      identifier?: string;
      enabled?: boolean;
      limit: number;
      offset: number;
    } = { limit, offset };
    if (identifier) filter.identifier = identifier;
    if (enabled !== undefined && enabled !== null) filter.enabled = enabled === "true";
    return c.json(service.list(filter));
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
