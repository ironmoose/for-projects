import { Hono } from "hono";
import type { ISourceService } from "../../domain";

export function sourceRoutes(service: ISourceService): Hono {
  const app = new Hono();

  // GET /api/sources/github/tree?repo=owner/repo&q=filter
  app.get("/github/tree", async (c) => {
    const repo = c.req.query("repo");
    if (!repo?.trim()) return c.json({ error: "repo query parameter is required" }, 400);

    // Accept either "owner/repo" shorthand or full GitHub URL
    const repoUrl = repo.includes("github.com") ? repo : `https://github.com/${repo}`;
    const query = c.req.query("q");

    const entries = await service.browseRepo(repoUrl, query || undefined);
    return c.json({ entries, total: entries.length });
  });

  return app;
}
