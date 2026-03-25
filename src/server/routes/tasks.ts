import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  ServiceError,
  TASK_STATUSES,
  TASK_TYPES,
  TASK_EFFORTS,
  type ITaskService,
  type ITagService,
  type TaskFilter,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "../../domain";

export function taskRoutes(service: ITaskService, tagService: ITagService): Hono {
  const app = new Hono();

  // GET /api/projects/:projectSlug/tasks
  app.get("/", (c) => {
    const projectSlug = c.req.param("projectSlug")!;
    const rawLimit = parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 500) : 100;
    const rawOffset = parseInt(c.req.query("offset") ?? "", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const filter: TaskFilter = {};
    const status = c.req.query("status");
    if (status && (TASK_STATUSES as readonly string[]).includes(status)) {
      filter.status = status as TaskFilter["status"];
    }
    const type = c.req.query("type");
    if (type && (TASK_TYPES as readonly string[]).includes(type)) {
      filter.type = type as TaskFilter["type"];
    }
    const effort = c.req.query("effort");
    if (effort && (TASK_EFFORTS as readonly string[]).includes(effort)) {
      filter.effort = effort as TaskFilter["effort"];
    }
    const tag = c.req.query("tag");
    if (tag) {
      filter.tag = tag;
    }
    const tagPrefix = c.req.query("tag_prefix");
    if (tagPrefix) {
      filter.tag_prefix = tagPrefix;
    }
    try {
      return c.json(service.findByProjectSlug(projectSlug, limit, offset, filter));
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // GET /api/projects/:projectSlug/tasks/by-number/:number
  app.get("/by-number/:number", (c) => {
    const projectSlug = c.req.param("projectSlug")!;
    const num = parseInt(c.req.param("number")!, 10);
    if (!Number.isFinite(num) || num < 1) {
      return c.json({ error: "invalid task number" }, 400);
    }
    try {
      const task = service.findByNumber(projectSlug, num);
      if (!task) return c.json({ error: "task not found" }, 404);
      return c.json(task);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST /api/projects/:projectSlug/tasks
  app.post("/", async (c) => {
    const projectSlug = c.req.param("projectSlug")!;
    try {
      const { title, description, status, type, effort, priority } = await c.req.json<CreateTaskInput>();
      const task = service.create(projectSlug, { title, description, status, type, effort, priority });
      return c.json(task, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // PATCH /api/projects/:projectSlug/tasks/:id
  app.patch("/:id", async (c) => {
    const projectSlug = c.req.param("projectSlug")!;
    try {
      const { title, description, status, type, effort, priority } = await c.req.json<UpdateTaskInput>();
      const task = service.update(projectSlug, c.req.param("id")!, { title, description, status, type, effort, priority });
      if (!task) return c.json({ error: "task not found" }, 404);
      return c.json(task);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE /api/projects/:projectSlug/tasks/:id
  app.delete("/:id", (c) => {
    const projectSlug = c.req.param("projectSlug")!;
    try {
      const deleted = service.delete(projectSlug, c.req.param("id")!);
      if (!deleted) return c.json({ error: "task not found" }, 404);
      return c.json({ ok: true });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // ── Task Tags ─────────────────────────────────────────────

  // GET /api/projects/:projectSlug/tasks/:id/tags
  app.get("/:id/tags", (c) => {
    try {
      const tags = tagService.getTagsForTask(c.req.param("id")!);
      return c.json({ data: tags });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // POST /api/projects/:projectSlug/tasks/:id/tags
  app.post("/:id/tags", async (c) => {
    try {
      const { name } = await c.req.json<{ name: string }>();
      const tag = tagService.addTagToTask(c.req.param("id")!, name);
      return c.json(tag, 201);
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  // DELETE /api/projects/:projectSlug/tasks/:id/tags/:tagId
  app.delete("/:id/tags/:tagId", (c) => {
    try {
      const removed = tagService.removeTagFromTask(c.req.param("id")!, c.req.param("tagId")!);
      if (!removed) return c.json({ error: "tag not found on task" }, 404);
      return c.json({ ok: true });
    } catch (e: unknown) {
      if (e instanceof ServiceError) return c.json({ error: e.message }, e.statusCode as ContentfulStatusCode);
      throw e;
    }
  });

  return app;
}
