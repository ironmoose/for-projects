import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
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
    console.error(err);
    return {
      content: [{ type: "text" as const, text: "internal server error" }],
      isError: true,
    };
  }
}

/** Create an McpServer with all tools registered. */
export function createMcpServer(ctx: McpServiceContext): McpServer {
  const { projectService, taskService } = ctx;

  const server = new McpServer({
    name: "tab-for-projects",
    version: "0.1.0",
  });

  // -- List tools -----------------------------------------------------

  server.registerTool(
    "list_projects",
    {
      description: "List projects with optional pagination. Returns { data, total }. Pass id to retrieve a single project.",
      inputSchema: {
        id: z.string().max(26).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ id, limit, offset }) => handle(() => projectService.list({ id, limit, offset }))
  );

  server.registerTool(
    "list_tasks",
    {
      description: "List tasks, optionally filtered by project_id. Returns { data, total }. Pass id to retrieve a single task.",
      inputSchema: {
        id: z.string().max(26).optional(),
        project_id: z.string().max(26).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ id, project_id, limit, offset }) => handle(() => taskService.list({ id, project_id, limit, offset }))
  );

  // -- Projects -------------------------------------------------------

  server.registerTool(
    "create_project",
    {
      description: "Create a project with a title. Goal, requirements, and design can be provided now or added later via update_project.",
      inputSchema: {
        title: z.string().max(255),
        goal: z.string().max(10000).optional(),
        requirements: z.string().max(10000).optional(),
        design: z.string().max(10000).optional(),
      },
    },
    (input) => handle(() => projectService.create([input])[0])
  );

  server.registerTool(
    "update_project",
    {
      description: "Update a project's title, goal, requirements, or design by ID. Only provided fields are changed.",
      inputSchema: {
        id: z.string().max(26),
        title: z.string().max(255).optional(),
        goal: z.string().max(10000).optional(),
        requirements: z.string().max(10000).optional(),
        design: z.string().max(10000).optional(),
      },
    },
    (input) => handle(() => projectService.update([input])[0])
  );

  // -- Tasks ----------------------------------------------------------

  server.registerTool(
    "create_task",
    {
      description: "Create a task within a project. Plan, description, implementation, and acceptance_criteria can be added now or later.",
      inputSchema: {
        project_id: z.string().max(26),
        title: z.string().max(500),
        plan: z.string().max(10000).optional(),
        description: z.string().max(10000).optional(),
        implementation: z.string().max(10000).optional(),
        acceptance_criteria: z.string().max(10000).optional(),
      },
    },
    (input) => handle(() => taskService.create([input])[0])
  );

  server.registerTool(
    "update_task",
    {
      description: "Update a task by ID. Only provided fields are changed.",
      inputSchema: {
        id: z.string().max(26),
        project_id: z.string().max(26),
        title: z.string().max(500).optional(),
        plan: z.string().max(10000).optional(),
        description: z.string().max(10000).optional(),
        implementation: z.string().max(10000).optional(),
        acceptance_criteria: z.string().max(10000).optional(),
      },
    },
    (input) => handle(() => taskService.update([input])[0])
  );

  return server;
}

/**
 * Create a stateless HTTP handler that reuses a single McpServer instance.
 *
 * McpServer supports sequential connect -> handle -> close cycles (close() resets
 * the internal transport reference), but does NOT support concurrent connections.
 * A promise chain serializes requests so connect() is never called while a
 * previous transport is still active.
 */
export function createMcpHttpHandler(ctx: McpServiceContext): (req: Request) => Promise<Response> {
  const server = createMcpServer(ctx);
  let pending: Promise<unknown> = Promise.resolve();

  return (req: Request): Promise<Response> => {
    const result = pending.then(async () => {
      // enableJsonResponse is load-bearing: without it the transport returns SSE streams,
      // which breaks the serialized promise-chain handler above.
      const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
      try {
        await server.connect(transport);
        const response = await transport.handleRequest(req);
        return response;
      } finally {
        await server.close();
      }
    });
    pending = result.catch(() => {});
    return result;
  };
}
