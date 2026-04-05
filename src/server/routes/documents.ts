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
    const search = c.req.query("search");
    const project_id = c.req.query("project_id");
    const folder = c.req.query("folder");
    const rawFav = c.req.query("favorite");
    const favorite = rawFav === "true" ? true : rawFav === "false" ? false : undefined;
    const filter: { search?: string; tag?: string; title?: string; folder?: string; favorite?: boolean; project_id?: string; limit: number; offset: number } = { limit, offset };
    if (search) filter.search = search;
    if (tag) filter.tag = tag;
    if (title) filter.title = title;
    if (folder) filter.folder = folder;
    if (favorite !== undefined) filter.favorite = favorite;
    if (project_id) filter.project_id = project_id;
    return c.json(service.list(filter));
  });

  // POST /api/documents
  app.post("/", async (c) => {
    const body = await c.req.json<{ items: CreateDocumentInput[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: "items array is required" }, 400);
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
    if (!Array.isArray(body.items)) return c.json({ error: "items array is required" }, 400);
    const documents = service.update(body.items);
    return c.json(documents);
  });

  // DELETE /api/documents
  app.delete("/", async (c) => {
    const body = await c.req.json<{ ids: string[] }>();
    if (!Array.isArray(body.ids)) return c.json({ error: "ids array is required" }, 400);
    service.remove(body.ids);
    return c.body(null, 204);
  });

  return app;
}
