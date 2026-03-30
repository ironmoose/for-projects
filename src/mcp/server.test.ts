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
  it("returns empty list when filtering for nonexistent id", async () => {
    const result = await callTool("list_projects", { id: "00000000000000000000000000" });
    const parsed = parseResult(result);
    expect(parsed.data).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  it("returns created projects with correct total", async () => {
    const createResult = await callTool("create_project", { title: "List Test Project" });
    const project = parseResult(createResult);

    const listResult = await callTool("list_projects", { id: project.id });
    const parsed = parseResult(listResult);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.total).toBe(1);
    expect(parsed.data[0].title).toBe("List Test Project");
  });

  it("id filter returns single project in data array", async () => {
    const c1 = await callTool("create_project", { title: "Filter A" });
    const p1 = parseResult(c1);
    await callTool("create_project", { title: "Filter B" });

    const listResult = await callTool("list_projects", { id: p1.id });
    const parsed = parseResult(listResult);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].id).toBe(p1.id);
  });
});

describe("create_project", () => {
  it("creates with title only, optional fields are null", async () => {
    const result = await callTool("create_project", { title: "Title Only" });
    const project = parseResult(result);

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
      title: "Full",
      goal: "Ship it",
      requirements: "Be fast",
      design: "Monolith",
    });
    const project = parseResult(result);

    expect(project.title).toBe("Full");
    expect(project.goal).toBe("Ship it");
    expect(project.requirements).toBe("Be fast");
    expect(project.design).toBe("Monolith");
  });

  it("rejects missing title", async () => {
    const result = await callTool("create_project", {});
    expect(result.isError).toBe(true);
  });
});

describe("update_project", () => {
  it("updates single field, others unchanged", async () => {
    const created = parseResult(
      await callTool("create_project", { title: "Before", goal: "Original Goal" })
    );

    const updated = parseResult(
      await callTool("update_project", { id: created.id, title: "After" })
    );

    expect(updated.title).toBe("After");
    expect(updated.goal).toBe("Original Goal");
  });

  it("rejects unknown id", async () => {
    const result = await callTool("update_project", {
      id: "00000000000000000000000000",
      title: "Nope",
    });
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

describe("list_tasks", () => {
  it("project_id filter returns only matching tasks", async () => {
    const p1 = parseResult(await callTool("create_project", { title: "Task Proj 1" }));
    const p2 = parseResult(await callTool("create_project", { title: "Task Proj 2" }));

    await callTool("create_task", { project_id: p1.id, title: "T1" });
    await callTool("create_task", { project_id: p2.id, title: "T2" });

    const list = parseResult(await callTool("list_tasks", { project_id: p1.id }));
    expect(list.data.every((t: { project_id: string }) => t.project_id === p1.id)).toBe(true);
    expect(list.data.some((t: { title: string }) => t.title === "T1")).toBe(true);
  });

  it("id filter works", async () => {
    const proj = parseResult(await callTool("create_project", { title: "ID Filter Proj" }));
    const task = parseResult(
      await callTool("create_task", { project_id: proj.id, title: "Find Me" })
    );

    const list = parseResult(await callTool("list_tasks", { id: task.id }));
    expect(list.data).toHaveLength(1);
    expect(list.data[0].id).toBe(task.id);
  });
});

describe("create_task", () => {
  it("creates with project_id + title", async () => {
    const proj = parseResult(await callTool("create_project", { title: "Task Parent" }));
    const task = parseResult(
      await callTool("create_task", { project_id: proj.id, title: "New Task" })
    );

    expect(task.id).toBeTruthy();
    expect(task.project_id).toBe(proj.id);
    expect(task.title).toBe("New Task");
    expect(task.plan).toBeNull();
  });

  it("rejects missing project_id", async () => {
    const result = await callTool("create_task", { title: "Orphan" });
    expect(result.isError).toBe(true);
  });
});

describe("update_task", () => {
  it("updates title and plan", async () => {
    const proj = parseResult(await callTool("create_project", { title: "Update Task Proj" }));
    const task = parseResult(
      await callTool("create_task", { project_id: proj.id, title: "Old Title" })
    );

    const updated = parseResult(
      await callTool("update_task", {
        id: task.id,
        project_id: proj.id,
        title: "New Title",
        plan: "The plan",
      })
    );

    expect(updated.title).toBe("New Title");
    expect(updated.plan).toBe("The plan");
  });
});

describe("create_task with new fields", () => {
  it("creates task with new fields", async () => {
    const proj = parseResult(await callTool("create_project", { title: "New Fields Proj" }));
    const task = parseResult(
      await callTool("create_task", {
        project_id: proj.id,
        title: "Full Task",
        description: "A description",
        implementation: "Some impl",
        acceptance_criteria: "It passes",
      })
    );

    expect(task.description).toBe("A description");
    expect(task.implementation).toBe("Some impl");
    expect(task.acceptance_criteria).toBe("It passes");
  });
});

describe("update_task with new fields", () => {
  it("updates new fields via update_task", async () => {
    const proj = parseResult(await callTool("create_project", { title: "Update New Fields Proj" }));
    const task = parseResult(
      await callTool("create_task", { project_id: proj.id, title: "Bare Task" })
    );

    const updated = parseResult(
      await callTool("update_task", {
        id: task.id,
        project_id: proj.id,
        description: "Now has description",
      })
    );

    expect(updated.description).toBe("Now has description");
    expect(updated.implementation).toBeNull();
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
