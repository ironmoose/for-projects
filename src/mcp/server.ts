import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  type IProjectService,
  type ITaskService,
  type IAgentService,
  type IJobService,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  agentService: IAgentService;
  jobService: IJobService;
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
  const { projectService, taskService, agentService, jobService } = ctx;

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

  // -- Agents ---------------------------------------------------------

  server.registerTool(
    "list_agents",
    {
      description: "List registered agent blueprints. Returns { data, total }. Pass id to retrieve a single agent.",
      inputSchema: {
        id: z.string().max(26).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ id, limit, offset }) => handle(() => agentService.list({ id, limit, offset }))
  );

  server.registerTool(
    "create_agent",
    {
      description: "Register an agent blueprint. Set platform_agent to reference a Claude platform agent (e.g. 'Explore', 'Plan'), or provide a prompt for a custom agent. Both can be combined to overlay custom instructions on a platform agent.",
      inputSchema: {
        name: z.string().max(255),
        description: z.string().max(10000).optional(),
        platform_agent: z.string().max(255).optional(),
        prompt: z.string().max(50000).optional(),
      },
    },
    (input) => handle(() => agentService.create([input])[0])
  );

  server.registerTool(
    "update_agent",
    {
      description: "Update an agent blueprint by ID. Only provided fields are changed.",
      inputSchema: {
        id: z.string().max(26),
        name: z.string().max(255).optional(),
        description: z.string().max(10000).optional(),
        platform_agent: z.string().max(255).optional(),
        prompt: z.string().max(50000).optional(),
      },
    },
    (input) => handle(() => agentService.update([input])[0])
  );

  // -- Jobs -----------------------------------------------------------

  server.registerTool(
    "list_jobs",
    {
      description: "List jobs, optionally filtered by agent_id or status (todo, running, done, failed, cancelled). Returns { data, total }. Pass id to retrieve a single job.",
      inputSchema: {
        id: z.string().max(26).optional(),
        agent_id: z.string().max(26).optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ id, agent_id, status, limit, offset }) => handle(() => jobService.list({ id, agent_id, status, limit, offset }))
  );

  server.registerTool(
    "create_job",
    {
      description: "Create a job for an agent. Defaults to status 'todo'. Agents poll for todo jobs to pick up work.",
      inputSchema: {
        agent_id: z.string().max(26),
        status: z.string().optional(),
        input: z.string().max(50000).optional(),
      },
    },
    (input) => handle(() => jobService.create([input])[0])
  );

  server.registerTool(
    "update_job",
    {
      description: "Update a job's status, input, output, started_at, or ended_at. Use this to transition jobs through their lifecycle: todo → running → done/failed/cancelled.",
      inputSchema: {
        id: z.string().max(26),
        status: z.string().optional(),
        input: z.string().max(50000).optional(),
        output: z.string().max(50000).optional(),
        started_at: z.string().optional(),
        ended_at: z.string().optional(),
      },
    },
    (input) => handle(() => jobService.update([input])[0])
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
