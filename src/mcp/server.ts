import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_TYPES,
  TASK_EFFORTS,
  WORKFLOW_STATUSES,
  type IProjectService,
  type ITaskService,
  type ITagService,
  type IWorkflowService,
  type IPhaseService,
  type IInstructionService,
  type IInstructionBindingService,
  parseArn,
  ArnError,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  tagService: ITagService;
  workflowService: IWorkflowService;
  phaseService: IPhaseService;
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
  const { projectService, taskService, tagService, workflowService, phaseService, instructionService, instructionBindingService } = ctx;

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
        id: z.string().max(26),
        name: z.string().max(255).optional(),
        description: z.string().max(10000).optional(),
        status: z.enum(PROJECT_STATUSES).optional(),
      },
    },
    ({ id, ...updates }) => handle(() => projectService.update(id, updates))
  );

  // -- Tasks ----------------------------------------------------------

  server.registerTool(
    "create_task",
    {
      description: "Create a task in a project. Optionally attach tags (auto-created if they don't exist).",
      inputSchema: {
        project_id: z.string().max(26),
        title: z.string().max(500),
        description: z.string().max(10000).optional(),
        status: z.enum(TASK_STATUSES).optional(),
        type: z.enum(TASK_TYPES).optional(),
        effort: z.enum(TASK_EFFORTS).optional(),
        priority: z.number().int().min(1).max(10).optional(),
        tags: z.array(z.string().max(50)).max(20).optional(),
      },
    },
    ({ project_id, tags: tagNames, ...input }) => handle(() => {
      const task = taskService.create(project_id, input);
      if (tagNames) {
        for (const name of tagNames) {
          tagService.addTagToTask(task.id, name);
        }
      }
      const tags = tagService.getTagsForTask(task.id);
      return { ...task, tags: tags.map(t => t.name) };
    })
  );

  server.registerTool(
    "update_task",
    {
      description: "Update a task by ID (must specify the project it belongs to). Supports type, effort, priority (1-10 or null to clear), and inline tag management via add_tags/remove_tags.",
      inputSchema: {
        project_id: z.string().max(26),
        id: z.string().max(26),
        title: z.string().max(500).optional(),
        description: z.string().max(10000).optional(),
        status: z.enum(TASK_STATUSES).optional(),
        type: z.enum(TASK_TYPES).nullable().optional(),
        effort: z.enum(TASK_EFFORTS).nullable().optional(),
        priority: z.number().int().min(1).max(10).nullable().optional(),
        add_tags: z.array(z.string().max(50)).max(20).optional(),
        remove_tags: z.array(z.string().max(50)).max(20).optional(),
      },
    },
    ({ project_id, id, add_tags, remove_tags, ...updates }) => handle(() => {
      const task = taskService.update(project_id, id, updates);
      if (!task) return task;
      if (add_tags) {
        for (const name of add_tags) {
          tagService.addTagToTask(task.id, name);
        }
      }
      if (remove_tags) {
        for (const name of remove_tags) {
          tagService.removeTagFromTaskByName(task.id, name);
        }
      }
      const tags = tagService.getTagsForTask(task.id);
      return { ...task, tags: tags.map(t => t.name) };
    })
  );

  // -- Workflows ------------------------------------------------------

  server.registerTool(
    "create_workflow",
    {
      description: "Create a new workflow with a goal",
      inputSchema: {
        goal: z.string().max(2000),
        cursor: z.string().max(26).nullable().optional(),
        status: z.enum(WORKFLOW_STATUSES).optional(),
      },
    },
    ({ goal, cursor, status }) => handle(() => workflowService.create({ goal, cursor, status }))
  );

  server.registerTool(
    "update_workflow",
    {
      description: "Update an existing workflow",
      inputSchema: {
        id: z.string().max(26),
        goal: z.string().max(2000).optional(),
        cursor: z.string().max(26).nullable().optional(),
        status: z.enum(WORKFLOW_STATUSES).optional(),
      },
    },
    ({ id, ...updates }) => handle(() => workflowService.update(id, updates))
  );

  // -- Phases ---------------------------------------------------------

  server.registerTool(
    "create_phase",
    {
      description: "Create a phase within a workflow",
      inputSchema: {
        workflow_id: z.string().max(26),
        title: z.string().max(500),
        position: z.number().int().min(0).optional(),
      },
    },
    ({ workflow_id, ...input }) => handle(() => phaseService.create(workflow_id, input))
  );

  server.registerTool(
    "update_phase",
    {
      description: "Update a phase's title",
      inputSchema: {
        workflow_id: z.string().max(26),
        phase_id: z.string().max(26),
        title: z.string().max(500).optional(),
      },
    },
    ({ workflow_id, phase_id, ...updates }) => handle(() => phaseService.update(workflow_id, phase_id, updates))
  );

  server.registerTool(
    "reorder_phases",
    {
      description: "Reorder phases within a workflow by providing the full ordered list of phase IDs",
      inputSchema: {
        workflow_id: z.string().max(26),
        phase_ids: z.array(z.string().max(26)),
      },
    },
    ({ workflow_id, phase_ids }) => handle(() => phaseService.reorder(workflow_id, phase_ids))
  );

  // -- Instructions ---------------------------------------------------

  server.registerTool(
    "create_instruction",
    {
      description: "Create an instruction in a phase, optionally with bindings",
      inputSchema: {
        phase_id: z.string().max(26),
        prompt: z.string().max(10000),
        agent: z.string().max(200).nullable().optional(),
        bindings: z.array(z.object({
          arn: z.string().max(500),
        })).max(20).optional(),
      },
    },
    ({ phase_id, bindings: bindingInputs, ...input }) =>
      handle(() => {
        const instruction = instructionService.create(phase_id, input);
        if (bindingInputs) {
          for (const binding of bindingInputs) {
            instructionBindingService.create(instruction.id, binding);
          }
        }
        const bindings = instructionBindingService.findByInstruction(instruction.id);
        return { ...instruction, bindings };
      })
  );

  server.registerTool(
    "update_instruction",
    {
      description: "Update an instruction's prompt, output, status, or execution metadata. Supports adding/removing bindings inline.",
      inputSchema: {
        phase_id: z.string().max(26),
        instruction_id: z.string().max(26),
        prompt: z.string().max(10000).optional(),
        output: z.string().max(100000).nullable().optional(),
        agent: z.string().max(200).nullable().optional(),
        add_bindings: z.array(z.object({
          arn: z.string().max(500),
        })).max(20).optional(),
        remove_bindings: z.array(z.string().max(26)).max(20).optional(),
      },
    },
    ({ phase_id, instruction_id, add_bindings, remove_bindings, ...updates }) =>
      handle(() => {
        const instruction = instructionService.update(phase_id, instruction_id, updates);
        if (!instruction) return instruction;
        if (add_bindings) {
          for (const binding of add_bindings) {
            instructionBindingService.create(instruction.id, binding);
          }
        }
        if (remove_bindings) {
          for (const bindingId of remove_bindings) {
            instructionBindingService.delete(instruction.id, bindingId);
          }
        }
        const bindings = instructionBindingService.findByInstruction(instruction.id);
        return { ...instruction, bindings };
      })
  );

  // -- Resolve --------------------------------------------------------

  server.registerTool(
    "resolve",
    {
      description: "Dereference one or more ARNs (e.g. tab:project:01ABC, tab:task:01DEF) into their entities",
      inputSchema: {
        arn: z.union([
          z.string().max(500),
          z.array(z.string().max(500)).max(20),
        ]),
      },
    },
    ({ arn }) => handle(() => {
      const arns = Array.isArray(arn) ? arn : [arn];
      const results = arns.map((a) => {
        try {
          const parsed = parseArn(a);
          let data: unknown = null;
          switch (parsed.type) {
            case "project":
              data = projectService.findById(parsed.id);
              break;
            case "task":
              data = taskService.findById(parsed.id);
              break;
            case "workflow":
              data = workflowService.findById(parsed.id);
              break;
            case "phase":
              data = phaseService.findByIdDirect(parsed.id);
              break;
            case "instruction":
              data = instructionService.findByIdDirect(parsed.id);
              break;
          }
          return { arn: a, type: parsed.type, data };
        } catch (e) {
          if (e instanceof ArnError) {
            return { arn: a, type: null, data: null, error: e.message };
          }
          throw e;
        }
      });
      return Array.isArray(arn) ? results : results[0];
    })
  );

  // -- Query ----------------------------------------------------------

  server.registerTool(
    "query",
    {
      description: "Filtered list across entity types. Replaces all list_*/find_* read tools.",
      inputSchema: {
        type: z.enum(["project", "task", "tag", "workflow", "phase", "instruction", "binding"]),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        // Context params
        project_id: z.string().max(26).optional(),
        workflow_id: z.string().max(26).optional(),
        phase_id: z.string().max(26).optional(),
        instruction_id: z.string().max(26).optional(),
        // Filter params
        status: z.string().max(50).optional(),
        tag: z.string().max(50).optional(),
        tag_prefix: z.string().max(50).optional(),
        task_type: z.enum(TASK_TYPES).optional(),
        effort: z.enum(TASK_EFFORTS).optional(),
        // Single-entity lookups
        id: z.string().max(26).optional(),
        number: z.number().int().min(1).optional(),
        arn: z.string().max(500).optional(),
      },
    },
    ({ type: entityType, limit, offset, project_id, workflow_id, phase_id, instruction_id, status, tag, tag_prefix, task_type, effort, id, number, arn: arnFilter }) => handle(() => {
      switch (entityType) {
        case "project": {
          if (id) return projectService.findById(id);
          const pFilter = status ? { status: status as Parameters<typeof projectService.findAll>[2] extends infer F ? F extends { status?: infer S } ? S : never : never } : undefined;
          return projectService.findAll(limit, offset, pFilter as Parameters<typeof projectService.findAll>[2]);
        }
        case "task": {
          if (!project_id) throw new ServiceError("project_id is required when querying tasks", 400);
          if (number) return taskService.findByNumber(project_id, number);
          const tFilter: Record<string, unknown> = {};
          if (status) tFilter.status = status;
          if (task_type) tFilter.type = task_type;
          if (effort) tFilter.effort = effort;
          if (tag) tFilter.tag = tag;
          if (tag_prefix) tFilter.tag_prefix = tag_prefix;
          return taskService.findByProjectId(project_id, limit, offset, Object.keys(tFilter).length ? tFilter as Parameters<typeof taskService.findByProjectId>[3] : undefined);
        }
        case "tag": {
          if (tag_prefix) return tagService.findByPrefix(tag_prefix, limit, offset);
          return tagService.findAll(limit, offset);
        }
        case "workflow": {
          if (id) return workflowService.findById(id);
          const wFilter = status ? { status: status as Parameters<typeof workflowService.findAll>[2] extends infer F ? F extends { status?: infer S } ? S : never : never } : undefined;
          return workflowService.findAll(limit, offset, wFilter as Parameters<typeof workflowService.findAll>[2]);
        }
        case "phase": {
          if (!workflow_id) throw new ServiceError("workflow_id is required when querying phases", 400);
          if (id) return phaseService.findById(workflow_id, id);
          return phaseService.findByWorkflow(workflow_id, limit, offset);
        }
        case "instruction": {
          if (!phase_id) throw new ServiceError("phase_id is required when querying instructions", 400);
          if (id) return instructionService.findById(phase_id, id);
          return instructionService.findByPhase(phase_id, limit, offset);
        }
        case "binding": {
          if (instruction_id) return instructionBindingService.findByInstruction(instruction_id);
          if (arnFilter) return instructionBindingService.findByArn(arnFilter);
          throw new ServiceError("instruction_id or arn is required when querying bindings", 400);
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
