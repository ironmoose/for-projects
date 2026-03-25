import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  PROJECT_STATUSES,
  TASK_STATUSES,
  type IProjectService,
  type ITaskService,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
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
    throw err;
  }
}

/** Create an McpServer with all tools registered. */
export function createMcpServer(ctx: McpServiceContext): McpServer {
  const { projectService, taskService } = ctx;

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
    { description: "Get a project by slug", inputSchema: { slug: z.string() } },
    ({ slug }) => handle(() => projectService.findBySlug(slug))
  );

  server.registerTool(
    "create_project",
    {
      description: "Create a new project",
      inputSchema: {
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
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
        slug: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(PROJECT_STATUSES).optional(),
      },
    },
    ({ slug, ...updates }) => handle(() => projectService.update(slug, updates))
  );

  server.registerTool(
    "delete_project",
    { description: "Delete a project by slug", inputSchema: { slug: z.string() } },
    ({ slug }) => handle(() => projectService.delete(slug))
  );

  // ── Tasks ─────────────────────────────────────────────────

  server.registerTool(
    "list_tasks",
    {
      description: "List tasks for a project (paginated, filterable)",
      inputSchema: {
        project_slug: z.string(),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        status: z.enum(TASK_STATUSES).optional(),
      },
    },
    ({ project_slug, limit, offset, status }) =>
      handle(() => taskService.findByProjectSlug(project_slug, limit, offset, status ? { status } : undefined))
  );

  server.registerTool(
    "create_task",
    {
      description: "Create a task in a project",
      inputSchema: {
        project_slug: z.string(),
        title: z.string(),
        description: z.string().optional(),
        status: z.enum(TASK_STATUSES).optional(),
      },
    },
    ({ project_slug, ...input }) => handle(() => taskService.create(project_slug, input))
  );

  server.registerTool(
    "update_task",
    {
      description: "Update a task by ID",
      inputSchema: {
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(TASK_STATUSES).optional(),
      },
    },
    ({ id, ...updates }) => handle(() => taskService.update(id, updates))
  );

  server.registerTool(
    "delete_task",
    { description: "Delete a task by ID", inputSchema: { id: z.string() } },
    ({ id }) => handle(() => taskService.delete(id))
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
