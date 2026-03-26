import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_TYPES,
  TASK_EFFORTS,
  type IProjectService,
  type ITaskService,
  type ITagService,
  type IWorkbenchService,
  type IInstructionService,
  type IInstructionBindingService,
  BINDING_KINDS,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  tagService: ITagService;
  workbenchService: IWorkbenchService;
  instructionService: IInstructionService;
  instructionBindingService: IInstructionBindingService;
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
  const { projectService, taskService, tagService, workbenchService, instructionService, instructionBindingService } = ctx;

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
      description: "List tasks for a project (paginated, filterable by status, type, effort, tag, and tag_prefix)",
      inputSchema: {
        project_slug: z.string().max(100),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        status: z.enum(TASK_STATUSES).optional(),
        type: z.enum(TASK_TYPES).optional(),
        effort: z.enum(TASK_EFFORTS).optional(),
        tag: z.string().max(50).optional(),
        tag_prefix: z.string().max(50).optional(),
      },
    },
    ({ project_slug, limit, offset, status, type, effort, tag, tag_prefix }) => {
      const filter: { status?: typeof status; type?: typeof type; effort?: typeof effort; tag?: string; tag_prefix?: string } = {};
      if (status) filter.status = status;
      if (type) filter.type = type;
      if (effort) filter.effort = effort;
      if (tag) filter.tag = tag;
      if (tag_prefix) filter.tag_prefix = tag_prefix;
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
        type: z.enum(TASK_TYPES).optional(),
        effort: z.enum(TASK_EFFORTS).optional(),
        priority: z.number().int().min(1).max(10).optional(),
      },
    },
    ({ project_slug, ...input }) => handle(() => taskService.create(project_slug, input))
  );

  server.registerTool(
    "update_task",
    {
      description: "Update a task by ID (must specify the project it belongs to). Supports type, effort, and priority (1-10 or null to clear).",
      inputSchema: {
        project_slug: z.string().max(100),
        id: z.string().max(26),
        title: z.string().max(500).optional(),
        description: z.string().max(10000).optional(),
        status: z.enum(TASK_STATUSES).optional(),
        type: z.enum(TASK_TYPES).nullable().optional(),
        effort: z.enum(TASK_EFFORTS).nullable().optional(),
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
      description: "List all tags (paginated). Filter by prefix to get all tags in a namespace (e.g. prefix='agent' returns 'agent:researcher', 'agent:tab:reviewer').",
      inputSchema: {
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        prefix: z.string().max(50).optional(),
      },
    },
    ({ limit, offset, prefix }) => handle(() => prefix ? tagService.findByPrefix(prefix, limit, offset) : tagService.findAll(limit, offset))
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

  server.registerTool(
    "find_tasks_by_tag_prefix",
    {
      description: "Find all tasks that have any tag with the given prefix (cross-project). E.g. prefix='agent' matches tags 'agent:researcher', 'agent:tab:reviewer'.",
      inputSchema: {
        prefix: z.string().max(50),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ prefix, limit, offset }) => handle(() => tagService.findTasksByTagPrefix(prefix, limit, offset))
  );

  // ── Workbenches ───────────────────────────────────────────

  server.registerTool(
    "list_workbenches",
    {
      description: "List workbenches (paginated)",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ limit, offset }) => handle(() => workbenchService.findAll(limit, offset))
  );

  server.registerTool(
    "get_workbench",
    {
      description: "Get a workbench by ID",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => workbenchService.findById(id))
  );

  server.registerTool(
    "create_workbench",
    {
      description: "Create a new workbench with a goal",
      inputSchema: { goal: z.string().max(10000) },
    },
    ({ goal }) => handle(() => workbenchService.create({ goal }))
  );

  server.registerTool(
    "update_workbench",
    {
      description: "Update an existing workbench",
      inputSchema: {
        id: z.string().max(26),
        goal: z.string().max(10000).optional(),
      },
    },
    ({ id, ...updates }) => handle(() => workbenchService.update(id, updates))
  );

  server.registerTool(
    "delete_workbench",
    {
      description: "Delete a workbench by ID",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => workbenchService.delete(id))
  );

  // ── Instructions ─────────────────────────────────────────

  server.registerTool(
    "list_instructions",
    {
      description: "List instructions for a workbench (paginated, ordered by position)",
      inputSchema: {
        workbench_id: z.string().max(26),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ workbench_id, limit, offset }) =>
      handle(() => instructionService.findByWorkbench(workbench_id, limit, offset))
  );

  server.registerTool(
    "get_instruction",
    {
      description: "Get an instruction by ID within a workbench",
      inputSchema: {
        workbench_id: z.string().max(26),
        instruction_id: z.string().max(26),
      },
    },
    ({ workbench_id, instruction_id }) =>
      handle(() => instructionService.findById(workbench_id, instruction_id))
  );

  server.registerTool(
    "create_instruction",
    {
      description: "Create an instruction in a workbench",
      inputSchema: {
        workbench_id: z.string().max(26),
        prompt: z.string().max(10000),
        position: z.number().int().min(0).optional(),
      },
    },
    ({ workbench_id, ...input }) =>
      handle(() => instructionService.create(workbench_id, input))
  );

  server.registerTool(
    "update_instruction",
    {
      description: "Update an instruction's prompt or output",
      inputSchema: {
        workbench_id: z.string().max(26),
        instruction_id: z.string().max(26),
        prompt: z.string().max(10000).optional(),
        output: z.string().max(100000).nullable().optional(),
      },
    },
    ({ workbench_id, instruction_id, ...updates }) =>
      handle(() => instructionService.update(workbench_id, instruction_id, updates))
  );

  server.registerTool(
    "delete_instruction",
    {
      description: "Delete an instruction from a workbench",
      inputSchema: {
        workbench_id: z.string().max(26),
        instruction_id: z.string().max(26),
      },
    },
    ({ workbench_id, instruction_id }) =>
      handle(() => instructionService.delete(workbench_id, instruction_id))
  );

  server.registerTool(
    "reorder_instructions",
    {
      description: "Reorder instructions within a workbench by providing the full ordered list of instruction IDs",
      inputSchema: {
        workbench_id: z.string().max(26),
        instruction_ids: z.array(z.string().max(26)),
      },
    },
    ({ workbench_id, instruction_ids }) =>
      handle(() => instructionService.reorder(workbench_id, instruction_ids))
  );

  // ── Instruction Bindings ─────────────────────────────────

  server.registerTool(
    "list_instruction_bindings",
    {
      description: "List all bindings for an instruction",
      inputSchema: { instruction_id: z.string().max(26) },
    },
    ({ instruction_id }) =>
      handle(() => instructionBindingService.findByInstruction(instruction_id))
  );

  server.registerTool(
    "find_bindings_by_arn",
    {
      description: "Find all instruction bindings that reference a given ARN",
      inputSchema: { arn: z.string().max(500) },
    },
    ({ arn }) => handle(() => instructionBindingService.findByArn(arn))
  );

  server.registerTool(
    "create_instruction_binding",
    {
      description: "Bind an instruction to a resource via ARN (e.g. project, task, workbench)",
      inputSchema: {
        instruction_id: z.string().max(26),
        arn: z.string().max(500),
        kind: z.enum(BINDING_KINDS),
      },
    },
    ({ instruction_id, ...input }) =>
      handle(() => instructionBindingService.create(instruction_id, input))
  );

  server.registerTool(
    "delete_instruction_binding",
    {
      description: "Remove a binding from an instruction",
      inputSchema: {
        instruction_id: z.string().max(26),
        binding_id: z.string().max(26),
      },
    },
    ({ instruction_id, binding_id }) =>
      handle(() => instructionBindingService.delete(instruction_id, binding_id))
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
