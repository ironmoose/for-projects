import { Hono } from "hono";
import type {
  ITemplateService,
  CreateTemplateInput,
  UpdateTemplateInput,
} from "../../domain";

export function templateRoutes(service: ITemplateService): Hono {
  const app = new Hono();

  // GET /api/templates
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    return c.json(service.findAll(limit, offset));
  });

  // POST /api/templates
  app.post("/", async (c) => {
    const { name, description, prompt, agent } = await c.req.json<CreateTemplateInput>();
    const template = service.create({ name, description, prompt, agent });
    return c.json(template, 201);
  });

  // GET /api/templates/:id
  app.get("/:id", (c) => {
    const template = service.findById(c.req.param("id"));
    if (!template) return c.json({ error: "template not found" }, 404);
    return c.json(template);
  });

  // PATCH /api/templates/:id
  app.patch("/:id", async (c) => {
    const { name, description, prompt, agent } = await c.req.json<UpdateTemplateInput>();
    const template = service.update(c.req.param("id"), { name, description, prompt, agent });
    if (!template) return c.json({ error: "template not found" }, 404);
    return c.json(template);
  });

  // DELETE /api/templates/:id
  app.delete("/:id", (c) => {
    const deleted = service.delete(c.req.param("id"));
    if (!deleted) return c.json({ error: "template not found" }, 404);
    return c.json({ ok: true });
  });

  return app;
}
