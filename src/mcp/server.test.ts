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
// Agents
// ---------------------------------------------------------------------------

describe("create_agents", () => {
  it("creates with identifier, agent, prompt", async () => {
    const result = await callTool("create_agents", {
      items: [
        { identifier: "plan", agent: "tab:orchestrator", prompt: "Plan prompt" },
        { identifier: "goal", agent: "tab:executor", prompt: "Goal prompt" },
      ],
    });

    const agents = parseResult(result);
    expect(agents).toHaveLength(2);
    expect(agents[0].identifier).toBe("plan");
    expect(agents[0].agent).toBe("tab:orchestrator");
    expect(agents[0].prompt).toBe("Plan prompt");
    expect(agents[0].enabled).toBe(1);
    expect(agents[1].identifier).toBe("goal");
    expect(agents[1].agent).toBe("tab:executor");
    expect(agents[1].id).toBeTruthy();
  });
});

describe("list_agents", () => {
  it("filters by identifier", async () => {
    const list = parseResult(await callTool("list_agents", { identifier: "plan" }));
    expect(list.data.length).toBeGreaterThanOrEqual(1);
    expect(list.data.every((a: { identifier: string }) => a.identifier === "plan")).toBe(true);
  });

  it("filters by enabled", async () => {
    // Create a disabled agent
    const created = parseResult(await callTool("create_agents", {
      items: [{ identifier: "disabled-mcp", agent: "tab:orchestrator", prompt: "Disabled" }],
    }));
    await callTool("update_agents", {
      items: [{ id: created[0].id, enabled: 0 }],
    });

    const enabledList = parseResult(await callTool("list_agents", { enabled: 1 }));
    expect(enabledList.data.every((a: { enabled: number }) => a.enabled === 1)).toBe(true);

    const disabledList = parseResult(await callTool("list_agents", { enabled: 0 }));
    expect(disabledList.data.length).toBeGreaterThanOrEqual(1);
    expect(disabledList.data.every((a: { enabled: number }) => a.enabled === 0)).toBe(true);
  });
});

describe("update_agents", () => {
  it("updates prompt on existing agent", async () => {
    const list = parseResult(await callTool("list_agents", { identifier: "plan" }));
    const agent = list.data[0];

    const result = await callTool("update_agents", {
      items: [{ id: agent.id, prompt: "Updated plan prompt" }],
    });

    const updated = parseResult(result);
    expect(updated).toHaveLength(1);
    expect(updated[0].prompt).toBe("Updated plan prompt");
    expect(updated[0].identifier).toBe("plan"); // unchanged
  });

  it("updates identifier", async () => {
    const created = parseResult(await callTool("create_agents", {
      items: [{ identifier: "rename-mcp", agent: "tab:orchestrator", prompt: "Test" }],
    }));

    const result = await callTool("update_agents", {
      items: [{ id: created[0].id, identifier: "renamed-mcp" }],
    });

    const updated = parseResult(result);
    expect(updated[0].identifier).toBe("renamed-mcp");
  });

  it("updates enabled", async () => {
    const created = parseResult(await callTool("create_agents", {
      items: [{ identifier: "toggle-mcp", agent: "tab:executor", prompt: "Test" }],
    }));

    const result = await callTool("update_agents", {
      items: [{ id: created[0].id, enabled: 0 }],
    });

    const updated = parseResult(result);
    expect(updated[0].enabled).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

describe("create_run", () => {
  it("creates with agent string, entity_type, entity_id — status is always running", async () => {
    const proj = parseResult(await callTool("create_project", { title: "Create Run Proj" }));

    const result = await callTool("create_run", {
      items: [{ agent: "plan", entity_type: "project", entity_id: proj.id }],
    });

    const entries = parseResult(result);
    expect(entries).toHaveLength(1);
    expect(entries[0].agent).toBe("plan");
    expect(entries[0].entity_type).toBe("project");
    expect(entries[0].entity_id).toBe(proj.id);
    expect(entries[0].status).toBe("running");
    expect(entries[0].output).toBeNull();
    expect(entries[0].started_at).toBeTruthy();
    expect(entries[0].finished_at).toBeNull();
  });

  it("does not validate agent exists — stores any string", async () => {
    const proj = parseResult(await callTool("create_project", { title: "Any Agent Run" }));

    const result = await callTool("create_run", {
      items: [{ agent: "nonexistent-agent", entity_type: "project", entity_id: proj.id }],
    });

    expect(result.isError).toBeFalsy();
    const entries = parseResult(result);
    expect(entries[0].agent).toBe("nonexistent-agent");
  });
});

describe("list_runs", () => {
  it("filters by status", async () => {
    const proj = parseResult(await callTool("create_project", { title: "List Run Proj" }));

    await callTool("create_run", {
      items: [{ agent: "plan", entity_type: "project", entity_id: proj.id }],
    });

    const list = parseResult(await callTool("list_runs", { status: "running" }));
    expect(list.data.length).toBeGreaterThanOrEqual(1);
    expect(list.data.every((e: { status: string }) => e.status === "running")).toBe(true);
  });

  it("filters by agent", async () => {
    const proj = parseResult(await callTool("create_project", { title: "Agent Filter Run" }));
    await callTool("create_run", {
      items: [{ agent: "special-filter-agent", entity_type: "project", entity_id: proj.id }],
    });

    const list = parseResult(await callTool("list_runs", { agent: "special-filter-agent" }));
    expect(list.data.length).toBeGreaterThanOrEqual(1);
    expect(list.data.every((e: { agent: string }) => e.agent === "special-filter-agent")).toBe(true);
  });

  it("filters by id", async () => {
    const proj = parseResult(await callTool("create_project", { title: "ID Filter Run" }));
    const created = parseResult(await callTool("create_run", {
      items: [{ agent: "goal", entity_type: "project", entity_id: proj.id }],
    }));

    const list = parseResult(await callTool("list_runs", { id: created[0].id }));
    expect(list.data).toHaveLength(1);
    expect(list.data[0].id).toBe(created[0].id);
  });
});

describe("update_run", () => {
  async function createRunEntry(agent: string = "plan") {
    const proj = parseResult(await callTool("create_project", { title: `Run ${agent}` }));
    const created = parseResult(await callTool("create_run", {
      items: [{ agent, entity_type: "project", entity_id: proj.id }],
    }));
    return created[0];
  }

  it("status 'done' auto-sets finished_at", async () => {
    const entry = await createRunEntry("plan");

    const result = await callTool("update_run", {
      items: [{ id: entry.id, status: "done" }],
    });
    const updated = parseResult(result);
    expect(updated[0].status).toBe("done");
    expect(updated[0].finished_at).not.toBeNull();
  });

  it("status 'failed' auto-sets finished_at", async () => {
    const entry = await createRunEntry("goal");

    const result = await callTool("update_run", {
      items: [{ id: entry.id, status: "failed" }],
    });
    const updated = parseResult(result);
    expect(updated[0].status).toBe("failed");
    expect(updated[0].finished_at).not.toBeNull();
  });

  it("status 'cancelled' auto-sets finished_at", async () => {
    const entry = await createRunEntry("plan");

    const result = await callTool("update_run", {
      items: [{ id: entry.id, status: "cancelled" }],
    });
    const updated = parseResult(result);
    expect(updated[0].status).toBe("cancelled");
    expect(updated[0].finished_at).not.toBeNull();
  });

  it("status 'todo' does NOT set finished_at", async () => {
    const entry = await createRunEntry("plan");

    const result = await callTool("update_run", {
      items: [{ id: entry.id, status: "todo" }],
    });
    const updated = parseResult(result);
    expect(updated[0].status).toBe("todo");
    expect(updated[0].finished_at).toBeNull();
  });

  it("status 'running' does NOT set finished_at", async () => {
    const entry = await createRunEntry("plan");

    const result = await callTool("update_run", {
      items: [{ id: entry.id, status: "running" }],
    });
    const updated = parseResult(result);
    expect(updated[0].status).toBe("running");
    expect(updated[0].finished_at).toBeNull();
  });

  it("optional output field is stored", async () => {
    const entry = await createRunEntry("plan");

    const result = await callTool("update_run", {
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

  it("delete_agents is not found", async () => {
    const result = await callTool("delete_agents", { ids: ["fake"] });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/tool.*not found|unknown tool/i);
  });

  it("query is not found", async () => {
    const result = await callTool("query", { sql: "SELECT 1" });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/tool.*not found|unknown tool/i);
  });
});
