import { Hono } from "hono";
import type {
  IJobService,
  CreateJobInput,
  UpdateJobInput,
} from "../../domain";

export function jobRoutes(service: IJobService): Hono {
  const app = new Hono();

  // GET /api/jobs
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const agent_id = c.req.query("agent_id");
    const status = c.req.query("status");
    const filter: { agent_id?: string; status?: string; limit: number; offset: number } = { limit, offset };
    if (agent_id) filter.agent_id = agent_id;
    if (status) filter.status = status;
    return c.json(service.list(filter));
  });

  // POST /api/jobs
  app.post("/", async (c) => {
    const body = await c.req.json<CreateJobInput[]>();
    const jobs = service.create(body);
    return c.json(jobs, 201);
  });

  // GET /api/jobs/:id
  app.get("/:id", (c) => {
    return c.json(service.get(c.req.param("id")));
  });

  // PATCH /api/jobs
  app.patch("/", async (c) => {
    const body = await c.req.json<UpdateJobInput[]>();
    const jobs = service.update(body);
    return c.json(jobs);
  });

  // DELETE /api/jobs
  app.delete("/", async (c) => {
    const { ids } = await c.req.json<{ ids: string[] }>();
    service.remove(ids);
    return c.body(null, 204);
  });

  return app;
}
