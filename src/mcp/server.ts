import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  ServiceError,
  type IProjectService,
  type ITaskService,
  type ITemplateService,
  type IActionService,
} from "../domain";

export interface McpServiceContext {
  projectService: IProjectService;
  taskService: ITaskService;
  templateService: ITemplateService;
  actionService: IActionService;
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
  const { projectService, taskService, templateService, actionService } = ctx;

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
        status: z.string().max(50).optional(),
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
        status: z.string().max(50).optional(),
      },
    },
    ({ id, ...updates }) => handle(() => projectService.update(id, updates))
  );

  // -- Tasks ----------------------------------------------------------

  server.registerTool(
    "create_task",
    {
      description: "Create a task in a project",
      inputSchema: {
        project_id: z.string().max(26),
        summary: z.string().max(500),
        context: z.string().max(10000).optional(),
        status: z.string().max(50).optional(),
      },
    },
    ({ project_id, ...input }) =>
      handle(() => taskService.create({ project_id, ...input }))
  );

  server.registerTool(
    "update_task",
    {
      description: "Update a task by ID (must specify the project it belongs to)",
      inputSchema: {
        project_id: z.string().max(26),
        id: z.string().max(26),
        summary: z.string().max(500).optional(),
        context: z.string().max(10000).optional(),
        status: z.string().max(50).optional(),
      },
    },
    ({ project_id: _project_id, id, ...updates }) =>
      handle(() => taskService.update(id, updates))
  );

  // -- Templates ------------------------------------------------------

  server.registerTool(
    "create_template",
    {
      description: "Create a reusable prompt template. Templates can be referenced by actions via template_id to inherit prompt and agent values.",
      inputSchema: {
        name: z.string().max(255),
        prompt: z.string().max(10000),
        description: z.string().max(10000).optional(),
        agent: z.string().max(200).optional(),
      },
    },
    (input) => handle(() => templateService.create(input))
  );

  server.registerTool(
    "update_template",
    {
      description: "Update an existing template",
      inputSchema: {
        id: z.string().max(26),
        name: z.string().max(255).optional(),
        description: z.string().max(10000).optional(),
        prompt: z.string().max(10000).optional(),
        agent: z.string().max(200).optional(),
      },
    },
    ({ id, ...updates }) => handle(() => templateService.update(id, updates))
  );

  server.registerTool(
    "delete_template",
    {
      description: "Permanently delete a template. This is a hard delete.",
      inputSchema: {
        id: z.string().max(26),
      },
    },
    ({ id }) => handle(() => {
      const deleted = templateService.delete(id);
      if (!deleted) {
        throw new ServiceError("template not found", 404);
      }
      return { deleted: true };
    })
  );

  // -- Actions --------------------------------------------------------

  server.registerTool(
    "manage_actions",
    {
      description:
        "Manage actions on a target (ARN string, e.g. tab:project:<id> or tab:task:<id>). " +
        "Supports create, update, and delete operations in a single call. " +
        "Operations execute in order: delete → update → create. " +
        "When creating actions, provide a prompt directly or reference a template_id. " +
        "If template_id is provided, the template's prompt and agent are used as defaults " +
        "(explicit prompt/agent values override the template).",
      inputSchema: {
        target: z.string().max(500),
        create: z.array(z.object({
          rank: z.number().int().min(0),
          prompt: z.string().max(10000).optional(),
          agent: z.string().max(200).optional(),
          template_id: z.string().max(26).optional(),
        })).optional(),
        update: z.array(z.object({
          id: z.string().max(26),
          prompt: z.string().max(10000).optional(),
          agent: z.string().max(200).optional(),
        })).optional(),
        delete: z.array(z.string().max(26)).optional(),
      },
    },
    ({ target, create: createOps, update: updateOps, delete: deleteOps }) =>
      handle(() => {
        let deleted = 0;
        let updated: ReturnType<typeof actionService.updateMany> = [];
        let created: ReturnType<typeof actionService.createMany> = [];

        // Execute in order: delete → update → create
        if (deleteOps && deleteOps.length > 0) {
          deleted = actionService.deleteMany(target, deleteOps);
        }
        if (updateOps && updateOps.length > 0) {
          updated = actionService.updateMany(target, updateOps);
        }
        if (createOps && createOps.length > 0) {
          created = actionService.createMany(target, createOps);
        }

        return { created, updated, deleted };
      })
  );

  // -- Query ----------------------------------------------------------

  server.registerTool(
    "query",
    {
      description: "Filtered list/lookup across entity types. Supports project, task, template, action.",
      inputSchema: {
        type: z.enum(["project", "task", "template", "action"]),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        // Single-entity lookup
        id: z.string().max(26).optional(),
        // Context / filter params
        project_id: z.string().max(26).optional(),
        status: z.string().max(50).optional(),
        target: z.string().max(500).optional(),
      },
    },
    ({ type: entityType, limit, offset, id, project_id, status, target }) =>
      handle(() => {
        switch (entityType) {
          case "project": {
            if (id) return projectService.findById(id);
            const filter = status ? { status } : undefined;
            return projectService.findAll(limit, offset, filter);
          }
          case "task": {
            if (id) return taskService.findById(id);
            if (!project_id) throw new ServiceError("project_id is required when querying tasks", 400);
            const filter = status ? { status } : undefined;
            return taskService.findByProjectId(project_id, limit, offset, filter);
          }
          case "template": {
            if (id) return templateService.findById(id);
            return templateService.findAll(limit, offset);
          }
          case "action": {
            if (id) return actionService.findById(id);
            if (!target) throw new ServiceError("target is required when querying actions", 400);
            return actionService.findByTarget(target, limit, offset);
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
