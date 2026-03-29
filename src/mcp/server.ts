import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  type IProjectService,
  type ITaskService,
  type IActionService,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  actionService: IActionService;
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
  const { projectService, taskService, actionService } = ctx;

  const server = new McpServer({
    name: "tab-for-projects",
    version: "0.1.0",
  });

  // -- Projects -------------------------------------------------------

  server.registerTool(
    "create_project",
    {
      description: "Create a new project",
      inputSchema: {
        name: z.string().max(255),
        description: z.string().max(10000).optional(),
        status: z.string().max(50).optional(),
        goal_action_id: z.string().max(26).optional(),
        design_action_id: z.string().max(26).optional(),
        requirements_action_id: z.string().max(26).optional(),
      },
    },
    (input) => handle(() => projectService.create(input))
  );

  server.registerTool(
    "update_project",
    {
      description: "Update an existing project",
      inputSchema: {
        id: z.string().max(26),
        name: z.string().max(255).optional(),
        description: z.string().max(10000).optional(),
        status: z.string().max(50).optional(),
        goal_action_id: z.string().max(26).optional(),
        design_action_id: z.string().max(26).optional(),
        requirements_action_id: z.string().max(26).optional(),
      },
    },
    ({ id, ...updates }) => handle(() => projectService.update(id, updates))
  );

  // -- Tasks ----------------------------------------------------------

  server.registerTool(
    "create_task",
    {
      description: "Create a task in a project",
      inputSchema: {
        project_id: z.string().max(26),
        summary: z.string().max(500),
        context: z.string().max(10000).optional(),
        status: z.string().max(50).optional(),
        implementation_action_id: z.string().max(26).optional(),
        validation_action_id: z.string().max(26).optional(),
      },
    },
    ({ project_id, ...input }) =>
      handle(() => taskService.create({ project_id, ...input }))
  );

  server.registerTool(
    "update_task",
    {
      description: "Update a task by ID (must specify the project it belongs to)",
      inputSchema: {
        project_id: z.string().max(26),
        id: z.string().max(26),
        summary: z.string().max(500).optional(),
        context: z.string().max(10000).optional(),
        status: z.string().max(50).optional(),
        implementation_action_id: z.string().max(26).optional(),
        validation_action_id: z.string().max(26).optional(),
      },
    },
    ({ project_id: _project_id, id, ...updates }) =>
      handle(() => taskService.update(id, updates))
  );

  // -- Actions --------------------------------------------------------

  server.registerTool("create_action", {
    description: "Create a new action",
    inputSchema: {
      prompt: z.string().max(10000),
      agent: z.enum(["research", "design", "implementation", "review"]).optional(),
    },
  }, (input) => handle(() => actionService.create(input)));

  server.registerTool("update_action", {
    description: "Update an existing action",
    inputSchema: {
      id: z.string().max(26),
      prompt: z.string().max(10000).optional(),
      agent: z.enum(["research", "design", "implementation", "review"]).optional(),
      output: z.string().max(50000).optional(),
    },
  }, ({ id, ...updates }) => handle(() => {
    const result = actionService.update(id, updates);
    if (!result) throw new ServiceError("action not found", 404);
    return result;
  }));

  server.registerTool("update_action_status", {
    description: "Transition an action's status",
    inputSchema: {
      id: z.string().max(26),
      status: z.enum(["todo", "in_progress", "complete", "failed"]),
    },
  }, ({ id, status }) => handle(() => actionService.updateStatus(id, status)));

  // -- Query ----------------------------------------------------------

  server.registerTool(
    "query",
    {
      description:
        "Filtered list/lookup across entity types. Supports project, task, action.",
      inputSchema: {
        type: z.enum(["project", "task", "action"]),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        // Single-entity lookup
        id: z.string().max(26).optional(),
        // Context / filter params
        project_id: z.string().max(26).optional(),
        status: z.string().max(50).optional(),
        agent: z.string().max(200).optional(),
      },
    },
    ({ type: entityType, limit, offset, id, project_id, status, agent }) =>
      handle(() => {
        switch (entityType) {
          case "project": {
            if (id) return projectService.findById(id);
            const filter = status ? { status } : undefined;
            return projectService.findAll(limit, offset, filter);
          }
          case "task": {
            if (id) return taskService.findById(id);
            if (!project_id) throw new ServiceError("project_id is required when querying tasks", 400);
            const filter = status ? { status } : undefined;
            return taskService.findByProjectId(project_id, limit, offset, filter);
          }
          case "action": {
            if (id) {
              const action = actionService.findById(id);
              if (!action) throw new ServiceError("action not found", 404);
              return action;
            }
            const filter: Record<string, string> = {};
            if (status) filter.status = status;
            if (agent) filter.agent = agent;
            return actionService.findAll(limit, offset, Object.keys(filter).length ? filter : undefined);
          }
        }
      })
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
