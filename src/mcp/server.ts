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

/** Create an McpServer with all tools registered. */
export function createMcpServer(ctx: McpServiceContext): McpServer {
  const { projectService, taskService, actionService, actionLogService } = ctx;

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

  server.registerTool(
    "list_actions",
    {
      description: "List actions, optionally filtered by kind (plan|goal|requirements|design). Returns { data, total }. Pass id to retrieve a single action.",
      inputSchema: {
        id: z.string().max(26).optional(),
        kind: kindEnum.optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ id, kind, limit, offset }) => handle(() => actionService.list({ id, kind, limit, offset }))
  );

  server.registerTool(
    "list_action_logs",
    {
      description: "List action log entries with optional filters: entity_type, entity_id, action_id, status. Returns { data, total }. Pass id to retrieve a single entry.",
      inputSchema: {
        id: z.string().max(26).optional(),
        entity_type: entityTypeEnum.optional(),
        entity_id: z.string().max(26).optional(),
        action_id: z.string().max(26).optional(),
        status: actionLogStatusEnum.optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ id, entity_type, entity_id, action_id, status, limit, offset }) =>
      handle(() => actionLogService.list({ id, entity_type, entity_id, action_id, status, limit, offset }))
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
      description: "Create a task within a project. A task represents a unit of work. Plan can be added now or later.",
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
      description: "Update a task's title or plan by ID. Only provided fields are changed.",
      inputSchema: {
        id: z.string().max(26),
        project_id: z.string().max(26),
        title: z.string().max(500).optional(),
        plan: z.string().max(10000).optional(),
      },
    },
    (input) => handle(() => taskService.update([input])[0])
  );

  // -- Actions --------------------------------------------------------

  server.registerTool(
    "create_actions",
    {
      description: "Create one or more actions. An action defines a prompt to be executed by an agent against a project or task.",
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
      description: "Update one or more actions by ID. Use to revise prompts, reassign agents, or change kind.",
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

  // -- Action Logs ----------------------------------------------------

  server.registerTool(
    "create_action_log",
    {
      description: "Schedule an action for execution. Creates a log entry with status 'running'. Requires action_id, entity_type, and entity_id.",
      inputSchema: {
        items: z.array(z.object({
          action_id: z.string().max(26),
          entity_type: entityTypeEnum,
          entity_id: z.string().max(26),
        })).min(1),
      },
    },
    ({ items }) => handle(() => actionLogService.create(items as CreateActionLogInput[]))
  );

  server.registerTool(
    "update_action_log",
    {
      description: "Update the status of an action log entry (running|done|failed). Optionally include output for debugging/auditing. finished_at is auto-set on terminal statuses.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          status: actionLogStatusEnum,
          output: z.string().max(50000).optional(),
        })).min(1),
      },
    },
    ({ items }) => handle(() => {
      const mapped = items.map((item) => ({
        ...item,
        finished_at: item.status === "done" || item.status === "failed"
          ? new Date().toISOString()
          : undefined,
      }));
      return actionLogService.update(mapped as UpdateActionLogInput[]);
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
