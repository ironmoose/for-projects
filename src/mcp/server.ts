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
      description: "List tasks, optionally filtered by project_id, group_key, status, effort, impact, and/or category. Returns { data, total }. Pass id to retrieve a single task.",
      inputSchema: {
        id: z.string().max(26).optional(),
        project_id: z.string().max(26).optional(),
        group_key: z.string().max(32).optional(),
        status: z.enum(["todo", "in_progress", "done", "archived"]).optional(),
        effort: z.enum(["trivial", "low", "medium", "high", "extreme"]).optional(),
        impact: z.enum(["trivial", "low", "medium", "high", "extreme"]).optional(),
        category: z.enum(["feature", "bugfix", "refactor", "test", "perf", "infra", "docs", "security", "design", "chore"]).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ id, project_id, group_key, status, effort, impact, category, limit, offset }) => handle(() => taskService.list({ id, project_id, group_key, status, effort, impact, category, limit, offset }))
  );

  // -- Projects -------------------------------------------------------

  server.registerTool(
    "create_project",
    {
      description: "Create projects. Pass an `items` array of objects, each with a required title and optional goal, requirements, design.",
      inputSchema: {
        items: z.array(z.object({
          title: z.string().max(255),
          goal: z.string().max(10000).optional(),
          requirements: z.string().max(10000).optional(),
          design: z.string().max(10000).optional(),
        })),
      },
    },
    ({ items }) => handle(() => projectService.create(items))
  );

  server.registerTool(
    "update_project",
    {
      description: "Update projects by ID. Pass an `items` array. Only provided fields are changed.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          title: z.string().max(255).optional(),
          goal: z.string().max(10000).optional(),
          requirements: z.string().max(10000).optional(),
          design: z.string().max(10000).optional(),
        })),
      },
    },
    ({ items }) => handle(() => projectService.update(items))
  );

  // -- Tasks ----------------------------------------------------------

  server.registerTool(
    "create_task",
    {
      description: "Create tasks within a project. Pass an `items` array with required project_id and title per item. Optional group_key (max 32 chars) for organizing tasks into flat groups. Status defaults to 'todo' if not provided. Optional effort (trivial/low/medium/high/extreme), impact (trivial/low/medium/high/extreme), and category (feature/bugfix/refactor/test/perf/infra/docs/security/design/chore).",
      inputSchema: {
        items: z.array(z.object({
          project_id: z.string().max(26),
          title: z.string().max(500),
          plan: z.string().max(10000).optional(),
          description: z.string().max(10000).optional(),
          implementation: z.string().max(10000).optional(),
          acceptance_criteria: z.string().max(10000).optional(),
          group_key: z.string().max(32).optional(),
          status: z.enum(["todo", "in_progress", "done", "archived"]).optional(),
          effort: z.enum(["trivial", "low", "medium", "high", "extreme"]).optional(),
          impact: z.enum(["trivial", "low", "medium", "high", "extreme"]).optional(),
          category: z.enum(["feature", "bugfix", "refactor", "test", "perf", "infra", "docs", "security", "design", "chore"]).optional(),
        })),
      },
    },
    ({ items }) => handle(() => taskService.create(items))
  );

  server.registerTool(
    "update_task",
    {
      description: "Update tasks by ID. Pass an `items` array with required id and project_id. Only provided fields are changed.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          project_id: z.string().max(26),
          title: z.string().max(500).optional(),
          plan: z.string().max(10000).optional(),
          description: z.string().max(10000).optional(),
          implementation: z.string().max(10000).optional(),
          acceptance_criteria: z.string().max(10000).optional(),
          group_key: z.string().max(32).optional(),
          status: z.enum(["todo", "in_progress", "done", "archived"]).optional(),
          effort: z.enum(["trivial", "low", "medium", "high", "extreme"]).optional(),
          impact: z.enum(["trivial", "low", "medium", "high", "extreme"]).optional(),
          category: z.enum(["feature", "bugfix", "refactor", "test", "perf", "infra", "docs", "security", "design", "chore"]).optional(),
        })),
      },
    },
    ({ items }) => handle(() => taskService.update(items))
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
      description: "Register agent blueprints. Pass an `items` array with required name per item. Set platform_agent to reference a Claude platform agent (e.g. 'Explore', 'Plan'), or provide a prompt for a custom agent.",
      inputSchema: {
        items: z.array(z.object({
          name: z.string().max(255),
          description: z.string().max(10000).optional(),
          platform_agent: z.string().max(255).optional(),
          prompt: z.string().max(50000).optional(),
        })),
      },
    },
    ({ items }) => handle(() => agentService.create(items))
  );

  server.registerTool(
    "update_agent",
    {
      description: "Update agent blueprints by ID. Pass an `items` array. Only provided fields are changed.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          name: z.string().max(255).optional(),
          description: z.string().max(10000).optional(),
          platform_agent: z.string().max(255).optional(),
          prompt: z.string().max(50000).optional(),
        })),
      },
    },
    ({ items }) => handle(() => agentService.update(items))
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
      description: "Create jobs for agents. Pass an `items` array with required agent_id per item. Defaults to status 'todo'.",
      inputSchema: {
        items: z.array(z.object({
          agent_id: z.string().max(26),
          status: z.string().optional(),
          input: z.string().max(50000).optional(),
        })),
      },
    },
    ({ items }) => handle(() => jobService.create(items))
  );

  server.registerTool(
    "update_job",
    {
      description: "Update jobs by ID. Pass an `items` array. Use this to transition jobs through their lifecycle: todo → running → done/failed/cancelled.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          status: z.string().optional(),
          input: z.string().max(50000).optional(),
          output: z.string().max(50000).optional(),
          started_at: z.string().optional(),
          ended_at: z.string().optional(),
        })),
      },
    },
    ({ items }) => handle(() => jobService.update(items))
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
