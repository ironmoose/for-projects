import { Hono } from "hono";
import type {
  IDocumentService,
  CreateDocumentInput,
  UpdateDocumentInput,
} from "../../domain";

export function documentRoutes(service: IDocumentService): Hono {
  const app = new Hono();

  // GET /api/documents
  app.get("/", (c) => {
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const tag = c.req.query("tag");
    const title = c.req.query("title");
    const filter: { tag?: string; title?: string; limit: number; offset: number } = { limit, offset };
    if (tag) filter.tag = tag;
    if (title) filter.title = title;
    return c.json(service.list(filter));
  });

  // POST /api/documents
  app.post("/", async (c) => {
    const body = await c.req.json<{ items: CreateDocumentInput[] }>();
    const documents = service.create(body.items);
    return c.json(documents, 201);
  });

  // GET /api/documents/:id
  app.get("/:id", (c) => {
    return c.json(service.get(c.req.param("id")));
  });

  // PATCH /api/documents
  app.patch("/", async (c) => {
    const body = await c.req.json<{ items: UpdateDocumentInput[] }>();
    const documents = service.update(body.items);
    return c.json(documents);
  });

  // DELETE /api/documents
  app.delete("/", async (c) => {
    const { ids } = await c.req.json<{ ids: string[] }>();
    service.remove(ids);
    return c.body(null, 204);
  });

  return app;
}
