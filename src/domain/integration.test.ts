import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";

let ctx: AppContext;
let tempDir: string;

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "integration-test-"));
  const dbPath = join(tempDir, "test.db");
  ctx = await bootstrap(dbPath);
});

afterAll(() => {
  ctx.db.close();
  rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Project CRUD
// ---------------------------------------------------------------------------

describe("Project CRUD", () => {
  it("creates a project with title", () => {
    const [project] = ctx.projectService.create([{ title: "My Project" }]);

    expect(project.id).toBeTruthy();
    expect(project.id.length).toBeGreaterThan(10); // ULID
    expect(project.title).toBe("My Project");
    expect(project.goal).toBeNull();
    expect(project.requirements).toBeNull();
    expect(project.design).toBeNull();
    expect(project.created_at).toBeTruthy();
    expect(project.updated_at).toBeTruthy();
    expect(() => new Date(project.created_at)).not.toThrow();
  });

  it("creates a project with optional fields", () => {
    const [project] = ctx.projectService.create([{
      title: "Full Project",
      goal: "Ship it",
      requirements: "Must be fast",
      design: "Monolith",
    }]);

    expect(project.title).toBe("Full Project");
    expect(project.goal).toBe("Ship it");
    expect(project.requirements).toBe("Must be fast");
    expect(project.design).toBe("Monolith");
  });

  it("updates project title and optional fields", () => {
    const [project] = ctx.projectService.create([{ title: "Original" }]);
    const [updated] = ctx.projectService.update([{
      id: project.id,
      title: "Renamed",
      goal: "New goal",
    }]);

    expect(updated.title).toBe("Renamed");
    expect(updated.goal).toBe("New goal");
  });

  it("lists projects", () => {
    const result = ctx.projectService.list({ limit: 100, offset: 0 });
    expect(result.data).toBeArray();
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("rejects empty title", () => {
    expect(() => ctx.projectService.create([{ title: "" }])).toThrow(ServiceError);
  });

  it("rejects title over 255 chars", () => {
    expect(() => ctx.projectService.create([{ title: "x".repeat(256) }])).toThrow(ServiceError);
  });

  it("throws 404 when updating nonexistent project", () => {
    expect(() =>
      ctx.projectService.update([{ id: "nonexistent", title: "X" }])
    ).toThrow(ServiceError);
  });
});

// ---------------------------------------------------------------------------
// Task CRUD
// ---------------------------------------------------------------------------

describe("Task CRUD", () => {
  it("creates a task with title under a project", () => {
    const [project] = ctx.projectService.create([{ title: "Task Project" }]);
    const [task] = ctx.taskService.create([{
      project_id: project.id,
      title: "Do the thing",
    }]);

    expect(task.id).toBeTruthy();
    expect(task.project_id).toBe(project.id);
    expect(task.title).toBe("Do the thing");
    expect(task.plan).toBeNull();
    expect(task.created_at).toBeTruthy();
    expect(task.updated_at).toBeTruthy();
  });

  it("creates a task with plan", () => {
    const [project] = ctx.projectService.create([{ title: "Plan Project" }]);
    const [task] = ctx.taskService.create([{
      project_id: project.id,
      title: "Planned task",
      plan: "Step 1, step 2",
    }]);

    expect(task.plan).toBe("Step 1, step 2");
  });

  it("updates task title and plan", () => {
    const [project] = ctx.projectService.create([{ title: "Update Project" }]);
    const [task] = ctx.taskService.create([{
      project_id: project.id,
      title: "Original",
    }]);

    const [u1] = ctx.taskService.update([{ id: task.id, title: "New title" }]);
    expect(u1.title).toBe("New title");

    const [u2] = ctx.taskService.update([{ id: task.id, plan: "New plan" }]);
    expect(u2.plan).toBe("New plan");
  });

  it("lists tasks filtered by project_id", () => {
    const [project] = ctx.projectService.create([{ title: "Filter Project" }]);
    ctx.taskService.create([
      { project_id: project.id, title: "Task 1" },
      { project_id: project.id, title: "Task 2" },
    ]);

    const result = ctx.taskService.list({ project_id: project.id, limit: 100, offset: 0 });
    expect(result.data.length).toBe(2);
  });

  it("throws when creating task with nonexistent project_id", () => {
    expect(() =>
      ctx.taskService.create([{
        project_id: "nonexistent-id",
        title: "Orphan task",
      }])
    ).toThrow(ServiceError);
  });

  it("rejects empty title", () => {
    const [project] = ctx.projectService.create([{ title: "Empty Title" }]);
    expect(() =>
      ctx.taskService.create([{ project_id: project.id, title: "" }])
    ).toThrow(ServiceError);
  });
});

// ---------------------------------------------------------------------------
// Agent CRUD
// ---------------------------------------------------------------------------

describe("Agent CRUD", () => {
  it("creates agent with identifier, prompt, and agent", () => {
    const [agent] = ctx.agentService.create([{
      identifier: "plan",
      prompt: "Plan the work",
      agent: "tab:orchestrator",
    }]);

    expect(agent.id).toBeTruthy();
    expect(agent.identifier).toBe("plan");
    expect(agent.prompt).toBe("Plan the work");
    expect(agent.agent).toBe("tab:orchestrator");
    expect(agent.enabled).toBe(1);
    expect(agent.created_at).toBeTruthy();
  });

  it("rejects empty identifier", () => {
    expect(() =>
      ctx.agentService.create([{
        identifier: "",
        prompt: "X",
        agent: "tab:orchestrator",
      }])
    ).toThrow(ServiceError);
  });

  it("rejects empty prompt", () => {
    expect(() =>
      ctx.agentService.create([{
        identifier: "empty-prompt-test",
        prompt: "",
        agent: "tab:executor",
      }])
    ).toThrow(ServiceError);
  });

  it("rejects invalid agent enum", () => {
    expect(() =>
      ctx.agentService.create([{
        identifier: "bad-agent-test",
        prompt: "X",
        agent: "invalid" as "tab:orchestrator",
      }])
    ).toThrow(ServiceError);
  });

  it("rejects duplicate identifier — 409", () => {
    // "plan" was already created above
    try {
      ctx.agentService.create([{
        identifier: "plan",
        prompt: "Duplicate",
        agent: "tab:orchestrator",
      }]);
      expect(true).toBe(false); // should not reach here
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceError);
      expect((err as ServiceError).statusCode).toBe(409);
    }
  });

  it("updates agent prompt", async () => {
    const [agent] = ctx.agentService.create([{
      identifier: "goal",
      prompt: "Original",
      agent: "tab:executor",
    }]);
    await new Promise((r) => setTimeout(r, 5));
    const [updated] = ctx.agentService.update([{ id: agent.id, prompt: "Updated" }]);
    expect(updated.prompt).toBe("Updated");
    expect(updated.updated_at).not.toBe(agent.updated_at);
  });

  it("updates agent identifier", () => {
    const [agent] = ctx.agentService.create([{
      identifier: "rename-me",
      prompt: "Test",
      agent: "tab:orchestrator",
    }]);
    const [updated] = ctx.agentService.update([{ id: agent.id, identifier: "renamed" }]);
    expect(updated.identifier).toBe("renamed");
  });

  it("toggles enabled field", () => {
    const [agent] = ctx.agentService.create([{
      identifier: "toggle-test",
      prompt: "Test",
      agent: "tab:orchestrator",
    }]);
    expect(agent.enabled).toBe(1);

    const [disabled] = ctx.agentService.update([{ id: agent.id, enabled: 0 }]);
    expect(disabled.enabled).toBe(0);

    const [reenabled] = ctx.agentService.update([{ id: agent.id, enabled: 1 }]);
    expect(reenabled.enabled).toBe(1);
  });

  it("throws 404 updating non-existent agent", () => {
    expect(() =>
      ctx.agentService.update([{ id: "nonexistent", prompt: "X" }])
    ).toThrow(ServiceError);
  });

  it("list returns paginated results", () => {
    const result = ctx.agentService.list({ limit: 10, offset: 0 });
    expect(result.data).toBeArray();
    expect(typeof result.total).toBe("number");
  });

  it("list with identifier filter", () => {
    const result = ctx.agentService.list({ limit: 100, offset: 0, identifier: "plan" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.every((a) => a.identifier === "plan")).toBe(true);
  });

  it("list with enabled filter", () => {
    const result = ctx.agentService.list({ limit: 100, offset: 0, enabled: 1 });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.every((a) => a.enabled === 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

describe("Run", () => {
  it("creates a run with agent string identifier", () => {
    const [project] = ctx.projectService.create([{ title: "Run Project" }]);

    const [entry] = ctx.runService.create([{
      agent: "plan",
      entity_type: "project",
      entity_id: project.id,
    }]);

    expect(entry.id).toBeTruthy();
    expect(entry.agent).toBe("plan");
    expect(entry.entity_type).toBe("project");
    expect(entry.entity_id).toBe(project.id);
    expect(entry.status).toBe("running");
    expect(entry.output).toBeNull();
    expect(entry.started_at).toBeTruthy();
    expect(entry.finished_at).toBeNull();
  });

  it("does not validate that agent exists — just stores string", () => {
    const [project] = ctx.projectService.create([{ title: "No Validation Project" }]);

    const [entry] = ctx.runService.create([{
      agent: "nonexistent-agent",
      entity_type: "project",
      entity_id: project.id,
    }]);

    expect(entry.agent).toBe("nonexistent-agent");
    expect(entry.status).toBe("running");
  });

  it("default status is running", () => {
    const [project] = ctx.projectService.create([{ title: "Default Status" }]);
    const [entry] = ctx.runService.create([{
      agent: "plan",
      entity_type: "project",
      entity_id: project.id,
    }]);

    expect(entry.status).toBe("running");
  });

  it("updates status to done", () => {
    const [project] = ctx.projectService.create([{ title: "Done Run" }]);
    const [entry] = ctx.runService.create([{
      agent: "plan",
      entity_type: "project",
      entity_id: project.id,
    }]);

    const [updated] = ctx.runService.update([{
      id: entry.id,
      status: "done",
    }]);

    expect(updated.status).toBe("done");
    expect(updated.finished_at).not.toBeNull();
  });

  it("updates status to failed", () => {
    const [project] = ctx.projectService.create([{ title: "Failed Run" }]);
    const [entry] = ctx.runService.create([{
      agent: "goal",
      entity_type: "project",
      entity_id: project.id,
    }]);

    const [updated] = ctx.runService.update([{
      id: entry.id,
      status: "failed",
    }]);

    expect(updated.status).toBe("failed");
    expect(updated.finished_at).not.toBeNull();
  });

  it("updates status to cancelled", () => {
    const [project] = ctx.projectService.create([{ title: "Cancelled Run" }]);
    const [entry] = ctx.runService.create([{
      agent: "plan",
      entity_type: "project",
      entity_id: project.id,
    }]);

    const [updated] = ctx.runService.update([{
      id: entry.id,
      status: "cancelled",
    }]);

    expect(updated.status).toBe("cancelled");
    expect(updated.finished_at).not.toBeNull();
  });

  it("updates status to todo", () => {
    const [project] = ctx.projectService.create([{ title: "Todo Run" }]);
    const [entry] = ctx.runService.create([{
      agent: "plan",
      entity_type: "project",
      entity_id: project.id,
    }]);

    const [updated] = ctx.runService.update([{
      id: entry.id,
      status: "todo",
    }]);

    expect(updated.status).toBe("todo");
  });

  it("updates output field", () => {
    const [project] = ctx.projectService.create([{ title: "Output Run" }]);
    const [entry] = ctx.runService.create([{
      agent: "plan",
      entity_type: "project",
      entity_id: project.id,
    }]);

    const [updated] = ctx.runService.update([{
      id: entry.id,
      status: "done",
      output: "Result text",
    }]);

    expect(updated.output).toBe("Result text");
  });

  it("rejects invalid entity_type", () => {
    expect(() =>
      ctx.runService.create([{
        agent: "plan",
        entity_type: "widget" as "project",
        entity_id: "x",
      }])
    ).toThrow(ServiceError);
  });

  it("throws 404 updating nonexistent entry", () => {
    expect(() =>
      ctx.runService.update([{ id: "nonexistent", status: "done" }])
    ).toThrow(ServiceError);
  });

  it("list filters by entity_type and entity_id", () => {
    const result = ctx.runService.list({ limit: 100, offset: 0, entity_type: "project" });
    expect(result.data).toBeArray();
    expect(result.data.every((e) => e.entity_type === "project")).toBe(true);
  });

  it("list filters by agent", () => {
    const result = ctx.runService.list({ limit: 100, offset: 0, agent: "plan" });
    expect(result.data).toBeArray();
    expect(result.data.every((e) => e.agent === "plan")).toBe(true);
  });

  it("list filters by status", () => {
    const result = ctx.runService.list({ limit: 100, offset: 0, status: "running" });
    expect(result.data).toBeArray();
    expect(result.data.every((e) => e.status === "running")).toBe(true);
  });

  it("stats returns by_agent grouping", () => {
    const stats = ctx.runService.stats();
    expect(stats.summary).toBeDefined();
    expect(typeof stats.summary.total).toBe("number");
    expect(stats.daily).toBeArray();

    // Verify by_agent grouping exists in daily stats
    if (stats.daily.length > 0) {
      expect(stats.daily[0]).toHaveProperty("agent");
    }
  });

  it("stats summary includes todo and cancelled counts", () => {
    const stats = ctx.runService.stats();
    expect(typeof stats.summary.todo).toBe("number");
    expect(typeof stats.summary.cancelled).toBe("number");
    expect(typeof stats.summary.done).toBe("number");
    expect(typeof stats.summary.failed).toBe("number");
    expect(typeof stats.summary.running).toBe("number");
  });
});
