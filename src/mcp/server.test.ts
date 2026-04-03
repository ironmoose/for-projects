import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { bootstrap, type AppContext } from "../domain/bootstrap";
import { createMcpServer } from "./server";

let ctx: AppContext;
let client: Client;
let server: ReturnType<typeof createMcpServer>;
let tempDir: string;

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args });
  return result;
}

function parseResult(result: Awaited<ReturnType<typeof callTool>>) {
  const content = result.content as Array<{ type: string; text: string }>;
  return JSON.parse(content[0].text);
}

function getErrorText(result: Awaited<ReturnType<typeof callTool>>): string {
  const content = result.content as Array<{ type: string; text: string }>;
  return content[0].text;
}

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "mcp-test-"));
  const dbPath = join(tempDir, "test.db");
  ctx = await bootstrap(dbPath);
  server = createMcpServer(ctx);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client({ name: "test-client", version: "0.1.0" });
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await server.close();
  ctx.db.close();
  rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

describe("list_projects", () => {
  it("returns created projects with correct total", async () => {
    await callTool("create_project", { items: [{ title: "List Test Project", goal: "G", requirements: "R", design: "D" }] });

    const listResult = await callTool("list_projects");
    const parsed = parseResult(listResult);
    expect(parsed.data.length).toBeGreaterThanOrEqual(1);
    expect(parsed.total).toBeGreaterThanOrEqual(1);
    expect(parsed.data[0].id).toBeTruthy();
    expect(parsed.data[0].title).toBeTruthy();
    expect(parsed.data[0].created_at).toBeTruthy();
    expect(parsed.data[0].updated_at).toBeTruthy();
    // Summary must not include full-entity fields
    expect(parsed.data[0].goal).toBeUndefined();
    expect(parsed.data[0].requirements).toBeUndefined();
    expect(parsed.data[0].design).toBeUndefined();
  });

  it("supports pagination via limit and offset", async () => {
    const listResult = await callTool("list_projects", { limit: 1, offset: 0 });
    const parsed = parseResult(listResult);
    expect(parsed.data).toHaveLength(1);
  });
});

describe("get_project", () => {
  it("returns full project entity by id", async () => {
    const [created] = parseResult(
      await callTool("create_project", { items: [{ title: "Get Me", goal: "A goal", requirements: "Reqs", design: "Design" }] })
    );

    const result = await callTool("get_project", { id: created.id });
    const project = parseResult(result);
    expect(project.id).toBe(created.id);
    expect(project.title).toBe("Get Me");
    expect(project.goal).toBe("A goal");
    expect(project.requirements).toBe("Reqs");
    expect(project.design).toBe("Design");
    expect(project.created_at).toBeTruthy();
    expect(project.updated_at).toBeTruthy();
  });

  it("returns error for nonexistent id", async () => {
    const result = await callTool("get_project", { id: "00000000000000000000000000" });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/not found/i);
  });
});

describe("create_project", () => {
  it("creates with title only, optional fields are null", async () => {
    const result = await callTool("create_project", { items: [{ title: "Title Only" }] });
    const [project] = parseResult(result);

    expect(project.id).toBeTruthy();
    expect(project.title).toBe("Title Only");
    expect(project.goal).toBeNull();
    expect(project.requirements).toBeNull();
    expect(project.design).toBeNull();
    expect(project.created_at).toBeTruthy();
    expect(project.updated_at).toBeTruthy();
  });

  it("creates with all optional fields populated", async () => {
    const result = await callTool("create_project", {
      items: [{
        title: "Full",
        goal: "Ship it",
        requirements: "Be fast",
        design: "Monolith",
      }],
    });
    const [project] = parseResult(result);

    expect(project.title).toBe("Full");
    expect(project.goal).toBe("Ship it");
    expect(project.requirements).toBe("Be fast");
    expect(project.design).toBe("Monolith");
  });

  it("returns empty array for empty items", async () => {
    const result = await callTool("create_project", { items: [] });
    const projects = parseResult(result);
    expect(projects).toEqual([]);
  });
});

describe("update_project", () => {
  it("updates single field, others unchanged", async () => {
    const [created] = parseResult(
      await callTool("create_project", { items: [{ title: "Before", goal: "Original Goal" }] })
    );

    const [updated] = parseResult(
      await callTool("update_project", { items: [{ id: created.id, title: "After" }] })
    );

    expect(updated.title).toBe("After");
    expect(updated.goal).toBe("Original Goal");
  });

  it("rejects unknown id", async () => {
    const result = await callTool("update_project", {
      items: [{ id: "00000000000000000000000000", title: "Nope" }],
    });
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

describe("list_tasks", () => {
  it("project_id filter returns only matching tasks", async () => {
    const [p1] = parseResult(await callTool("create_project", { items: [{ title: "Task Proj 1" }] }));
    const [p2] = parseResult(await callTool("create_project", { items: [{ title: "Task Proj 2" }] }));

    await callTool("create_task", { items: [{ project_id: p1.id, title: "T1" }] });
    await callTool("create_task", { items: [{ project_id: p2.id, title: "T2" }] });

    const list = parseResult(await callTool("list_tasks", { project_id: p1.id }));
    expect(list.data.every((t: { project_id: string }) => t.project_id === p1.id)).toBe(true);
    expect(list.data.some((t: { title: string }) => t.title === "T1")).toBe(true);
  });

  it("accepts comma-separated status filter", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Multi Status Proj" }] }));
    await callTool("create_task", { items: [
      { project_id: proj.id, title: "Todo Task", status: "todo" },
      { project_id: proj.id, title: "In Progress Task", status: "in_progress" },
      { project_id: proj.id, title: "Done Task", status: "done" },
    ] });

    const list = parseResult(await callTool("list_tasks", { project_id: proj.id, status: "todo,in_progress" }));
    expect(list.data.length).toBe(2);
    const statuses = list.data.map((t: { status: string }) => t.status);
    expect(statuses).toContain("todo");
    expect(statuses).toContain("in_progress");
    expect(statuses).not.toContain("done");
  });

  it("returns summary fields in list results", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Summary Fields Proj" }] }));
    await callTool("create_task", {
      items: [{ project_id: proj.id, title: "Summary Task", plan: "P", description: "D", implementation: "I", acceptance_criteria: "AC" }],
    });

    const list = parseResult(await callTool("list_tasks", { project_id: proj.id }));
    const task = list.data.find((t: { title: string }) => t.title === "Summary Task");
    expect(task.id).toBeTruthy();
    expect(task.project_id).toBe(proj.id);
    expect(task.title).toBe("Summary Task");
    expect(task.status).toBeTruthy();
    expect(task.created_at).toBeTruthy();
    expect(task.updated_at).toBeTruthy();
    // Summary must not include full-entity fields
    expect(task.plan).toBeUndefined();
    expect(task.description).toBeUndefined();
    expect(task.implementation).toBeUndefined();
    expect(task.acceptance_criteria).toBeUndefined();
  });
});

describe("get_task", () => {
  it("returns full task entity by id", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Get Task Proj" }] }));
    const [created] = parseResult(
      await callTool("create_task", {
        items: [{ project_id: proj.id, title: "Full Task", plan: "The plan", description: "Desc" }],
      })
    );

    const result = await callTool("get_task", { id: created.id });
    const task = parseResult(result);
    expect(task.id).toBe(created.id);
    expect(task.title).toBe("Full Task");
    expect(task.plan).toBe("The plan");
    expect(task.description).toBe("Desc");
    expect(task.project_id).toBe(proj.id);
    expect(task.created_at).toBeTruthy();
    expect(task.updated_at).toBeTruthy();
  });

  it("returns error for nonexistent id", async () => {
    const result = await callTool("get_task", { id: "00000000000000000000000000" });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/not found/i);
  });
});

describe("create_task", () => {
  it("creates with project_id + title", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Task Parent" }] }));
    const [task] = parseResult(
      await callTool("create_task", { items: [{ project_id: proj.id, title: "New Task" }] })
    );

    expect(task.id).toBeTruthy();
    expect(task.project_id).toBe(proj.id);
    expect(task.title).toBe("New Task");
    expect(task.plan).toBeNull();
  });

  it("rejects missing project_id", async () => {
    const result = await callTool("create_task", { items: [{ title: "Orphan" }] });
    expect(result.isError).toBe(true);
  });
});

describe("update_task", () => {
  it("updates title and plan", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Update Task Proj" }] }));
    const [task] = parseResult(
      await callTool("create_task", { items: [{ project_id: proj.id, title: "Old Title" }] })
    );

    const [updated] = parseResult(
      await callTool("update_task", {
        items: [{ id: task.id, project_id: proj.id, title: "New Title", plan: "The plan" }],
      })
    );

    expect(updated.title).toBe("New Title");
    expect(updated.plan).toBe("The plan");
  });
});

describe("create_task with all fields", () => {
  it("creates task with all fields", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "New Fields Proj" }] }));
    const [task] = parseResult(
      await callTool("create_task", {
        items: [{
          project_id: proj.id,
          title: "Full Task",
          description: "A description",
          implementation: "Some impl",
          acceptance_criteria: "It passes",
        }],
      })
    );

    expect(task.description).toBe("A description");
    expect(task.implementation).toBe("Some impl");
    expect(task.acceptance_criteria).toBe("It passes");
  });
});

describe("update_task with optional fields", () => {
  it("updates optional fields via update_task", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Update New Fields Proj" }] }));
    const [task] = parseResult(
      await callTool("create_task", { items: [{ project_id: proj.id, title: "Bare Task" }] })
    );

    const [updated] = parseResult(
      await callTool("update_task", {
        items: [{ id: task.id, project_id: proj.id, description: "Now has description" }],
      })
    );

    expect(updated.description).toBe("Now has description");
    expect(updated.implementation).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Batch operations
// ---------------------------------------------------------------------------

describe("batch create_project", () => {
  it("creates multiple projects via items array", async () => {
    const result = await callTool("create_project", {
      items: [
        { title: "Project A" },
        { title: "Project B", goal: "Ship B" },
      ],
    });
    const projects = parseResult(result);
    expect(projects).toHaveLength(2);
    expect(projects[0].title).toBe("Project A");
    expect(projects[1].title).toBe("Project B");
    expect(projects[1].goal).toBe("Ship B");
  });
});

describe("batch update_project", () => {
  it("updates multiple projects via items array", async () => {
    const [a, b] = parseResult(await callTool("create_project", {
      items: [{ title: "A" }, { title: "B" }],
    }));

    const result = await callTool("update_project", {
      items: [
        { id: a.id, title: "A Updated" },
        { id: b.id, goal: "New goal" },
      ],
    });
    const updated = parseResult(result);
    expect(updated).toHaveLength(2);
    expect(updated[0].title).toBe("A Updated");
    expect(updated[1].goal).toBe("New goal");
  });
});

describe("batch create_task", () => {
  it("creates multiple tasks via items array", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Batch Task Proj" }] }));
    const result = await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "Task A" },
        { project_id: proj.id, title: "Task B", plan: "Do B" },
      ],
    });
    const tasks = parseResult(result);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe("Task A");
    expect(tasks[1].title).toBe("Task B");
    expect(tasks[1].plan).toBe("Do B");
  });
});

describe("batch update_task", () => {
  it("updates multiple tasks via items array", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Batch Update Task Proj" }] }));
    const [a, b] = parseResult(await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "TA" },
        { project_id: proj.id, title: "TB" },
      ],
    }));

    const result = await callTool("update_task", {
      items: [
        { id: a.id, project_id: proj.id, title: "TA Updated" },
        { id: b.id, project_id: proj.id, description: "New desc" },
      ],
    });
    const updated = parseResult(result);
    expect(updated).toHaveLength(2);
    expect(updated[0].title).toBe("TA Updated");
    expect(updated[1].description).toBe("New desc");
  });
});

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

describe("create_document", () => {
  it("creates document with title and content via items array", async () => {
    const result = await callTool("create_document", {
      items: [{ title: "My Doc", content: "# Hello\nWorld" }],
    });
    const [doc] = parseResult(result);

    expect(doc.id).toBeTruthy();
    expect(doc.title).toBe("My Doc");
    expect(doc.content).toBe("# Hello\nWorld");
    expect(doc.created_at).toBeTruthy();
    expect(doc.updated_at).toBeTruthy();
  });

  it("creates document with tags, verify tags in response", async () => {
    const result = await callTool("create_document", {
      items: [{ title: "Tagged Doc", content: "body", tags: ["architecture", "domain"] }],
    });
    const [doc] = parseResult(result);

    expect(doc.tags).toEqual(["architecture", "domain"]);
  });

  it("creates multiple documents in one batch call", async () => {
    const result = await callTool("create_document", {
      items: [
        { title: "Batch Doc 1" },
        { title: "Batch Doc 2", content: "content2", tags: ["ui"] },
      ],
    });
    const docs = parseResult(result);
    expect(docs).toHaveLength(2);
    expect(docs[0].title).toBe("Batch Doc 1");
    expect(docs[1].title).toBe("Batch Doc 2");
    expect(docs[1].tags).toEqual(["ui"]);
  });
});

describe("get_document", () => {
  it("returns full document by id (title, content, tags, timestamps)", async () => {
    const [created] = parseResult(
      await callTool("create_document", {
        items: [{ title: "Get Me Doc", content: "Full content", tags: ["guide"] }],
      })
    );

    const result = await callTool("get_document", { id: created.id });
    const doc = parseResult(result);
    expect(doc.id).toBe(created.id);
    expect(doc.title).toBe("Get Me Doc");
    expect(doc.content).toBe("Full content");
    expect(doc.tags).toEqual(["guide"]);
    expect(doc.created_at).toBeTruthy();
    expect(doc.updated_at).toBeTruthy();
  });

  it("returns error for nonexistent id", async () => {
    const result = await callTool("get_document", { id: "00000000000000000000000000" });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/not found/i);
  });
});

describe("list_documents", () => {
  it("returns documents with correct total, verify { data, total }", async () => {
    await callTool("create_document", { items: [{ title: "List Doc" }] });

    const listResult = await callTool("list_documents");
    const parsed = parseResult(listResult);
    expect(parsed.data.length).toBeGreaterThanOrEqual(1);
    expect(parsed.total).toBeGreaterThanOrEqual(1);
    expect(parsed.data[0].id).toBeTruthy();
    expect(parsed.data[0].title).toBeTruthy();
    expect(parsed.data[0].created_at).toBeTruthy();
    expect(parsed.data[0].updated_at).toBeTruthy();
  });

  it("supports pagination via limit and offset", async () => {
    const listResult = await callTool("list_documents", { limit: 1, offset: 0 });
    const parsed = parseResult(listResult);
    expect(parsed.data).toHaveLength(1);
  });

  it("supports tag filter", async () => {
    await callTool("create_document", { items: [{ title: "Tag Filter A", tags: ["infra"] }] });
    await callTool("create_document", { items: [{ title: "Tag Filter B", tags: ["testing"] }] });

    const listResult = await callTool("list_documents", { tag: "infra" });
    const parsed = parseResult(listResult);
    expect(parsed.data.length).toBeGreaterThanOrEqual(1);
    expect(parsed.data.every((d: { title: string }) => d.title !== "Tag Filter B")).toBe(true);
    expect(parsed.data.some((d: { title: string }) => d.title === "Tag Filter A")).toBe(true);
  });

  it("returns summary fields (no full content in list)", async () => {
    await callTool("create_document", { items: [{ title: "Summary Check Doc", content: "Secret content" }] });

    const listResult = await callTool("list_documents");
    const parsed = parseResult(listResult);
    const doc = parsed.data.find((d: { title: string }) => d.title === "Summary Check Doc");
    expect(doc).toBeTruthy();
    expect(doc.content).toBeUndefined();
    expect(doc.has_content).toBeTruthy();
  });
});

describe("update_document", () => {
  it("updates title and content", async () => {
    const [created] = parseResult(
      await callTool("create_document", { items: [{ title: "Old Title", content: "Old content" }] })
    );

    const [updated] = parseResult(
      await callTool("update_document", {
        items: [{ id: created.id, title: "New Title", content: "New content" }],
      })
    );

    expect(updated.title).toBe("New Title");
    expect(updated.content).toBe("New content");
  });

  it("replaces tags", async () => {
    const [created] = parseResult(
      await callTool("create_document", { items: [{ title: "Tag Replace", tags: ["security", "performance"] }] })
    );

    await callTool("update_document", {
      items: [{ id: created.id, tags: ["conventions"] }],
    });

    const doc = parseResult(await callTool("get_document", { id: created.id }));
    expect(doc.tags).toEqual(["conventions"]);
  });

  it("rejects unknown id", async () => {
    const result = await callTool("update_document", {
      items: [{ id: "00000000000000000000000000", title: "Nope" }],
    });
    expect(result.isError).toBe(true);
  });
});

describe("create_document with invalid tag", () => {
  it("returns error for invalid tag value", async () => {
    const result = await callTool("create_document", {
      items: [{ title: "Bad Tag", tags: ["not-a-valid-tag"] }],
    });
    expect(result.isError).toBe(true);
  });
});

describe("list_projects with title filter", () => {
  it("returns only projects matching title search", async () => {
    await callTool("create_project", { items: [{ title: "McpProjTitleFilterUnique888" }] });
    await callTool("create_project", { items: [{ title: "Unrelated MCP Project" }] });

    const listResult = await callTool("list_projects", { title: "McpProjTitleFilterUnique888" });
    const parsed = parseResult(listResult);
    expect(parsed.data.length).toBe(1);
    expect(parsed.data[0].title).toBe("McpProjTitleFilterUnique888");
    expect(parsed.total).toBe(1);
  });
});

describe("list_documents with title filter", () => {
  it("returns only documents matching title search", async () => {
    await callTool("create_document", { items: [{ title: "McpTitleFilterUnique999" }] });
    await callTool("create_document", { items: [{ title: "Unrelated MCP Doc" }] });

    const listResult = await callTool("list_documents", { title: "McpTitleFilterUnique999" });
    const parsed = parseResult(listResult);
    expect(parsed.data.length).toBeGreaterThanOrEqual(1);
    expect(parsed.data.every((d: { title: string }) => d.title.includes("McpTitleFilterUnique999"))).toBe(true);
  });
});

describe("update_document with tags=[] clears tags", () => {
  it("clears all tags when updated with empty array", async () => {
    const [created] = parseResult(
      await callTool("create_document", { items: [{ title: "MCP Clear Tags Doc", tags: ["security", "ui"] }] })
    );

    expect(created.tags.length).toBe(2);

    await callTool("update_document", {
      items: [{ id: created.id, tags: [] }],
    });

    const doc = parseResult(await callTool("get_document", { id: created.id }));
    expect(doc.tags).toEqual([]);
  });
});

describe("batch create_document with distinct tag sets", () => {
  it("creates multiple documents each with correct tags", async () => {
    const docs = parseResult(
      await callTool("create_document", {
        items: [
          { title: "MCP Batch Tag A", tags: ["architecture", "domain"] },
          { title: "MCP Batch Tag B", tags: ["testing", "performance"] },
        ],
      })
    );

    expect(docs).toHaveLength(2);
    expect(docs[0].title).toBe("MCP Batch Tag A");
    expect(docs[0].tags.sort()).toEqual(["architecture", "domain"]);
    expect(docs[1].title).toBe("MCP Batch Tag B");
    expect(docs[1].tags.sort()).toEqual(["performance", "testing"]);
  });
});

// ---------------------------------------------------------------------------
// Extended update_project (document attach/detach)
// ---------------------------------------------------------------------------

describe("update_project with document attach/detach", () => {
  it("attach_documents links documents, verify via get_project", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Doc Attach Proj" }] }));
    const [doc] = parseResult(await callTool("create_document", { items: [{ title: "Attachable Doc" }] }));

    await callTool("update_project", {
      items: [{ id: proj.id, attach_documents: [doc.id] }],
    });

    const project = parseResult(await callTool("get_project", { id: proj.id }));
    expect(project.documents).toBeTruthy();
    expect(project.documents.length).toBeGreaterThanOrEqual(1);
    expect(project.documents.some((d: { id: string }) => d.id === doc.id)).toBe(true);
  });

  it("detach_documents removes documents, verify via get_project", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Doc Detach Proj" }] }));
    const [doc] = parseResult(await callTool("create_document", { items: [{ title: "Detachable Doc" }] }));

    await callTool("update_project", {
      items: [{ id: proj.id, attach_documents: [doc.id] }],
    });

    // Verify attached
    let project = parseResult(await callTool("get_project", { id: proj.id }));
    expect(project.documents.some((d: { id: string }) => d.id === doc.id)).toBe(true);

    // Detach
    await callTool("update_project", {
      items: [{ id: proj.id, detach_documents: [doc.id] }],
    });

    project = parseResult(await callTool("get_project", { id: proj.id }));
    expect(project.documents.every((d: { id: string }) => d.id !== doc.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Deleted tools -- negative tests
// ---------------------------------------------------------------------------

describe("deleted tools are not registered", () => {
  it("delete_projects is not found", async () => {
    const result = await callTool("delete_projects", { ids: ["fake"] });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/tool.*not found|unknown tool/i);
  });

  it("delete_tasks is not found", async () => {
    const result = await callTool("delete_tasks", { ids: ["fake"] });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/tool.*not found|unknown tool/i);
  });

  it("query is not found", async () => {
    const result = await callTool("query", { sql: "SELECT 1" });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/tool.*not found|unknown tool/i);
  });

});

// ---------------------------------------------------------------------------
// Dependency operations via MCP
// ---------------------------------------------------------------------------

describe("update_task with add_dependencies", () => {
  it("creates a dependency via update_task add_dependencies", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "MCP Dep Proj" }] }));
    const [taskA, taskB] = parseResult(await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "MCP Dep A" },
        { project_id: proj.id, title: "MCP Dep B" },
      ],
    }));

    const result = await callTool("update_task", {
      items: [{
        id: taskB.id,
        add_dependencies: [{ task_id: taskA.id, type: "blocks" }],
      }],
    });
    expect(result.isError).toBeUndefined();
    const [updated] = parseResult(result);
    expect(updated.id).toBe(taskB.id);

    // Verify via get_dependency_graph
    const graph = parseResult(await callTool("get_dependency_graph", { project_id: proj.id }));
    expect(graph.edges.some((e: { source: string; target: string }) => e.source === taskA.id && e.target === taskB.id)).toBe(true);
    expect(graph.blocked_task_ids).toContain(taskB.id);
  });
});

describe("update_task with remove_dependencies", () => {
  it("removes a dependency via update_task remove_dependencies", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "MCP Remove Dep Proj" }] }));
    const [taskA, taskB] = parseResult(await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "MCP Remove A" },
        { project_id: proj.id, title: "MCP Remove B" },
      ],
    }));

    // Add dependency first
    await callTool("update_task", {
      items: [{ id: taskB.id, add_dependencies: [{ task_id: taskA.id, type: "blocks" }] }],
    });

    // Remove dependency
    const result = await callTool("update_task", {
      items: [{ id: taskB.id, remove_dependencies: [{ task_id: taskA.id }] }],
    });
    expect(result.isError).toBeUndefined();

    // Verify edge is gone
    const graph = parseResult(await callTool("get_dependency_graph", { project_id: proj.id }));
    expect(graph.edges.some((e: { source: string; target: string }) => e.source === taskA.id && e.target === taskB.id)).toBe(false);
    expect(graph.blocked_task_ids).not.toContain(taskB.id);
  });
});

describe("get_dependency_graph", () => {
  it("returns tasks, edges, and blocked_task_ids for a project", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "MCP Graph Proj" }] }));
    const [taskA, taskB, taskC] = parseResult(await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "MCP Graph A" },
        { project_id: proj.id, title: "MCP Graph B" },
        { project_id: proj.id, title: "MCP Graph C" },
      ],
    }));

    // A blocks B, B blocks C
    await callTool("update_task", {
      items: [{ id: taskB.id, add_dependencies: [{ task_id: taskA.id, type: "blocks" }] }],
    });
    await callTool("update_task", {
      items: [{ id: taskC.id, add_dependencies: [{ task_id: taskB.id, type: "blocks" }] }],
    });

    const graph = parseResult(await callTool("get_dependency_graph", { project_id: proj.id }));

    // Verify tasks array
    expect(graph.tasks).toBeArray();
    expect(graph.tasks.length).toBe(3);
    const taskIds = graph.tasks.map((t: { id: string }) => t.id);
    expect(taskIds).toContain(taskA.id);
    expect(taskIds).toContain(taskB.id);
    expect(taskIds).toContain(taskC.id);

    // Verify each task has expected fields
    for (const t of graph.tasks) {
      expect(t.id).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.status).toBeTruthy();
      expect(typeof t.is_blocked).toBe("boolean");
    }

    // Verify edges
    expect(graph.edges).toBeArray();
    expect(graph.edges.length).toBe(2);
    for (const e of graph.edges) {
      expect(e.source).toBeTruthy();
      expect(e.target).toBeTruthy();
      expect(e.type).toBeTruthy();
    }

    // Verify blocked_task_ids
    expect(graph.blocked_task_ids).toBeArray();
    expect(graph.blocked_task_ids).toContain(taskB.id);
    expect(graph.blocked_task_ids).toContain(taskC.id);
    expect(graph.blocked_task_ids).not.toContain(taskA.id);
  });
});

describe("get_ready_tasks", () => {
  it("excludes blocked tasks and returns only unblocked todo tasks", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "MCP Ready Proj" }] }));
    const [taskA, taskB, taskC] = parseResult(await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "MCP Ready A" },
        { project_id: proj.id, title: "MCP Ready B" },
        { project_id: proj.id, title: "MCP Ready C" },
      ],
    }));

    // A blocks B (so B is blocked, A and C are ready)
    await callTool("update_task", {
      items: [{ id: taskB.id, add_dependencies: [{ task_id: taskA.id, type: "blocks" }] }],
    });

    const ready = parseResult(await callTool("get_ready_tasks", { project_id: proj.id }));
    expect(ready).toBeArray();
    const readyIds = ready.map((t: { id: string }) => t.id);
    expect(readyIds).toContain(taskA.id);
    expect(readyIds).toContain(taskC.id);
    expect(readyIds).not.toContain(taskB.id);
  });

  it("returns diagnostics when all todo tasks are blocked", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "MCP Diag Proj" }] }));
    const [blocker, taskA, taskB] = parseResult(await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "Blocker (in_progress)", status: "in_progress" },
        { project_id: proj.id, title: "Blocked A" },
        { project_id: proj.id, title: "Blocked B" },
      ],
    }));

    // blocker blocks both A and B; blocker is in_progress so both todo tasks are blocked
    await callTool("update_task", {
      items: [{ id: taskA.id, add_dependencies: [{ task_id: blocker.id, type: "blocks" }] }],
    });
    await callTool("update_task", {
      items: [{ id: taskB.id, add_dependencies: [{ task_id: blocker.id, type: "blocks" }] }],
    });

    const result = parseResult(await callTool("get_ready_tasks", { project_id: proj.id }));
    expect(result).toHaveProperty("tasks");
    expect(result).toHaveProperty("diagnostics");
    expect(result.tasks).toBeArray();
    expect(result.tasks).toHaveLength(0);
    expect(result.diagnostics.todo_count).toBe(2);
    expect(result.diagnostics.blocked_todo_count).toBe(2);
    expect(result.diagnostics.message).toContain("blocked");
    expect(result.diagnostics.message).toContain("get_dependency_graph");
  });

  it("returns empty array without diagnostics when no todo tasks exist", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "MCP No Todo Proj" }] }));
    parseResult(await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "Done task", status: "done" },
      ],
    }));

    const result = parseResult(await callTool("get_ready_tasks", { project_id: proj.id }));
    expect(result).toBeArray();
    expect(result).toHaveLength(0);
  });
});

describe("get_topological_order", () => {
  it("returns tasks ordered with blockers before dependents", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "MCP Topo Proj" }] }));
    const [taskA, taskB, taskC] = parseResult(await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "MCP Topo A" },
        { project_id: proj.id, title: "MCP Topo B" },
        { project_id: proj.id, title: "MCP Topo C" },
      ],
    }));

    // A blocks B, B blocks C
    await callTool("update_task", {
      items: [{ id: taskB.id, add_dependencies: [{ task_id: taskA.id, type: "blocks" }] }],
    });
    await callTool("update_task", {
      items: [{ id: taskC.id, add_dependencies: [{ task_id: taskB.id, type: "blocks" }] }],
    });

    const ordered = parseResult(await callTool("get_topological_order", { project_id: proj.id }));
    expect(ordered).toBeArray();
    const ids = ordered.map((t: { id: string }) => t.id);
    const indexA = ids.indexOf(taskA.id);
    const indexB = ids.indexOf(taskB.id);
    const indexC = ids.indexOf(taskC.id);
    expect(indexA).toBeLessThan(indexB);
    expect(indexB).toBeLessThan(indexC);
  });
});

describe("dependency error cases via MCP", () => {
  it("cycle detection via update_task returns isError: true", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "MCP Cycle Proj" }] }));
    const [taskA, taskB] = parseResult(await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "MCP Cycle A" },
        { project_id: proj.id, title: "MCP Cycle B" },
      ],
    }));

    // A blocks B
    await callTool("update_task", {
      items: [{ id: taskB.id, add_dependencies: [{ task_id: taskA.id, type: "blocks" }] }],
    });

    // Try B blocks A (would create cycle)
    const result = await callTool("update_task", {
      items: [{ id: taskA.id, add_dependencies: [{ task_id: taskB.id, type: "blocks" }] }],
    });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/cycle/i);
  });

  it("cross-project dependency via update_task returns isError: true", async () => {
    const [proj1] = parseResult(await callTool("create_project", { items: [{ title: "MCP Cross1" }] }));
    const [proj2] = parseResult(await callTool("create_project", { items: [{ title: "MCP Cross2" }] }));
    const [task1] = parseResult(await callTool("create_task", { items: [{ project_id: proj1.id, title: "Cross T1" }] }));
    const [task2] = parseResult(await callTool("create_task", { items: [{ project_id: proj2.id, title: "Cross T2" }] }));

    const result = await callTool("update_task", {
      items: [{ id: task1.id, add_dependencies: [{ task_id: task2.id, type: "blocks" }] }],
    });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/same project/i);
  });
});

// ---------------------------------------------------------------------------
// Delete tools
// ---------------------------------------------------------------------------

describe("delete_project", () => {
  it("deletes a project and returns count", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Delete Me Proj" }] }));

    const result = await callTool("delete_project", { ids: [proj.id] });
    const parsed = parseResult(result);
    expect(parsed.deleted).toBe(1);

    // Verify it's gone
    const getResult = await callTool("get_project", { id: proj.id });
    expect(getResult.isError).toBe(true);
    expect(getErrorText(getResult)).toMatch(/not found/i);
  });

  it("does not error when deleting non-existent id", async () => {
    const result = await callTool("delete_project", { ids: ["00000000000000000000000000"] });
    const parsed = parseResult(result);
    expect(parsed.deleted).toBe(1);
    expect(result.isError).toBeUndefined();
  });

  it("cascades to tasks when project is deleted", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Cascade Proj" }] }));
    const [task] = parseResult(await callTool("create_task", { items: [{ project_id: proj.id, title: "Cascade Task" }] }));

    await callTool("delete_project", { ids: [proj.id] });

    const taskResult = await callTool("get_task", { id: task.id });
    expect(taskResult.isError).toBe(true);
    expect(getErrorText(taskResult)).toMatch(/not found/i);
  });
});

describe("delete_task", () => {
  it("deletes a task and returns count", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Del Task Proj" }] }));
    const [task] = parseResult(await callTool("create_task", { items: [{ project_id: proj.id, title: "Delete Me Task" }] }));

    const result = await callTool("delete_task", { ids: [task.id] });
    const parsed = parseResult(result);
    expect(parsed.deleted).toBe(1);

    const getResult = await callTool("get_task", { id: task.id });
    expect(getResult.isError).toBe(true);
    expect(getErrorText(getResult)).toMatch(/not found/i);
  });

  it("does not error when deleting non-existent id", async () => {
    const result = await callTool("delete_task", { ids: ["00000000000000000000000000"] });
    const parsed = parseResult(result);
    expect(parsed.deleted).toBe(1);
    expect(result.isError).toBeUndefined();
  });
});

describe("delete_document", () => {
  it("deletes a document and returns count", async () => {
    const [doc] = parseResult(await callTool("create_document", { items: [{ title: "Delete Me Doc", tags: ["security"] }] }));

    const result = await callTool("delete_document", { ids: [doc.id] });
    const parsed = parseResult(result);
    expect(parsed.deleted).toBe(1);

    const getResult = await callTool("get_document", { id: doc.id });
    expect(getResult.isError).toBe(true);
    expect(getErrorText(getResult)).toMatch(/not found/i);
  });

  it("does not error when deleting non-existent id", async () => {
    const result = await callTool("delete_document", { ids: ["00000000000000000000000000"] });
    const parsed = parseResult(result);
    expect(parsed.deleted).toBe(1);
    expect(result.isError).toBeUndefined();
  });

  it("cleans up project associations when document is deleted", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Doc Assoc Proj" }] }));
    const [doc] = parseResult(await callTool("create_document", { items: [{ title: "Assoc Doc" }] }));
    await callTool("update_project", { items: [{ id: proj.id, attach_documents: [doc.id] }] });

    await callTool("delete_document", { ids: [doc.id] });

    const project = parseResult(await callTool("get_project", { id: proj.id }));
    expect(project.documents.every((d: { id: string }) => d.id !== doc.id)).toBe(true);
  });
});
