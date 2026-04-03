import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  TASK_STATUSES,
  EFFORT_LEVELS,
  IMPACT_LEVELS,
  TASK_CATEGORIES,
  TAG_NAMES,
  type IProjectService,
  type ITaskService,
  type IDocumentService,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  documentService: IDocumentService;
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
  const { projectService, taskService, documentService } = ctx;

  const server = new McpServer({
    name: "tab-for-projects",
    version: "0.1.0",
  });

  // -- List tools -----------------------------------------------------

  server.registerTool(
    "list_projects",
    {
      description: "List projects with optional pagination. Returns { data, total } where data contains project summaries (id, title, timestamps).",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ limit, offset }) => handle(() => projectService.list({ limit, offset }))
  );

  server.registerTool(
    "get_project",
    {
      description: "Retrieve a single project by ID with all fields.",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => projectService.get(id))
  );

  server.registerTool(
    "list_tasks",
    {
      description: "List task summaries, optionally filtered by project_id, group_key, status, effort, impact, and/or category. Returns { data, total } where data contains task summaries (id, title, status, effort, impact, category, group_key, timestamps).",
      inputSchema: {
        project_id: z.string().max(26).optional(),
        group_key: z.string().max(32).optional(),
        status: z.enum([...TASK_STATUSES]).optional(),
        effort: z.enum([...EFFORT_LEVELS]).optional(),
        impact: z.enum([...IMPACT_LEVELS]).optional(),
        category: z.enum([...TASK_CATEGORIES]).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ project_id, group_key, status, effort, impact, category, limit, offset }) => handle(() => taskService.list({ project_id, group_key, status, effort, impact, category, limit, offset }))
  );

  server.registerTool(
    "get_task",
    {
      description: "Retrieve a single task by ID with all fields.",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => taskService.get(id))
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
      description: "Update projects by ID. Pass an `items` array. Only provided fields are changed. Use attach_documents / detach_documents to link or unlink documents.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          title: z.string().max(255).optional(),
          goal: z.string().max(10000).optional(),
          requirements: z.string().max(10000).optional(),
          design: z.string().max(10000).optional(),
          attach_documents: z.array(z.string().max(26)).optional(),
          detach_documents: z.array(z.string().max(26)).optional(),
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
          title: z.string().max(255),
          plan: z.string().max(10000).optional(),
          description: z.string().max(10000).optional(),
          implementation: z.string().max(10000).optional(),
          acceptance_criteria: z.string().max(10000).optional(),
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
      description: "Update tasks by ID. Pass an `items` array with required id. Only provided fields are changed.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          title: z.string().max(255).optional(),
          plan: z.string().max(10000).optional(),
          description: z.string().max(10000).optional(),
          implementation: z.string().max(10000).optional(),
          acceptance_criteria: z.string().max(10000).optional(),
          group_key: z.string().max(32).optional(),
          status: z.enum([...TASK_STATUSES]).optional(),
          effort: z.enum([...EFFORT_LEVELS]).optional(),
          impact: z.enum([...IMPACT_LEVELS]).optional(),
          category: z.enum([...TASK_CATEGORIES]).optional(),
        })),
      },
    },
    ({ items }) => handle(() => taskService.update(items))
  );

  // -- Documents -------------------------------------------------------

  server.registerTool(
    "list_documents",
    {
      description: "List document summaries and tags, optionally filtered by tag, title, project_id. Returns { data, total } where data contains document summaries (id, title, has_content, tags, timestamps). Valid tag values — Domain: ui, data, integration, infra, domain; Content Type: architecture, conventions, guide, reference, decision, troubleshooting; Concern: security, performance, testing, accessibility.",
      inputSchema: {
        tag: z.string().max(50).optional(),
        title: z.string().max(255).optional(),
        project_id: z.string().max(26).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    ({ tag, title, project_id, limit, offset }) => handle(() => documentService.list({ tag, title, project_id, limit, offset }))
  );

  server.registerTool(
    "get_document",
    {
      description: "Retrieve a single document by ID with full markdown content and tags.",
      inputSchema: { id: z.string().max(26) },
    },
    ({ id }) => handle(() => documentService.get(id))
  );

  server.registerTool(
    "create_document",
    {
      description: "Create documents. Pass an `items` array of objects, each with a required title, optional content (markdown), and optional tags array. Valid tags — Domain: ui, data, integration, infra, domain; Content Type: architecture, conventions, guide, reference, decision, troubleshooting; Concern: security, performance, testing, accessibility.",
      inputSchema: {
        items: z.array(z.object({
          title: z.string().max(255),
          content: z.string().max(50000).optional(),
          tags: z.array(z.enum([...TAG_NAMES])).max(20).optional(),
        })),
      },
    },
    ({ items }) => handle(() => documentService.create(items))
  );

  server.registerTool(
    "update_document",
    {
      description: "Update documents by ID. Pass an `items` array. Only provided fields are changed. Providing tags replaces all existing tags. Valid tags — Domain: ui, data, integration, infra, domain; Content Type: architecture, conventions, guide, reference, decision, troubleshooting; Concern: security, performance, testing, accessibility.",
      inputSchema: {
        items: z.array(z.object({
          id: z.string().max(26),
          title: z.string().max(255).optional(),
          content: z.string().max(50000).optional(),
          tags: z.array(z.enum([...TAG_NAMES])).max(20).optional(),
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
