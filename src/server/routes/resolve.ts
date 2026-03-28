import { Hono } from "hono";
import { parseArn } from "../../domain/arn";
import type { IResolverService } from "../../domain";

export function resolveRoutes(resolverService: IResolverService): Hono {
  const app = new Hono();

  // GET /api/resolve?arn=tab:task:01KM...&arn=tab:instruction:01KN...&compile=prompt
  app.get("/", (c) => {
    const arnParams = c.req.queries("arn");
    if (!arnParams || arnParams.length === 0) {
      return c.json({ error: "arn query parameter is required" }, 400);
    }

    const compile = c.req.query("compile");

    if (compile === "prompt") {
      // compile=prompt only valid for a single instruction ARN
      if (arnParams.length !== 1) {
        return c.json({ error: "compile=prompt requires exactly one ARN" }, 400);
      }

      const arn = arnParams[0];
      let parsed: ReturnType<typeof parseArn>;
      try {
        parsed = parseArn(arn);
      } catch {
        return c.json({ error: `Invalid ARN format: ${arn}` }, 400);
      }

      if (parsed.type !== "instruction") {
        return c.json({ error: "compile=prompt is only valid for instruction ARNs" }, 400);
      }

      const compiled = resolverService.compilePrompt(parsed.id);
      return c.json({ data: compiled });
    }

    if (compile !== undefined) {
      return c.json({ error: `Unknown compile mode: ${compile}` }, 400);
    }

    // Standard resolution — batch supported
    const resolved = resolverService.resolve(arnParams);
    if (resolved.length === 1) {
      return c.json({ data: resolved[0] });
    }
    return c.json({ data: resolved });
  });

  return app;
}
