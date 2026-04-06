import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  TASK_STATUSES,
  EFFORT_LEVELS,
  IMPACT_LEVELS,
  TASK_CATEGORIES,
  DEPENDENCY_TYPES,
  DOCUMENT_REFERENCE_TYPES,
  ENTITY_TYPES,
  TAG_NAMES,
  type IProjectService,
  type ITaskService,
  type ITaskDependencyService,
  type IDocumentService,
  type IDocumentReferenceService,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  taskDependencyService: ITaskDependencyService;
  documentService: IDocumentService;
  documentReferenceService: IDocumentReferenceService;
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

/**
 * Zod schema for the documents merge-patch field used in project tools.
 * Keys are document IDs. Array value replaces reference types for that document.
 * null removes all references to that document. Absent keys are untouched.
 */
const documentsMergePatchSchema = z.record(
  z.string().max(26),
  z.union([
    z.array(z.object({ type: z.enum([...DOCUMENT_REFERENCE_TYPES]) })),
    z.null(),
  ]),
).optional().describe(
  'Merge-patch for document references. Keys are document IDs. Array value sets reference types for that document (valid types: goal, plan, requirements, design, reference, note). null removes all references to that document. Absent keys are untouched.'
);

/** Create an McpServer with all tools registered. */
export function createMcpServer(ctx: McpServiceContext): McpServer {
  const { projectService, taskService, taskDependencyService, documentService } = ctx;

  const server = new McpServer({
    name: "tab-for-projects",
    version: "0.1.0",
  });

  // -- List tools -----------------------------------------------------

  server.registerTool(
    "list_projects",
    {
      description: "List projects with optional pagination and title search. Returns { data, total } where data contains project summaries (id, title, summary, timestamps).",
      inputSchema: {
        title: z.string().max(255).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ title, limit, offset }) => handle(() => projectService.list({ title, limit, offset }))
  );

  server.registerTool(
    "get_project",
    {
      description: "Retrieve a single project by ID. Response includes title, summary, timestamps, and a `documents` array of linked document references, each with document_id, type, title, summary, and favorite. Use get_document for full document content.",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => projectService.get(id))
  );

  server.registerTool(
    "list_tasks",
    {
      description: "List task summaries, optionally filtered by title, project_id, group_key, status, effort, impact, category, and/or blocked. status accepts an array of status values (e.g. [\"in_progress\", \"todo\"]). Returns { data, total } where data contains task summaries (id, title, status, effort, impact, category, group_key, is_blocked, timestamps). Use blocked=true to find tasks waiting on dependencies, blocked=false to find tasks ready to work on.",
      inputSchema: {
        title: z.string().max(255).optional(),
        project_id: z.string().max(26).optional(),
        group_key: z.string().max(32).optional(),
        status: z.array(z.enum([...TASK_STATUSES])).optional(),
        effort: z.enum([...EFFORT_LEVELS]).optional(),
        impact: z.enum([...IMPACT_LEVELS]).optional(),
        category: z.enum([...TASK_CATEGORIES]).optional(),
        blocked: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ title, project_id, group_key, status, effort, impact, category, blocked, limit, offset }) => handle(() => taskService.list({ title, project_id, group_key, status, effort, impact, category, blocked, limit, offset }))
  );

  server.registerTool(
    "get_task",
    {
      description: "Retrieve a single task by ID with all fields. Response includes title, summary, context, acceptance_criteria, status, effort, impact, category, group_key, is_blocked, timestamps, and a `references` array of linked document references, each with document_id, type, title, summary, and favorite. Use get_document for full document content.",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => taskService.get(id))
  );

  // -- Projects -------------------------------------------------------

  server.registerTool(
    "create_project",
    {
      description: "Create projects. Pass an `items` array of objects, each with a required title and optional summary (max 1000 chars). Projects now have title and summary only — rich content lives in linked documents managed via the documents field on update_project. Optionally attach document references using the `documents` field: an object where keys are document IDs and values are arrays of {type} objects. Valid reference types: goal, plan, requirements, design, reference, note.",
      inputSchema: {
        items: z.array(z.object({
          title: z.string().max(255),
          summary: z.string().max(1000).optional(),
          documents: z.record(
            z.string().max(26),
            z.array(z.object({ type: z.enum([...DOCUMENT_REFERENCE_TYPES]) })).nullable(),
          ).optional(),
        })),
      },
    },
    ({ items }) => handle(() => projectService.create(items))
  );

  server.registerTool(
    "update_project",
    {
      description: "Update projects by ID. Pass an `items` array. Only provided fields are changed. Use the documents field to manage document references with merge-patch semantics: key = document_id, value = array of {type} objects replaces all reference types for that document; value = null removes all references to that document; absent key = no change. Valid types: goal, plan, requirements, design, reference, note.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          title: z.string().max(255).optional(),
          summary: z.string().max(1000).optional(),
          documents: documentsMergePatchSchema,
        })),
      },
    },
    ({ items }) => handle(() => projectService.update(items))
  );

  // -- Tasks ----------------------------------------------------------

  server.registerTool(
    "create_task",
    {
      description: "Create tasks within a project. Pass an `items` array with required project_id and title per item. Optional summary (max 1000 chars), context (freeform), acceptance_criteria (freeform), group_key (max 32 chars). Status defaults to 'todo'. Optional effort, impact, category. Optionally attach document references using the `documents` field: an object where keys are document IDs and values are arrays of {type} objects. Valid reference types: goal, plan, requirements, design, reference, note.",
      inputSchema: {
        items: z.array(z.object({
          project_id: z.string().max(26),
          title: z.string().max(255),
          summary: z.string().max(1000).optional(),
          context: z.string().optional(),
          acceptance_criteria: z.string().optional(),
          group_key: z.string().max(32).optional(),
          status: z.enum([...TASK_STATUSES]).optional(),
          effort: z.enum([...EFFORT_LEVELS]).optional(),
          impact: z.enum([...IMPACT_LEVELS]).optional(),
          category: z.enum([...TASK_CATEGORIES]).optional(),
          documents: z.record(
            z.string().max(26),
            z.array(z.object({ type: z.enum([...DOCUMENT_REFERENCE_TYPES]) })).nullable(),
          ).optional(),
        })),
      },
    },
    ({ items }) => handle(() => taskService.create(items))
  );

  server.registerTool(
    "update_task",
    {
      description: "Update tasks by ID. Pass an `items` array with required id. Only provided fields are changed. Use add_dependencies to create dependency edges (each with task_id of the blocker/related task and type 'blocks' or 'relates_to'). Use remove_dependencies to remove edges by task_id. The current task becomes the target (blocked by / related to the specified task_id). Use the documents field to manage document references with merge-patch semantics: key = document_id, value = array of {type} objects replaces all reference types for that document; value = null removes all references to that document; absent key = no change. Valid types: goal, plan, requirements, design, reference, note.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          title: z.string().max(255).optional(),
          summary: z.string().max(1000).optional(),
          context: z.string().optional(),
          acceptance_criteria: z.string().optional(),
          group_key: z.string().max(32).optional(),
          status: z.enum([...TASK_STATUSES]).optional(),
          effort: z.enum([...EFFORT_LEVELS]).optional(),
          impact: z.enum([...IMPACT_LEVELS]).optional(),
          category: z.enum([...TASK_CATEGORIES]).optional(),
          documents: documentsMergePatchSchema,
          add_dependencies: z.array(z.object({
            task_id: z.string().max(26),
            type: z.enum([...DEPENDENCY_TYPES]),
          })).optional(),
          remove_dependencies: z.array(z.object({
            task_id: z.string().max(26),
          })).optional(),
        })),
      },
    },
    ({ items }) => handle(() => taskService.update(items))
  );

  // -- Dependency graph tools -------------------------------------------

  server.registerTool(
    "get_dependency_graph",
    {
      description: "Get the dependency graph for a project. Returns dependency edges and task metadata. Optionally filter by status (array of values, e.g. [\"todo\", \"in_progress\"]) to see only tasks with matching statuses and edges between them. blocked_task_ids is always computed from the full graph regardless of status filter. Use this to understand task ordering, find bottlenecks, and plan execution sequences.",
      inputSchema: {
        project_id: z.string().max(26),
        status: z.array(z.enum([...TASK_STATUSES])).optional(),
      },
    },
    ({ project_id, status }) => handle(() => {
      const { edges, blocked_task_ids } = taskDependencyService.getGraph(project_id, status);
      const tasks = taskService.listGraphSummaries(project_id, status);
      const blockedSet = new Set(blocked_task_ids);
      return {
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          is_blocked: blockedSet.has(t.id),
          group_key: t.group_key,
        })),
        edges: edges.map((e) => ({
          source: e.source_task_id,
          target: e.target_task_id,
          type: e.dependency_type,
        })),
        blocked_task_ids,
      };
    })
  );

  server.registerTool(
    "get_ready_tasks",
    {
      description: "Get tasks that are ready to work on: not blocked by any incomplete dependencies. Defaults to todo tasks. Pass status to filter by other statuses (e.g. ['in_progress'] for unblocked in-progress tasks). This is the primary tool for agents to find actionable work. When the result is empty but matching tasks exist, returns {tasks: [], diagnostics: {todo_count, blocked_todo_count, message}} to help diagnose blocked/cycle situations. Use get_dependency_graph to inspect further.",
      inputSchema: {
        project_id: z.string().max(26),
        status: z.array(z.enum([...TASK_STATUSES])).optional().describe("Status values to filter by. Defaults to ['todo'] if not provided."),
      },
    },
    ({ project_id, status }) => handle(() => {
      const effectiveStatus = status ?? ["todo"];
      const { data: todoTasks } = taskService.list({ project_id, status: effectiveStatus, limit: 200 });
      const { blocked_task_ids } = taskDependencyService.getGraph(project_id);
      const blockedIds = new Set(blocked_task_ids);
      const ready = todoTasks.filter((t) => !blockedIds.has(t.id));

      if (ready.length === 0 && todoTasks.length > 0) {
        const blockedTodoCount = todoTasks.filter((t) => blockedIds.has(t.id)).length;
        return {
          tasks: ready,
          diagnostics: {
            todo_count: todoTasks.length,
            blocked_todo_count: blockedTodoCount,
            message: `All ${todoTasks.length} ${effectiveStatus.join(",")} task(s) are blocked by incomplete dependencies. This may indicate circular dependencies. Use get_dependency_graph to inspect.`,
          },
        };
      }
      return ready;
    })
  );

  // -- Documents -------------------------------------------------------

  server.registerTool(
    "list_documents",
    {
      description: "List document summaries and tags, optionally filtered by tag, title, search, entity_type+entity_id, or favorite status. Use `search` to search across both title and summary fields (OR logic, case-insensitive, partial match). Use entity_type + entity_id to find documents linked to a specific project or task. Returns { data, total } where data contains document summaries (id, title, summary, has_content, favorite, tags, timestamps). Valid tag values — Domain: ui, data, integration, infra, domain; Content Type: architecture, conventions, guide, reference, decision, troubleshooting; Concern: security, performance, testing, accessibility. Documents marked as favorite are high-value references — when setting up a new project, use `list_documents` with `favorite: true` to find documents the user wants auto-attached to relevant projects.",
      inputSchema: {
        search: z.string().max(500).optional(),
        tag: z.string().max(50).optional(),
        title: z.string().max(255).optional(),
        folder: z.string().max(64).optional().describe("Filter by folder name (exact match)."),
        project_id: z.string().max(26).optional().describe("Deprecated: use entity_type='project' + entity_id instead."),
        entity_type: z.enum([...ENTITY_TYPES]).optional().describe("Filter documents linked to this entity type. Requires entity_id."),
        entity_id: z.string().max(26).optional().describe("Filter documents linked to this entity ID. Requires entity_type."),
        favorite: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ search, tag, title, folder, project_id, entity_type, entity_id, favorite, limit, offset }) => handle(() => documentService.list({ search, tag, title, folder, project_id, entity_type, entity_id, favorite, limit, offset }))
  );

  server.registerTool(
    "get_document",
    {
      description: "Retrieve a single document by ID with full markdown content, summary, tags, and favorite status.",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => documentService.get(id))
  );

  server.registerTool(
    "create_document",
    {
      description: "Create documents. Pass an `items` array of objects, each with a required title, optional summary (max 500 chars), optional content (markdown), optional folder (lowercase alphanumeric + hyphens, max 64 chars), optional tags array, and optional favorite boolean. Valid tags — Domain: ui, data, integration, infra, domain; Content Type: architecture, conventions, guide, reference, decision, troubleshooting; Concern: security, performance, testing, accessibility.",
      inputSchema: {
        items: z.array(z.object({
          title: z.string().max(255),
          summary: z.string().max(500).optional(),
          content: z.string().max(50000).optional(),
          folder: z.string().max(64).optional().describe("Flat folder grouping. Lowercase alphanumeric + hyphens only."),
          tags: z.array(z.enum([...TAG_NAMES])).max(20).optional(),
          favorite: z.boolean().optional(),
        })),
      },
    },
    ({ items }) => handle(() => documentService.create(items))
  );

  server.registerTool(
    "update_document",
    {
      description: "Update documents by ID. Pass an `items` array. Only provided fields are changed. Providing tags replaces all existing tags. Set folder to null to remove from folder. Valid tags — Domain: ui, data, integration, infra, domain; Content Type: architecture, conventions, guide, reference, decision, troubleshooting; Concern: security, performance, testing, accessibility.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          title: z.string().max(255).optional(),
          summary: z.string().max(500).optional(),
          content: z.string().max(50000).optional(),
          folder: z.string().max(64).nullable().optional().describe("Flat folder grouping. Lowercase alphanumeric + hyphens. Set to null to remove."),
          tags: z.array(z.enum([...TAG_NAMES])).max(20).optional(),
          favorite: z.boolean().optional(),
        })),
      },
    },
    ({ items }) => handle(() => documentService.update(items))
  );

  // -- Delete tools ----------------------------------------------------

  server.registerTool(
    "delete_project",
    {
      description: "Permanently delete projects by ID. This is destructive and cannot be undone. Deleting a project cascades to all its tasks. Pass an `ids` array of project ID strings.",
      inputSchema: {
        ids: z.array(z.string().max(26)),
      },
    },
    ({ ids }) => handle(() => { projectService.remove(ids); return { deleted: ids.length }; })
  );

  server.registerTool(
    "delete_task",
    {
      description: "Permanently delete tasks by ID. This is destructive and cannot be undone. Pass an `ids` array of task ID strings.",
      inputSchema: {
        ids: z.array(z.string().max(26)),
      },
    },
    ({ ids }) => handle(() => { taskService.remove(ids); return { deleted: ids.length }; })
  );

  server.registerTool(
    "delete_document",
    {
      description: "Permanently delete documents by ID. This is destructive and cannot be undone. Deleting a document removes its tags and any project associations. Pass an `ids` array of document ID strings.",
      inputSchema: {
        ids: z.array(z.string().max(26)),
      },
    },
    ({ ids }) => handle(() => { documentService.remove(ids); return { deleted: ids.length }; })
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
