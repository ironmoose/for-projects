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
    await callTool("create_project", { items: [{ title: "List Test Project" }] });

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

  it("returns summary fields in list results", async () => {
    const [proj] = parseResult(await callTool("create_project", { items: [{ title: "Summary Fields Proj" }] }));
    await callTool("create_task", { items: [{ project_id: proj.id, title: "Summary Task" }] });

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

describe("batch create_agent", () => {
  it("creates multiple agents via items array", async () => {
    const result = await callTool("create_agent", {
      items: [
        { name: "Agent A" },
        { name: "Agent B", description: "B desc" },
      ],
    });
    const agents = parseResult(result);
    expect(agents).toHaveLength(2);
    expect(agents[0].name).toBe("Agent A");
    expect(agents[1].name).toBe("Agent B");
    expect(agents[1].description).toBe("B desc");
  });
});

describe("batch update_agent", () => {
  it("updates multiple agents via items array", async () => {
    const [a, b] = parseResult(await callTool("create_agent", {
      items: [{ name: "UA" }, { name: "UB" }],
    }));

    const result = await callTool("update_agent", {
      items: [
        { id: a.id, name: "UA Updated" },
        { id: b.id, description: "New agent desc" },
      ],
    });
    const updated = parseResult(result);
    expect(updated).toHaveLength(2);
    expect(updated[0].name).toBe("UA Updated");
    expect(updated[1].description).toBe("New agent desc");
  });
});

describe("batch create_job", () => {
  it("creates multiple jobs via items array", async () => {
    const [agent] = parseResult(await callTool("create_agent", { items: [{ name: "Job Batch Agent" }] }));
    const result = await callTool("create_job", {
      items: [
        { agent_id: agent.id },
        { agent_id: agent.id, input: "some input" },
      ],
    });
    const jobs = parseResult(result);
    expect(jobs).toHaveLength(2);
    expect(jobs[0].agent_id).toBe(agent.id);
    expect(jobs[1].input).toBe("some input");
  });
});

describe("batch update_job", () => {
  it("updates multiple jobs via items array", async () => {
    const [agent] = parseResult(await callTool("create_agent", { items: [{ name: "Job Update Batch Agent" }] }));
    const [a, b] = parseResult(await callTool("create_job", {
      items: [
        { agent_id: agent.id },
        { agent_id: agent.id },
      ],
    }));

    const result = await callTool("update_job", {
      items: [
        { id: a.id, status: "running" },
        { id: b.id, status: "done", output: "Finished" },
      ],
    });
    const updated = parseResult(result);
    expect(updated).toHaveLength(2);
    expect(updated[0].status).toBe("running");
    expect(updated[1].status).toBe("done");
    expect(updated[1].output).toBe("Finished");
  });
});

// ---------------------------------------------------------------------------
// Get tools for agents and jobs
// ---------------------------------------------------------------------------

describe("get_agent", () => {
  it("returns full agent entity by id", async () => {
    const [created] = parseResult(
      await callTool("create_agent", {
        items: [{ name: "Get Agent", description: "Agent desc", prompt: "Do things" }],
      })
    );

    const result = await callTool("get_agent", { id: created.id });
    const agent = parseResult(result);
    expect(agent.id).toBe(created.id);
    expect(agent.name).toBe("Get Agent");
    expect(agent.description).toBe("Agent desc");
    expect(agent.prompt).toBe("Do things");
    expect(agent.created_at).toBeTruthy();
    expect(agent.updated_at).toBeTruthy();
  });

  it("returns error for nonexistent id", async () => {
    const result = await callTool("get_agent", { id: "00000000000000000000000000" });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/not found/i);
  });
});

describe("get_job", () => {
  it("returns full job entity by id", async () => {
    const [agent] = parseResult(await callTool("create_agent", { items: [{ name: "Get Job Agent" }] }));
    const [created] = parseResult(
      await callTool("create_job", { items: [{ agent_id: agent.id, input: "job input" }] })
    );

    const result = await callTool("get_job", { id: created.id });
    const job = parseResult(result);
    expect(job.id).toBe(created.id);
    expect(job.agent_id).toBe(agent.id);
    expect(job.input).toBe("job input");
    expect(job.status).toBeTruthy();
    expect(job.created_at).toBeTruthy();
    expect(job.updated_at).toBeTruthy();
  });

  it("returns error for nonexistent id", async () => {
    const result = await callTool("get_job", { id: "00000000000000000000000000" });
    expect(result.isError).toBe(true);
    expect(getErrorText(result)).toMatch(/not found/i);
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
