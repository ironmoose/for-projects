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
  ctx.db!.close();
  rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

describe("list_projects", () => {
  it("returns created projects with correct total", async () => {
    await callTool("create_project", { items: [{ title: "List Test Project", summary: "S" }] });

    const listResult = await callTool("list_projects");
    const parsed = parseResult(listResult);
    expect(parsed.data.length).toBeGreaterThanOrEqual(1);
    expect(parsed.total).toBeGreaterThanOrEqual(1);
    expect(parsed.data[0].id).toBeTruthy();
    expect(parsed.data[0].title).toBeTruthy();
    expect(parsed.data[0].created_at).toBeTruthy();
    expect(parsed.data[0].updated_at).toBeTruthy();
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
      await callTool("create_project", { items: [{ title: "Get Me", summary: "A summary" }] })
    );

    const result = await callTool("get_project", { id: created.id });
    const project = parseResult(result);
    expect(project.id).toBe(created.id);
    expect(project.title).toBe("Get Me");
    expect(project.summary).toBe("A summary");
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
    expect(project.summary).toBeNull();
    expect(project.created_at).toBeTruthy();
    expect(project.updated_at).toBeTruthy();
  });

  it("creates with all optional fields populated", async () => {
    const result = await callTool("create_project", {
      items: [{
        title: "Full",
        summary: "Ship it fast",
      }],
    });
    const [project] = parseResult(result);

    expect(project.title).toBe("Full");
    expect(project.summary).toBe("Ship it fast");
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
      await callTool("create_project", { items: [{ title: "Before", summary: "Original Summary" }] })
    );

    const [updated] = parseResult(
      await callTool("update_project", { items: [{ id: created.id, title: "After" }] })
    );

    expect(updated.title).toBe("After");
    expect(updated.summary).toBe("Original Summary");
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

  it("accepts status filter as array", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Multi Status Proj" }] }));
    await callTool("create_task", { items: [
      { project_id: proj.id, title: "Todo Task", status: "todo" },
      { project_id: proj.id, title: "In Progress Task", status: "in_progress" },
      { project_id: proj.id, title: "Done Task", status: "done" },
    ] });

    const list = parseResult(await callTool("list_tasks", { project_id: proj.id, status: ["todo", "in_progress"] }));
    expect(list.data.length).toBe(2);
    const statuses = list.data.map((t: { status: string }) => t.status);
    expect(statuses).toContain("todo");
    expect(statuses).toContain("in_progress");
    expect(statuses).not.toContain("done");
  });

  it("returns summary fields in list results", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Summary Fields Proj" }] }));
    await callTool("create_task", {
      items: [{ project_id: proj.id, title: "Summary Task", summary: "S" }],
    });

    const list = parseResult(await callTool("list_tasks", { project_id: proj.id }));
    const task = list.data.find((t: { title: string }) => t.title === "Summary Task");
    expect(task.id).toBeTruthy();
    expect(task.project_id).toBe(proj.id);
    expect(task.title).toBe("Summary Task");
    expect(task.status).toBeTruthy();
    expect(task.created_at).toBeTruthy();
    expect(task.updated_at).toBeTruthy();
  });
});

describe("get_task", () => {
  it("returns full task entity by id", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Get Task Proj" }] }));
    const [created] = parseResult(
      await callTool("create_task", {
        items: [{ project_id: proj.id, title: "Full Task", summary: "A summary" }],
      })
    );

    const result = await callTool("get_task", { id: created.id });
    const task = parseResult(result);
    expect(task.id).toBe(created.id);
    expect(task.title).toBe("Full Task");
    expect(task.summary).toBe("A summary");
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
    expect(task.summary).toBeNull();
  });

  it("rejects missing project_id", async () => {
    const result = await callTool("create_task", { items: [{ title: "Orphan" }] });
    expect(result.isError).toBe(true);
  });
});

describe("update_task", () => {
  it("updates title and summary", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Update Task Proj" }] }));
    const [task] = parseResult(
      await callTool("create_task", { items: [{ project_id: proj.id, title: "Old Title" }] })
    );

    const [updated] = parseResult(
      await callTool("update_task", {
        items: [{ id: task.id, title: "New Title", summary: "The summary" }],
      })
    );

    expect(updated.title).toBe("New Title");
    expect(updated.summary).toBe("The summary");
  });
});

describe("create_task with all fields", () => {
  it("creates task with summary", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "New Fields Proj" }] }));
    const [task] = parseResult(
      await callTool("create_task", {
        items: [{
          project_id: proj.id,
          title: "Full Task",
          summary: "A summary",
        }],
      })
    );

    expect(task.summary).toBe("A summary");
  });
});

describe("update_task with optional fields", () => {
  it("updates summary via update_task", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Update New Fields Proj" }] }));
    const [task] = parseResult(
      await callTool("create_task", { items: [{ project_id: proj.id, title: "Bare Task" }] })
    );

    const [updated] = parseResult(
      await callTool("update_task", {
        items: [{ id: task.id, summary: "Now has summary" }],
      })
    );

    expect(updated.summary).toBe("Now has summary");
  });
});

// ---------------------------------------------------------------------------
// Task context and acceptance_criteria round-trip
// ---------------------------------------------------------------------------

describe("create_task with context and acceptance_criteria", () => {
  it("creates task with both fields", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Context AC MCP Proj" }] }));
    const [task] = parseResult(
      await callTool("create_task", {
        items: [{
          project_id: proj.id,
          title: "Context AC Task",
          context: "Background info",
          acceptance_criteria: "All tests green",
        }],
      })
    );

    expect(task.context).toBe("Background info");
    expect(task.acceptance_criteria).toBe("All tests green");
  });

  it("defaults context and acceptance_criteria to null", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Default CA Proj" }] }));
    const [task] = parseResult(
      await callTool("create_task", {
        items: [{ project_id: proj.id, title: "Bare CA Task" }],
      })
    );

    expect(task.context).toBeNull();
    expect(task.acceptance_criteria).toBeNull();
  });
});

describe("get_task returns context and acceptance_criteria", () => {
  it("round-trips context and acceptance_criteria via get_task", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Get CA Proj" }] }));
    const [created] = parseResult(
      await callTool("create_task", {
        items: [{
          project_id: proj.id,
          title: "Roundtrip Task",
          context: "Task context",
          acceptance_criteria: "Task AC",
        }],
      })
    );

    const task = parseResult(await callTool("get_task", { id: created.id }));
    expect(task.context).toBe("Task context");
    expect(task.acceptance_criteria).toBe("Task AC");
  });
});

describe("list_tasks excludes context and acceptance_criteria", () => {
  it("returns has_ booleans instead of full text", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "List CA Proj" }] }));
    await callTool("create_task", {
      items: [{
        project_id: proj.id,
        title: "Listed CA Task",
        context: "Should not appear",
        acceptance_criteria: "Should not appear",
      }],
    });

    const list = parseResult(await callTool("list_tasks", { project_id: proj.id }));
    const task = list.data.find((t: { title: string }) => t.title === "Listed CA Task");
    expect(task).toBeTruthy();
    expect(task.context).toBeUndefined();
    expect(task.acceptance_criteria).toBeUndefined();
    expect(task.has_context).toBe(true);
    expect(task.has_acceptance_criteria).toBe(true);
  });
});

describe("update_task with context and acceptance_criteria", () => {
  it("sets context and acceptance_criteria", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Update CA Proj" }] }));
    const [task] = parseResult(
      await callTool("create_task", { items: [{ project_id: proj.id, title: "Update CA Task" }] })
    );

    const [updated] = parseResult(
      await callTool("update_task", {
        items: [{
          id: task.id,
          context: "Added context",
          acceptance_criteria: "Added AC",
        }],
      })
    );

    expect(updated.context).toBe("Added context");
    expect(updated.acceptance_criteria).toBe("Added AC");
  });

  it("updates only context, preserving acceptance_criteria", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Partial Update CA Proj" }] }));
    const [task] = parseResult(
      await callTool("create_task", {
        items: [{
          project_id: proj.id,
          title: "Partial Update Task",
          context: "Original context",
          acceptance_criteria: "Original AC",
        }],
      })
    );

    const [updated] = parseResult(
      await callTool("update_task", {
        items: [{ id: task.id, context: "Changed context" }],
      })
    );

    expect(updated.context).toBe("Changed context");
    expect(updated.acceptance_criteria).toBe("Original AC");
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
        { title: "Project B", summary: "Ship B" },
      ],
    });
    const projects = parseResult(result);
    expect(projects).toHaveLength(2);
    expect(projects[0].title).toBe("Project A");
    expect(projects[1].title).toBe("Project B");
    expect(projects[1].summary).toBe("Ship B");
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
        { id: b.id, summary: "New summary" },
      ],
    });
    const updated = parseResult(result);
    expect(updated).toHaveLength(2);
    expect(updated[0].title).toBe("A Updated");
    expect(updated[1].summary).toBe("New summary");
  });
});

describe("batch create_task", () => {
  it("creates multiple tasks via items array", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Batch Task Proj" }] }));
    const result = await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "Task A" },
        { project_id: proj.id, title: "Task B", summary: "Do B" },
      ],
    });
    const tasks = parseResult(result);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe("Task A");
    expect(tasks[1].title).toBe("Task B");
    expect(tasks[1].summary).toBe("Do B");
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
        { id: a.id, title: "TA Updated" },
        { id: b.id, summary: "New summary" },
      ],
    });
    const updated = parseResult(result);
    expect(updated).toHaveLength(2);
    expect(updated[0].title).toBe("TA Updated");
    expect(updated[1].summary).toBe("New summary");
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

describe("document summary field via MCP", () => {
  it("create_document with summary returns summary in response", async () => {
    const result = await callTool("create_document", {
      items: [{ title: "MCP Summary Doc", summary: "Short summary", content: "Full content" }],
    });
    const [doc] = parseResult(result);
    expect(doc.summary).toBe("Short summary");
    expect(doc.content).toBe("Full content");
  });

  it("create_document without summary defaults to null", async () => {
    const result = await callTool("create_document", {
      items: [{ title: "MCP No Summary Doc" }],
    });
    const [doc] = parseResult(result);
    expect(doc.summary).toBeNull();
  });

  it("update_document with summary", async () => {
    const [created] = parseResult(
      await callTool("create_document", { items: [{ title: "MCP Update Summary Doc" }] })
    );
    expect(created.summary).toBeNull();

    const [updated] = parseResult(
      await callTool("update_document", {
        items: [{ id: created.id, summary: "Added summary" }],
      })
    );
    expect(updated.summary).toBe("Added summary");
  });

  it("list_documents includes summary in each document summary", async () => {
    await callTool("create_document", {
      items: [{ title: "McpSummaryListUnique777", summary: "Listed summary" }],
    });

    const listResult = await callTool("list_documents", { title: "McpSummaryListUnique777" });
    const parsed = parseResult(listResult);
    expect(parsed.data.length).toBeGreaterThanOrEqual(1);
    const found = parsed.data.find((d: { title: string }) => d.title === "McpSummaryListUnique777");
    expect(found).toBeTruthy();
    expect(found.summary).toBe("Listed summary");
  });

  it("get_document includes summary", async () => {
    const [created] = parseResult(
      await callTool("create_document", {
        items: [{ title: "MCP Get Summary Doc", summary: "Get me summary" }],
      })
    );

    const doc = parseResult(await callTool("get_document", { id: created.id }));
    expect(doc.summary).toBe("Get me summary");
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

describe("list_documents with search filter", () => {
  it("search matches by title", async () => {
    await callTool("create_document", { items: [{ title: "McpSearchTitleMatch111" }] });
    const result = parseResult(await callTool("list_documents", { search: "McpSearchTitleMatch111" }));
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.some((d: { title: string }) => d.title === "McpSearchTitleMatch111")).toBe(true);
  });

  it("search matches by summary", async () => {
    await callTool("create_document", { items: [{ title: "McpSearchSummaryDoc222", summary: "mcp_unique_summary_needle" }] });
    const result = parseResult(await callTool("list_documents", { search: "mcp_unique_summary_needle" }));
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.some((d: { title: string }) => d.title === "McpSearchSummaryDoc222")).toBe(true);
  });

  it("search returns empty for no match", async () => {
    const result = parseResult(await callTool("list_documents", { search: "zzz_mcp_no_match_888" }));
    expect(result.data.length).toBe(0);
  });

  it("search with null summary still finds by title", async () => {
    await callTool("create_document", { items: [{ title: "McpNullSumSearch333" }] });
    const result = parseResult(await callTool("list_documents", { search: "McpNullSumSearch333" }));
    expect(result.data.length).toBeGreaterThanOrEqual(1);
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

describe("update_project with document references merge-patch", () => {
  it("documents merge-patch attaches documents, verify via get_project", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Doc Attach Proj" }] }));
    const [doc] = parseResult(await callTool("create_document", { items: [{ title: "Attachable Doc" }] }));

    await callTool("update_project", {
      items: [{ id: proj.id, documents: { [doc.id]: [{ type: "reference" }] } }],
    });

    const project = parseResult(await callTool("get_project", { id: proj.id }));
    expect(project.documents).toBeTruthy();
    expect(project.documents.length).toBeGreaterThanOrEqual(1);
    expect(project.documents.some((d: { document_id: string }) => d.document_id === doc.id)).toBe(true);
  });

  it("documents merge-patch with null removes documents, verify via get_project", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Doc Detach Proj" }] }));
    const [doc] = parseResult(await callTool("create_document", { items: [{ title: "Detachable Doc" }] }));

    await callTool("update_project", {
      items: [{ id: proj.id, documents: { [doc.id]: [{ type: "design" }] } }],
    });

    // Verify attached
    let project = parseResult(await callTool("get_project", { id: proj.id }));
    expect(project.documents.some((d: { document_id: string }) => d.document_id === doc.id)).toBe(true);

    // Detach via null
    await callTool("update_project", {
      items: [{ id: proj.id, documents: { [doc.id]: null } }],
    });

    project = parseResult(await callTool("get_project", { id: proj.id }));
    expect(project.documents.every((d: { document_id: string }) => d.document_id !== doc.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task document references merge-patch via MCP
// ---------------------------------------------------------------------------

describe("create_task with documents merge-patch", () => {
  it("creates task with document references attached", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Task Doc Create Proj" }] }));
    const [doc] = parseResult(await callTool("create_document", { items: [{ title: "Task Doc Create Doc" }] }));

    const result = await callTool("create_task", {
      items: [{
        project_id: proj.id,
        title: "Task with docs via MCP",
        documents: { [doc.id]: [{ type: "goal" }, { type: "plan" }] },
      }],
    });
    expect(result.isError).toBeUndefined();
    const [task] = parseResult(result);
    expect(task.id).toBeTruthy();

    // Verify via get_task
    const fetched = parseResult(await callTool("get_task", { id: task.id }));
    expect(fetched.documents).toBeArray();
    expect(fetched.documents.length).toBe(2);
    const types = fetched.documents.map((d: { type: string }) => d.type).sort();
    expect(types).toEqual(["goal", "plan"]);
    expect(fetched.documents.every((d: { document_id: string }) => d.document_id === doc.id)).toBe(true);
  });
});

describe("update_task with documents merge-patch", () => {
  it("attaches documents to task via update_task, verify via get_task", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Task Doc Update Proj" }] }));
    const [doc] = parseResult(await callTool("create_document", { items: [{ title: "Task Doc Update Doc" }] }));
    const [task] = parseResult(await callTool("create_task", {
      items: [{ project_id: proj.id, title: "Task to attach docs" }],
    }));

    await callTool("update_task", {
      items: [{ id: task.id, documents: { [doc.id]: [{ type: "design" }, { type: "reference" }] } }],
    });

    const fetched = parseResult(await callTool("get_task", { id: task.id }));
    expect(fetched.documents).toBeArray();
    expect(fetched.documents.length).toBe(2);
    const types = fetched.documents.map((d: { type: string }) => d.type).sort();
    expect(types).toEqual(["design", "reference"]);
  });

  it("documents merge-patch with null removes documents from task", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Task Doc Detach Proj" }] }));
    const [doc] = parseResult(await callTool("create_document", { items: [{ title: "Task Doc Detach Doc" }] }));
    const [task] = parseResult(await callTool("create_task", {
      items: [{
        project_id: proj.id,
        title: "Task to detach docs",
        documents: { [doc.id]: [{ type: "requirements" }] },
      }],
    }));

    // Verify attached
    let fetched = parseResult(await callTool("get_task", { id: task.id }));
    expect(fetched.documents.some((d: { document_id: string }) => d.document_id === doc.id)).toBe(true);

    // Detach via null
    await callTool("update_task", {
      items: [{ id: task.id, documents: { [doc.id]: null } }],
    });

    fetched = parseResult(await callTool("get_task", { id: task.id }));
    expect(fetched.documents.every((d: { document_id: string }) => d.document_id !== doc.id)).toBe(true);
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

  it("delete_project is not found", async () => {
    const result = await callTool("delete_project", { ids: ["fake"] });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/tool.*not found|unknown tool/i);
  });

  it("delete_task is not found", async () => {
    const result = await callTool("delete_task", { ids: ["fake"] });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/tool.*not found|unknown tool/i);
  });

  it("delete_document is not found", async () => {
    const result = await callTool("delete_document", { ids: ["fake"] });
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
  });
});

describe("get_dependency_graph", () => {
  it("returns tasks and edges for a project", async () => {
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
    }

    // Verify edges
    expect(graph.edges).toBeArray();
    expect(graph.edges.length).toBe(2);
    for (const e of graph.edges) {
      expect(e.source).toBeTruthy();
      expect(e.target).toBeTruthy();
      expect(e.type).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// get_dependency_graph status filtering
// ---------------------------------------------------------------------------

describe("get_dependency_graph status filtering", () => {
  let proj: { id: string };
  let taskA: { id: string }; // todo — blocks taskB
  let taskB: { id: string }; // in_progress — blocked by taskA
  let taskC: { id: string }; // done — blocks taskD
  let taskD: { id: string }; // todo — blocked by taskC (but C is done)

  beforeAll(async () => {
    [proj] = parseResult(await callTool("create_project", { items: [{ title: "MCP Graph Filter Proj" }] }));
    [taskA, taskB, taskC, taskD] = parseResult(await callTool("create_task", {
      items: [
        { project_id: proj.id, title: "GF Task A" },
        { project_id: proj.id, title: "GF Task B", status: "in_progress" },
        { project_id: proj.id, title: "GF Task C", status: "done" },
        { project_id: proj.id, title: "GF Task D" },
      ],
    }));

    // A blocks B
    await callTool("update_task", {
      items: [{ id: taskB.id, add_dependencies: [{ task_id: taskA.id, type: "blocks" }] }],
    });
    // C blocks D
    await callTool("update_task", {
      items: [{ id: taskD.id, add_dependencies: [{ task_id: taskC.id, type: "blocks" }] }],
    });
    // B relates_to C
    await callTool("update_task", {
      items: [{ id: taskC.id, add_dependencies: [{ task_id: taskB.id, type: "relates_to" }] }],
    });
  });

  it("get_dependency_graph with status param filters tasks and edges", async () => {
    const graph = parseResult(await callTool("get_dependency_graph", { project_id: proj.id, status: ["todo"] }));
    // Only todo tasks: A and D
    expect(graph.tasks.every((t: { status: string }) => t.status === "todo")).toBe(true);
    const taskIds = graph.tasks.map((t: { id: string }) => t.id);
    expect(taskIds).toContain(taskA.id);
    expect(taskIds).toContain(taskD.id);
    expect(taskIds).not.toContain(taskB.id);
    expect(taskIds).not.toContain(taskC.id);

    // Edges should only connect visible tasks
    const taskIdSet = new Set(taskIds);
    for (const e of graph.edges) {
      expect(taskIdSet.has(e.source)).toBe(true);
      expect(taskIdSet.has(e.target)).toBe(true);
    }
  });

  it("get_dependency_graph without status returns all tasks (backward compatible)", async () => {
    const graph = parseResult(await callTool("get_dependency_graph", { project_id: proj.id }));
    expect(graph.tasks.length).toBe(4);
    const taskIds = graph.tasks.map((t: { id: string }) => t.id);
    expect(taskIds).toContain(taskA.id);
    expect(taskIds).toContain(taskB.id);
    expect(taskIds).toContain(taskC.id);
    expect(taskIds).toContain(taskD.id);
    expect(graph.edges.length).toBe(3);
  });

});

describe("dependency error cases via MCP", () => {
  it("cyclic blocks dependencies succeed via update_task", async () => {
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

    // B blocks A (creates cycle — now allowed)
    const result = await callTool("update_task", {
      items: [{ id: taskA.id, add_dependencies: [{ task_id: taskB.id, type: "blocks" }] }],
    });
    expect(result.isError).toBeFalsy();
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
// Import document via MCP
// ---------------------------------------------------------------------------

describe("import_document", () => {
  it("returns error for unsupported URL", async () => {
    const result = await callTool("import_document", {
      items: [{ url: "https://example.com/not-a-known-source" }],
    });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/no connector/i);
  });

  it("returns error when url is empty", async () => {
    const result = await callTool("import_document", {
      items: [{ url: "" }],
    });
    expect(result.isError).toBe(true);
  });
});

