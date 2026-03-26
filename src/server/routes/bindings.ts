import { Hono } from "hono";
import type { IInstructionBindingService } from "../../domain";

export function bindingRoutes(bindingService: IInstructionBindingService): Hono {
  const app = new Hono();

  // GET /api/bindings?arn=tab:task:01KM...
  app.get("/", (c) => {
    const arn = c.req.query("arn");
    if (!arn) return c.json({ error: "arn query parameter is required" }, 400);
    return c.json({ data: bindingService.findByArn(arn) });
  });

  return app;
}
