import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  type IProjectService,
  type ITaskService,
  type IActionService,
  type IActionLogService,
  type CreateActionInput,
  type UpdateActionInput,
  type CreateActionLogInput,
  type UpdateActionLogInput,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  actionService: IActionService;
  actionLogService: IActionLogService;
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

// -- Zod enums --------------------------------------------------------

const kindEnum = z.enum(["plan", "goal", "requirements", "design"]);
const agentEnum = z.enum(["tab:orchestrator", "tab:executor"]);
const entityTypeEnum = z.enum(["project", "task"]);
const actionLogStatusEnum = z.enum(["running", "done", "failed"]);
const queryTypeEnum = z.enum(["project", "task", "action", "action_log"]);

/** Create an McpServer with all tools registered. */
export function createMcpServer(ctx: McpServiceContext): McpServer {
  const { projectService, taskService, actionService, actionLogService } = ctx;

  const server = new McpServer({
    name: "tab-for-projects",
    version: "0.1.0",
  });

  // -- Query ----------------------------------------------------------

  server.registerTool(
    "query",
    {
      description:
        "Filtered list/lookup across entity types. Supports project, task, action, action_log. Pass id for single-entity lookup.",
      inputSchema: {
        type: queryTypeEnum,
        id: z.string().max(26).optional(),
        project_id: z.string().max(26).optional(),
        kind: kindEnum.optional(),
        entity_type: entityTypeEnum.optional(),
        entity_id: z.string().max(26).optional(),
        action_id: z.string().max(26).optional(),
        status: z.string().max(50).optional(),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ type: entityType, id, project_id, kind, entity_type, entity_id, action_id, status, limit, offset }) =>
      handle(() => {
        switch (entityType) {
          case "project": {
            if (id) return projectService.get(id);
            return projectService.list({ limit, offset });
          }
          case "task": {
            if (id) return taskService.get(id);
            return taskService.list({ project_id, limit, offset });
          }
          case "action": {
            if (id) return actionService.get(id);
            return actionService.list({ kind, limit, offset });
          }
          case "action_log": {
            if (id) return actionLogService.get(id);
            return actionLogService.list({ entity_type, entity_id, action_id, status, limit, offset });
          }
        }
      })
  );

  // -- Projects -------------------------------------------------------

  server.registerTool(
    "create_project",
    {
      description: "Create a new project",
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
      description: "Update an existing project",
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

  server.registerTool(
    "delete_projects",
    {
      description: "Delete projects by IDs",
      inputSchema: {
        ids: z.array(z.string().max(26)).min(1),
      },
    },
    ({ ids }) => handle(() => {
      projectService.remove(ids);
      return { deleted: ids.length };
    })
  );

  // -- Tasks ----------------------------------------------------------

  server.registerTool(
    "create_task",
    {
      description: "Create a task in a project",
      inputSchema: {
        project_id: z.string().max(26),
        title: z.string().max(500),
        plan: z.string().max(10000).optional(),
      },
    },
    (input) => handle(() => taskService.create([input])[0])
  );

  server.registerTool(
    "update_task",
    {
      description: "Update a task by ID",
      inputSchema: {
        id: z.string().max(26),
        project_id: z.string().max(26),
        title: z.string().max(500).optional(),
        plan: z.string().max(10000).optional(),
      },
    },
    (input) => handle(() => taskService.update([input])[0])
  );

  server.registerTool(
    "delete_tasks",
    {
      description: "Delete tasks by IDs",
      inputSchema: {
        ids: z.array(z.string().max(26)).min(1),
      },
    },
    ({ ids }) => handle(() => {
      taskService.remove(ids);
      return { deleted: ids.length };
    })
  );

  // -- Actions --------------------------------------------------------

  server.registerTool(
    "create_actions",
    {
      description: "Create one or more actions",
      inputSchema: {
        items: z.array(z.object({
          kind: kindEnum,
          agent: agentEnum,
          prompt: z.string().max(50000),
          entity_type: entityTypeEnum,
          entity_id: z.string().max(26),
        })).min(1),
      },
    },
    ({ items }) => handle(() => actionService.create(items as CreateActionInput[]))
  );

  server.registerTool(
    "update_actions",
    {
      description: "Update one or more actions",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          kind: kindEnum.optional(),
          agent: agentEnum.optional(),
          prompt: z.string().max(50000).optional(),
          entity_type: entityTypeEnum.optional(),
          entity_id: z.string().max(26).optional(),
        })).min(1),
      },
    },
    ({ items }) => handle(() => actionService.update(items as UpdateActionInput[]))
  );

  server.registerTool(
    "delete_actions",
    {
      description: "Delete actions by IDs",
      inputSchema: {
        ids: z.array(z.string().max(26)).min(1),
      },
    },
    ({ ids }) => handle(() => {
      actionService.remove(ids);
      return { deleted: ids.length };
    })
  );

  // -- Action Logs ----------------------------------------------------

  server.registerTool(
    "create_action_log",
    {
      description: "Create one or more action log entries",
      inputSchema: {
        items: z.array(z.object({
          action_id: z.string().max(26),
          status: actionLogStatusEnum,
          output: z.string().max(50000).optional(),
        })).min(1),
      },
    },
    ({ items }) => handle(() => actionLogService.create(items as CreateActionLogInput[]))
  );

  server.registerTool(
    "update_action_log",
    {
      description: "Update one or more action log entries",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          status: actionLogStatusEnum.optional(),
          output: z.string().max(50000).optional(),
        })).min(1),
      },
    },
    ({ items }) => handle(() => actionLogService.update(items as UpdateActionLogInput[]))
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
