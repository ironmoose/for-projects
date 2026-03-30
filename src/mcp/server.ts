import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  type IProjectService,
  type ITaskService,
  type IAgentService,
  type IRunService,
  type CreateAgentInput,
  type UpdateAgentInput,
  type CreateRunInput,
  type UpdateRunInput,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  agentService: IAgentService;
  runService: IRunService;
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

const agentEnum = z.enum(["tab:orchestrator", "tab:executor"]);
const entityTypeEnum = z.enum(["project", "task"]);
const runStatusEnum = z.enum(["todo", "running", "done", "failed", "cancelled"]);

/** Create an McpServer with all tools registered. */
export function createMcpServer(ctx: McpServiceContext): McpServer {
  const { projectService, taskService, agentService, runService } = ctx;

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
    "list_agents",
    {
      description: "List agents, optionally filtered by identifier or enabled status. Returns { data, total }. Pass id to retrieve a single agent.",
      inputSchema: {
        id: z.string().max(26).optional(),
        identifier: z.string().optional(),
        enabled: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ id, identifier, enabled, limit, offset }) => handle(() => agentService.list({ id, identifier, enabled, limit, offset } as Parameters<typeof agentService.list>[0]))
  );

  server.registerTool(
    "list_runs",
    {
      description: "List runs with optional filters: entity_type, entity_id, agent, status. Returns { data, total }. Pass id to retrieve a single run.",
      inputSchema: {
        id: z.string().max(26).optional(),
        entity_type: entityTypeEnum.optional(),
        entity_id: z.string().max(26).optional(),
        agent: z.string().optional(),
        status: runStatusEnum.optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ id, entity_type, entity_id, agent, status, limit, offset }) =>
      handle(() => runService.list({ id, entity_type, entity_id, agent, status, limit, offset } as Parameters<typeof runService.list>[0]))
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

  // -- Agents ---------------------------------------------------------

  server.registerTool(
    "create_agents",
    {
      description: "Create one or more agents. An agent defines a prompt to be executed against a project or task.",
      inputSchema: {
        items: z.array(z.object({
          identifier: z.string(),
          agent: agentEnum,
          prompt: z.string().max(50000),
          enabled: z.boolean().optional(),
        })).min(1),
      },
    },
    ({ items }) => handle(() => agentService.create(items as CreateAgentInput[]))
  );

  server.registerTool(
    "update_agents",
    {
      description: "Update one or more agents by ID. Use to revise prompts, reassign agent types, change identifier, or toggle enabled.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          identifier: z.string().optional(),
          agent: agentEnum.optional(),
          prompt: z.string().max(50000).optional(),
          enabled: z.boolean().optional(),
        })).min(1),
      },
    },
    ({ items }) => handle(() => agentService.update(items as UpdateAgentInput[]))
  );

  // -- Runs -----------------------------------------------------------

  server.registerTool(
    "create_run",
    {
      description: "Schedule an agent for execution. Creates a run entry with status 'running'. Requires agent identifier, entity_type, and entity_id.",
      inputSchema: {
        items: z.array(z.object({
          agent: z.string(),
          entity_type: entityTypeEnum,
          entity_id: z.string().max(26),
        })).min(1),
      },
    },
    ({ items }) => handle(() => runService.create(items as CreateRunInput[]))
  );

  server.registerTool(
    "update_run",
    {
      description: "Update the status of a run (todo|running|done|failed|cancelled). Optionally include output. finished_at auto-set on terminal statuses.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          status: runStatusEnum,
          output: z.string().max(50000).optional(),
        })).min(1),
      },
    },
    ({ items }) => handle(() => runService.update(items as UpdateRunInput[]))
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
