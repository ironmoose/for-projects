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

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

describe("list_actions", () => {
  it("kind filter returns only matching actions", async () => {
    // Create two actions with different kinds
    await callTool("create_actions", {
      items: [
        { kind: "plan", agent: "tab:orchestrator", prompt: "Plan prompt", entity_type: "project", entity_id: "fake1" },
        { kind: "goal", agent: "tab:executor", prompt: "Goal prompt", entity_type: "project", entity_id: "fake2" },
      ],
    });

    const list = parseResult(await callTool("list_actions", { kind: "plan" }));
    expect(list.data.length).toBeGreaterThanOrEqual(1);
    expect(list.data.every((a: { kind: string }) => a.kind === "plan")).toBe(true);
  });
});

describe("create_actions", () => {
  it("creates multiple actions in one call", async () => {
    // Use remaining kinds that haven't been created yet
    const result = await callTool("create_actions", {
      items: [
        { kind: "requirements", agent: "tab:orchestrator", prompt: "Req prompt", entity_type: "project", entity_id: "fake3" },
        { kind: "design", agent: "tab:executor", prompt: "Design prompt", entity_type: "task", entity_id: "fake4" },
      ],
    });

    const actions = parseResult(result);
    expect(actions).toHaveLength(2);
    expect(actions[0].kind).toBe("requirements");
    expect(actions[1].kind).toBe("design");
    expect(actions[0].id).toBeTruthy();
    expect(actions[1].id).toBeTruthy();
  });
});

describe("update_actions", () => {
  it("updates prompt on existing action", async () => {
    // Find an existing action to update
    const list = parseResult(await callTool("list_actions", { kind: "plan" }));
    const action = list.data[0];

    const result = await callTool("update_actions", {
      items: [{ id: action.id, prompt: "Updated plan prompt" }],
    });

    const updated = parseResult(result);
    expect(updated).toHaveLength(1);
    expect(updated[0].prompt).toBe("Updated plan prompt");
    expect(updated[0].kind).toBe("plan"); // unchanged
  });
});

// ---------------------------------------------------------------------------
// Action Logs
// ---------------------------------------------------------------------------

describe("create_action_log", () => {
  it("creates with action_id, entity_type, entity_id — status is always 'running'", async () => {
    const actions = parseResult(await callTool("list_actions", { kind: "plan" }));
    const actionId = actions.data[0].id;
    const proj = parseResult(await callTool("create_project", { title: "Create Log Proj" }));

    const result = await callTool("create_action_log", {
      items: [{ action_id: actionId, entity_type: "project", entity_id: proj.id }],
    });

    const entries = parseResult(result);
    expect(entries).toHaveLength(1);
    expect(entries[0].action_id).toBe(actionId);
    expect(entries[0].entity_type).toBe("project");
    expect(entries[0].entity_id).toBe(proj.id);
    expect(entries[0].status).toBe("running");
    expect(entries[0].output).toBeNull();
    expect(entries[0].started_at).toBeTruthy();
    expect(entries[0].finished_at).toBeNull();
  });

  it("rejects nonexistent action_id", async () => {
    const result = await callTool("create_action_log", {
      items: [{ action_id: "00000000000000000000000000", entity_type: "project", entity_id: "fake" }],
    });
    expect(result.isError).toBe(true);
  });
});

describe("list_action_logs", () => {
  it("filters by status work", async () => {
    const actions = parseResult(await callTool("list_actions", { kind: "plan" }));
    const actionId = actions.data[0].id;
    const proj = parseResult(await callTool("create_project", { title: "Log Test Proj" }));

    const created = parseResult(await callTool("create_action_log", {
      items: [{ action_id: actionId, entity_type: "project", entity_id: proj.id }],
    }));

    const list = parseResult(
      await callTool("list_action_logs", { status: "running" })
    );
    expect(list.data.length).toBeGreaterThanOrEqual(1);
    expect(list.data.every((e: { status: string }) => e.status === "running")).toBe(true);
    expect(list.data.some((e: { id: string }) => e.id === created[0].id)).toBe(true);
  });

  it("id filter works", async () => {
    const actions = parseResult(await callTool("list_actions", { kind: "goal" }));
    const actionId = actions.data[0].id;
    const proj = parseResult(await callTool("create_project", { title: "Log ID Filter" }));

    const created = parseResult(await callTool("create_action_log", {
      items: [{ action_id: actionId, entity_type: "project", entity_id: proj.id }],
    }));

    const list = parseResult(await callTool("list_action_logs", { id: created[0].id }));
    expect(list.data).toHaveLength(1);
    expect(list.data[0].id).toBe(created[0].id);
  });
});

describe("update_action_log", () => {
  async function createLogEntry(kind: string = "plan") {
    const actions = parseResult(await callTool("list_actions", { kind }));
    const proj = parseResult(await callTool("create_project", { title: `Log ${kind}` }));
    const created = parseResult(await callTool("create_action_log", {
      items: [{ action_id: actions.data[0].id, entity_type: "project", entity_id: proj.id }],
    }));
    return created[0];
  }

  it("status 'done' auto-sets finished_at", async () => {
    const entry = await createLogEntry("plan");

    const result = await callTool("update_action_log", {
      items: [{ id: entry.id, status: "done" }],
    });
    const updated = parseResult(result);
    expect(updated[0].status).toBe("done");
    expect(updated[0].finished_at).not.toBeNull();
  });

  it("status 'failed' auto-sets finished_at", async () => {
    const entry = await createLogEntry("goal");

    const result = await callTool("update_action_log", {
      items: [{ id: entry.id, status: "failed" }],
    });
    const updated = parseResult(result);
    expect(updated[0].status).toBe("failed");
    expect(updated[0].finished_at).not.toBeNull();
  });

  it("status 'running' does not set finished_at", async () => {
    const entry = await createLogEntry("requirements");

    const result = await callTool("update_action_log", {
      items: [{ id: entry.id, status: "running" }],
    });
    const updated = parseResult(result);
    expect(updated[0].status).toBe("running");
    expect(updated[0].finished_at).toBeNull();
  });

  it("optional output field is stored", async () => {
    const entry = await createLogEntry("design");

    const result = await callTool("update_action_log", {
      items: [{ id: entry.id, status: "done", output: "Task completed successfully" }],
    });
    const updated = parseResult(result);
    expect(updated[0].output).toBe("Task completed successfully");
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

  it("delete_actions is not found", async () => {
    const result = await callTool("delete_actions", { ids: ["fake"] });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/tool.*not found|unknown tool/i);
  });

  it("query is not found", async () => {
    const result = await callTool("query", { sql: "SELECT 1" });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/tool.*not found|unknown tool/i);
  });
});
