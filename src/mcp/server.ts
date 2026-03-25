import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  PROJECT_STATUSES,
  TASK_STATUSES,
  type IProjectService,
  type ITaskService,
  type ITagService,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  tagService: ITagService;
}

function handle<T>(fn: () => T) {
  try {
    const result = fn();
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    if (err instanceof ServiceError) {
      return {
        content: [{ type: "text" as const, text: err.message }],
        isError: true,
      };
    }
    console.error(err);
    return {
      content: [{ type: "text" as const, text: "internal server error" }],
      isError: true,
    };
  }
}

/** Create an McpServer with all tools registered. */
export function createMcpServer(ctx: McpServiceContext): McpServer {
  const { projectService, taskService, tagService } = ctx;

  const server = new McpServer({
    name: "tab-for-projects",
    version: "0.1.0",
  });

  // ── Projects ──────────────────────────────────────────────

  server.registerTool(
    "list_projects",
    {
      description: "List projects (paginated, filterable)",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
        status: z.enum(PROJECT_STATUSES).optional(),
      },
    },
    ({ limit, offset, status }) =>
      handle(() => projectService.findAll(limit, offset, status ? { status } : undefined))
  );

  server.registerTool(
    "get_project",
    { description: "Get a project by slug", inputSchema: { slug: z.string().max(100) } },
    ({ slug }) => handle(() => projectService.findBySlug(slug))
  );

  server.registerTool(
    "create_project",
    {
      description: "Create a new project",
      inputSchema: {
        name: z.string().max(255),
        slug: z.string().max(100),
        description: z.string().max(10000).optional(),
        status: z.enum(PROJECT_STATUSES).optional(),
      },
    },
    (input) => handle(() => projectService.create(input))
  );

  server.registerTool(
    "update_project",
    {
      description: "Update an existing project",
      inputSchema: {
        slug: z.string().max(100),
        name: z.string().max(255).optional(),
        description: z.string().max(10000).optional(),
        status: z.enum(PROJECT_STATUSES).optional(),
      },
    },
    ({ slug, ...updates }) => handle(() => projectService.update(slug, updates))
  );

  server.registerTool(
    "delete_project",
    { description: "Delete a project by slug", inputSchema: { slug: z.string().max(100) } },
    ({ slug }) => handle(() => projectService.delete(slug))
  );

  // ── Tasks ─────────────────────────────────────────────────

  server.registerTool(
    "list_tasks",
    {
      description: "List tasks for a project (paginated, filterable by status and tag)",
      inputSchema: {
        project_slug: z.string().max(100),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        status: z.enum(TASK_STATUSES).optional(),
        tag: z.string().max(50).optional(),
      },
    },
    ({ project_slug, limit, offset, status, tag }) => {
      const filter: { status?: typeof status; tag?: string } = {};
      if (status) filter.status = status;
      if (tag) filter.tag = tag;
      return handle(() => taskService.findByProjectSlug(project_slug, limit, offset, Object.keys(filter).length ? filter : undefined));
    }
  );

  server.registerTool(
    "get_task_by_number",
    {
      description: "Get a task by its project-scoped number",
      inputSchema: {
        project_slug: z.string().max(100),
        number: z.number().int().min(1),
      },
    },
    ({ project_slug, number }) => handle(() => taskService.findByNumber(project_slug, number))
  );

  server.registerTool(
    "create_task",
    {
      description: "Create a task in a project",
      inputSchema: {
        project_slug: z.string().max(100),
        title: z.string().max(500),
        description: z.string().max(10000).optional(),
        status: z.enum(TASK_STATUSES).optional(),
        priority: z.number().int().min(1).max(10).optional(),
      },
    },
    ({ project_slug, ...input }) => handle(() => taskService.create(project_slug, input))
  );

  server.registerTool(
    "update_task",
    {
      description: "Update a task by ID (must specify the project it belongs to). Supports priority (1-10 or null to clear).",
      inputSchema: {
        project_slug: z.string().max(100),
        id: z.string().max(26),
        title: z.string().max(500).optional(),
        description: z.string().max(10000).optional(),
        status: z.enum(TASK_STATUSES).optional(),
        priority: z.number().int().min(1).max(10).nullable().optional(),
      },
    },
    ({ project_slug, id, ...updates }) => handle(() => taskService.update(project_slug, id, updates))
  );

  server.registerTool(
    "delete_task",
    {
      description: "Delete a task by ID (must specify the project it belongs to)",
      inputSchema: { project_slug: z.string().max(100), id: z.string().max(26) },
    },
    ({ project_slug, id }) => handle(() => taskService.delete(project_slug, id))
  );

  // ── Tags ──────────────────────────────────────────────────

  server.registerTool(
    "list_tags",
    {
      description: "List all tags (paginated)",
      inputSchema: {
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ limit, offset }) => handle(() => tagService.findAll(limit, offset))
  );

  server.registerTool(
    "create_tag",
    {
      description: "Create a new tag (lowercase alphanumeric with hyphens)",
      inputSchema: { name: z.string().max(50) },
    },
    ({ name }) => handle(() => tagService.create(name))
  );

  server.registerTool(
    "delete_tag",
    {
      description: "Delete a tag by ID",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => tagService.delete(id))
  );

  server.registerTool(
    "add_tag_to_task",
    {
      description: "Add a tag to a task (auto-creates tag if it doesn't exist)",
      inputSchema: {
        task_id: z.string().max(26),
        tag_name: z.string().max(50),
      },
    },
    ({ task_id, tag_name }) => handle(() => tagService.addTagToTask(task_id, tag_name))
  );

  server.registerTool(
    "remove_tag_from_task",
    {
      description: "Remove a tag from a task",
      inputSchema: {
        task_id: z.string().max(26),
        tag_id: z.string().max(26),
      },
    },
    ({ task_id, tag_id }) => handle(() => tagService.removeTagFromTask(task_id, tag_id))
  );

  server.registerTool(
    "get_task_tags",
    {
      description: "Get all tags for a task",
      inputSchema: { task_id: z.string().max(26) },
    },
    ({ task_id }) => handle(() => tagService.getTagsForTask(task_id))
  );

  server.registerTool(
    "find_tasks_by_tag",
    {
      description: "Find all tasks with a given tag (cross-project)",
      inputSchema: {
        tag_name: z.string().max(50),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ tag_name, limit, offset }) => handle(() => tagService.findTasksByTag(tag_name, limit, offset))
  );

  return server;
}

/**
 * Create a stateless HTTP handler that reuses a single McpServer instance.
 *
 * McpServer supports sequential connect → handle → close cycles (close() resets
 * the internal transport reference), but does NOT support concurrent connections.
 * A promise chain serializes requests so connect() is never called while a
 * previous transport is still active.
 */
export function createMcpHttpHandler(ctx: McpServiceContext): (req: Request) => Promise<Response> {
  const server = createMcpServer(ctx);
  let pending: Promise<unknown> = Promise.resolve();

  return (req: Request): Promise<Response> => {
    const result = pending.then(async () => {
      const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
      await server.connect(transport);
      const response = await transport.handleRequest(req);
      await server.close();
      return response;
    });
    // Chain subsequent requests, swallowing errors so the chain never rejects
    pending = result.catch(() => {});
    return result;
  };
}
