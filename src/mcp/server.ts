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
  TAG_NAMES,
  type IProjectService,
  type ITaskService,
  type ITaskDependencyService,
  type IDocumentService,
  type IAutomationService,
  type ISourceService,
  type IProjectContextService,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  taskDependencyService: ITaskDependencyService;
  documentService: IDocumentService;
  automationService: IAutomationService;
  sourceService: ISourceService;
  projectContextService: IProjectContextService;
}

async function handle<T>(fn: () => T | Promise<T>) {
  try {
    const result = await fn();
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
 * Keys are document IDs. `true` links the document; `null` unlinks it.
 * Absent keys are untouched.
 */
const documentsMergePatchSchema = z.record(
  z.string().max(26),
  z.union([z.literal(true), z.null()]),
).optional().describe(
  "Merge-patch for a project's linked documents. Keys are document IDs. `true` links the document (no-op if already linked); `null` unlinks it. Absent keys are untouched."
);

/** Create an McpServer with all tools registered. */
export function createMcpServer(ctx: McpServiceContext): McpServer {
  const { projectService, taskService, taskDependencyService, documentService, automationService, sourceService, projectContextService } = ctx;

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
      description: "Retrieve a single project by ID. Returns title, summary, context, requirements, timestamps, and a `documents` array of linked documents (document_id, title, summary, favorite).",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => projectService.get(id))
  );

  server.registerTool(
    "list_tasks",
    {
      description: "List task summaries, optionally filtered by title, project_id, group_key, status, effort, impact, category, and/or blocked. status accepts an array of status values (e.g. [\"in_progress\", \"todo\"]). Returns { data, total } where data contains task summaries (id, title, status, effort, impact, category, group_key, is_blocked, timestamps). Use blocked=true to find tasks marked as blocked, blocked=false to find unblocked tasks.",
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
      description: "Retrieve a single task by ID with all fields including context, acceptance_criteria, and is_blocked.",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => taskService.get(id))
  );

  // -- Projects -------------------------------------------------------

  server.registerTool(
    "create_project",
    {
      description: "Create projects. Pass an `items` array with required title, optional summary (max 1000 chars), optional context (max 100K chars, freeform background/rationale), and optional requirements (max 100K chars, freeform constraints/specs). Rich content lives in linked documents via the documents merge-patch field.",
      inputSchema: {
        items: z.array(z.object({
          title: z.string().max(255),
          summary: z.string().max(1000).optional(),
          context: z.string().max(100_000).optional(),
          requirements: z.string().max(100_000).optional(),
          documents: documentsMergePatchSchema,
        })),
      },
    },
    ({ items }) => handle(() => projectService.create(items))
  );

  server.registerTool(
    "update_project",
    {
      description: "Update projects by ID. Pass an `items` array. Only provided fields are changed. Supports context (freeform background/rationale, max 100K chars) and requirements (freeform constraints/specs, max 100K chars). Use the documents merge-patch field to manage document references.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          title: z.string().max(255).optional(),
          summary: z.string().max(1000).optional(),
          context: z.string().max(100_000).optional(),
          requirements: z.string().max(100_000).optional(),
          documents: documentsMergePatchSchema,
        })),
      },
    },
    ({ items }) => handle(() => projectService.update(items))
  );

  server.registerTool(
    "delete_project",
    {
      description: "Delete projects by ID. Pass an `ids` array. Cascades to project_documents links (linked documents themselves are not deleted). Emits a deleted event and an activity-log entry per id. Returns { deleted, ids }.",
      inputSchema: {
        ids: z.array(z.string().max(26)),
      },
    },
    ({ ids }) => handle(async () => {
      await projectService.remove(ids);
      return { deleted: ids.length, ids };
    })
  );

  // -- Tasks ----------------------------------------------------------

  server.registerTool(
    "create_task",
    {
      description: "Create tasks within a project. Pass an `items` array with required project_id and title. Optional summary (max 1000 chars), context, acceptance_criteria, group_key (max 32 chars). Status defaults to 'todo'.",
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
        })),
      },
    },
    ({ items }) => handle(() => taskService.create(items))
  );

  server.registerTool(
    "update_task",
    {
      description: "Update tasks by ID. Pass an `items` array with required id. Only provided fields are changed. Use add_dependencies/remove_dependencies to manage edges (task_id + type 'blocks' or 'relates_to'). The current task is the target. Set is_blocked directly as a boolean.",
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
          is_blocked: z.boolean().optional(),
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

  server.registerTool(
    "delete_task",
    {
      description: "Delete tasks by ID. Pass an `ids` array. Removes dependency edges where the task is the source or target. Emits a deleted event and an activity-log entry per id. Returns { deleted, ids }.",
      inputSchema: {
        ids: z.array(z.string().max(26)),
      },
    },
    ({ ids }) => handle(async () => {
      await taskService.remove(ids);
      return { deleted: ids.length, ids };
    })
  );

  // -- Dependency graph tools -------------------------------------------

  server.registerTool(
    "get_dependency_graph",
    {
      description: "Get the dependency graph for a project. Returns tasks and edges. Optionally filter by status to see only matching tasks and edges between them.",
      inputSchema: {
        project_id: z.string().max(26),
        status: z.array(z.enum([...TASK_STATUSES])).optional(),
      },
    },
    ({ project_id, status }) => handle(async () => {
      const { edges } = await taskDependencyService.getGraph(project_id, status);
      const tasks = await taskService.listGraphSummaries(project_id, status);
      return {
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          group_key: t.group_key,
        })),
        edges: edges.map((e) => ({
          source: e.source_task_id,
          target: e.target_task_id,
          type: e.dependency_type,
        })),
      };
    })
  );

  // -- Documents -------------------------------------------------------

  server.registerTool(
    "list_documents",
    {
      description: "List document summaries with tags. Filterable by tag, title, search (title+summary, case-insensitive), project_id, folder, or favorite. Returns { data, total } with document summaries (id, title, summary, has_content, favorite, tags, timestamps).",
      inputSchema: {
        search: z.string().max(500).optional(),
        tag: z.string().max(50).optional(),
        title: z.string().max(255).optional(),
        folder: z.string().max(64).optional().describe("Filter by folder name (exact match)."),
        project_id: z.string().max(26).optional().describe("Filter to documents linked to this project."),
        favorite: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ search, tag, title, folder, project_id, favorite, limit, offset }) => handle(() => documentService.list({ search, tag, title, folder, project_id, favorite, limit, offset }))
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
      description: "Create documents. Pass an `items` array with required title, optional summary (max 500 chars), content (markdown), folder, tags, and favorite.",
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
      description: "Update documents by ID. Pass an `items` array. Only provided fields are changed. Providing tags replaces all existing tags. Set folder to null to remove from folder.",
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

  server.registerTool(
    "search_documents",
    {
      description: "Semantic search across documents using vector similarity. Returns documents ranked by relevance with their entity references (which projects/tasks link to them and how). Requires Postgres backend with embeddings. Query should describe what you're looking for in natural language.",
      inputSchema: {
        query: z.string().max(500).describe("Natural language search query"),
        tag: z.string().max(50).optional(),
        folder: z.string().max(64).optional(),
        favorite: z.boolean().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    ({ query, tag, folder, favorite, limit }) => handle(() => documentService.semanticSearch(query, { tag, folder, favorite, limit }))
  );

  server.registerTool(
    "delete_document",
    {
      description: "Delete documents. Provide either `ids` (array) OR `folder` (string), but not both. With `ids`, cascades to project_documents and entity_tags links. With `folder`, deletes every document in that folder. Returns { deleted, ids } for the ids branch; { deleted_folder } for the folder branch.",
      inputSchema: {
        ids: z.array(z.string().max(26)).optional(),
        folder: z.string().max(64).optional(),
      },
    },
    ({ ids, folder }) => handle(async () => {
      const hasIds = Array.isArray(ids);
      const hasFolder = typeof folder === "string" && folder.trim() !== "";
      if (hasIds && hasFolder) {
        throw new ServiceError("provide either ids or folder, not both", 400);
      }
      if (!hasIds && !hasFolder) {
        throw new ServiceError("ids array or folder string is required", 400);
      }
      if (hasFolder) {
        await documentService.removeByFolder(folder!);
        return { deleted_folder: folder };
      }
      await documentService.remove(ids!);
      return { deleted: ids!.length, ids };
    })
  );

  // -- Automations ------------------------------------------------------

  server.registerTool(
    "list_automations",
    {
      description: "List automation summaries. Filterable by title, category, is_favorite, tag. Returns { data, total } with automation summaries (id, title, summary, agent, category, has_prompt, is_favorite, tags, timestamps).",
      inputSchema: {
        title: z.string().max(255).optional(),
        category: z.string().max(64).optional(),
        is_favorite: z.boolean().optional(),
        tag: z.string().max(50).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ title, category, is_favorite, tag, limit, offset }) => handle(() => automationService.list({ title, category, is_favorite, tag, limit, offset }))
  );

  server.registerTool(
    "get_automation",
    {
      description: "Retrieve a single automation by ID with full prompt content, agent, tags.",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => automationService.get(id))
  );

  server.registerTool(
    "create_automation",
    {
      description: "Create automations. Pass an `items` array with required title. Optional summary (max 1000 chars), prompt (max 100K chars), agent (max 255 chars), category (max 64 chars), is_favorite, tags.",
      inputSchema: {
        items: z.array(z.object({
          title: z.string().max(255),
          summary: z.string().max(1000).optional(),
          prompt: z.string().max(100_000).optional(),
          agent: z.string().max(255).optional(),
          category: z.string().max(64).optional(),
          is_favorite: z.boolean().optional(),
          tags: z.array(z.enum([...TAG_NAMES])).max(20).optional(),
        })),
      },
    },
    ({ items }) => handle(() => automationService.create(items))
  );

  server.registerTool(
    "update_automation",
    {
      description: "Update automations by ID. Pass an `items` array. Only provided fields are changed. Providing tags replaces all existing tags.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          title: z.string().max(255).optional(),
          summary: z.string().max(1000).optional(),
          prompt: z.string().max(100_000).optional(),
          agent: z.string().max(255).nullable().optional(),
          category: z.string().max(64).nullable().optional(),
          is_favorite: z.boolean().optional(),
          tags: z.array(z.enum([...TAG_NAMES])).max(20).optional(),
        })),
      },
    },
    ({ items }) => handle(() => automationService.update(items))
  );

  server.registerTool(
    "delete_automation",
    {
      description: "Delete automations by ID. Pass an `ids` array. Cascades to entity_tags links. Emits a deleted event and an activity-log entry per id. Returns { deleted, ids }.",
      inputSchema: {
        ids: z.array(z.string().max(26)),
      },
    },
    ({ ids }) => handle(async () => {
      await automationService.remove(ids);
      return { deleted: ids.length, ids };
    })
  );

  // -- Source import ----------------------------------------------------

  server.registerTool(
    "import_document",
    {
      description: "Import a document from an external URL using a source connector (e.g. GitHub files and READMEs). The connector auto-detects the source type from the URL, fetches the content, and creates a document. Returns the created document with tags.",
      inputSchema: {
        items: z.array(z.object({
          url: z.string().max(2048).describe("External URL to import (e.g. a GitHub file URL)"),
          folder: z.string().max(64).optional().describe("Flat folder grouping. Lowercase alphanumeric + hyphens only."),
          tags: z.array(z.enum([...TAG_NAMES])).max(20).optional(),
          favorite: z.boolean().optional(),
        })),
      },
    },
    ({ items }) => handle(() => sourceService.importBatch(items))
  );

  // -- Project context (agent-optimized) ------------------------------------

  server.registerTool(
    "get_project_context",
    {
      description: "Get a token-budgeted project snapshot optimized for agent context injection. Returns a tiered summary: project health, active blockers, in-progress tasks, todo tasks, recent activity, and linked documents — packed within the token budget. Use `since` to highlight changes since a timestamp (ideal for returning to a project). Use `focus` to prioritize different information: 'blockers' emphasizes blocked tasks and dependencies, 'active_work' emphasizes in-progress and next-up tasks, 'full' (default) provides a balanced overview. Response includes `_meta` with tiers_included, truncated, estimated_tokens, and focus.",
      inputSchema: {
        project_id: z.string().max(26),
        max_tokens: z.number().int().min(200).max(50000).optional().describe("Target token budget for the response. Default 4000. Tier 1 (health + blockers) is always included regardless of budget."),
        focus: z.enum(["full", "blockers", "active_work"]).optional().describe("Controls which information is prioritized. Default 'full'."),
        since: z.string().max(30).optional().describe("ISO 8601 timestamp. When provided, a 'changes_since' section is added at highest priority showing tasks and documents created/updated/completed since this time."),
      },
    },
    ({ project_id, max_tokens, focus, since }) => handle(() =>
      projectContextService.getProjectContext({ project_id, max_tokens, focus, since })
    )
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
