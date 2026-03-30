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
// Action CRUD
// ---------------------------------------------------------------------------

describe("Action CRUD", () => {
  it("creates action with kind, prompt, and agent", () => {
    const [action] = ctx.actionService.create([{
      kind: "plan",
      prompt: "Plan the work",
      agent: "tab:orchestrator",
    }]);

    expect(action.id).toBeTruthy();
    expect(action.kind).toBe("plan");
    expect(action.prompt).toBe("Plan the work");
    expect(action.agent).toBe("tab:orchestrator");
    expect(action.created_at).toBeTruthy();
  });

  it("rejects invalid kind", () => {
    expect(() =>
      ctx.actionService.create([{
        kind: "invalid" as "plan",
        prompt: "X",
        agent: "tab:orchestrator",
      }])
    ).toThrow(ServiceError);
  });

  it("rejects invalid agent", () => {
    expect(() =>
      ctx.actionService.create([{
        kind: "goal",
        prompt: "X",
        agent: "invalid" as "tab:orchestrator",
      }])
    ).toThrow(ServiceError);
  });

  it("rejects empty prompt", () => {
    expect(() =>
      ctx.actionService.create([{
        kind: "goal",
        prompt: "",
        agent: "tab:executor",
      }])
    ).toThrow(ServiceError);
  });

  it("rejects duplicate kind", () => {
    // "plan" was already created above
    expect(() =>
      ctx.actionService.create([{
        kind: "plan",
        prompt: "Duplicate",
        agent: "tab:orchestrator",
      }])
    ).toThrow(ServiceError);
  });

  it("updates action prompt", async () => {
    const [action] = ctx.actionService.create([{
      kind: "goal",
      prompt: "Original",
      agent: "tab:executor",
    }]);
    await new Promise((r) => setTimeout(r, 5));
    const [updated] = ctx.actionService.update([{ id: action.id, prompt: "Updated" }]);
    expect(updated.prompt).toBe("Updated");
    expect(updated.updated_at).not.toBe(action.updated_at);
  });

  it("throws 404 updating non-existent action", () => {
    expect(() =>
      ctx.actionService.update([{ id: "nonexistent", prompt: "X" }])
    ).toThrow(ServiceError);
  });

  it("list returns paginated results", () => {
    const result = ctx.actionService.list({ limit: 10, offset: 0 });
    expect(result.data).toBeArray();
    expect(typeof result.total).toBe("number");
  });

  it("list with kind filter", () => {
    const result = ctx.actionService.list({ limit: 100, offset: 0, kind: "plan" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.every((a) => a.kind === "plan")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Action Log
// ---------------------------------------------------------------------------

describe("Action Log", () => {
  it("creates an action log entry", () => {
    const [project] = ctx.projectService.create([{ title: "Log Project" }]);
    const [action] = ctx.actionService.create([{
      kind: "requirements",
      prompt: "Gather reqs",
      agent: "tab:orchestrator",
    }]);

    const [entry] = ctx.actionLogService.create([{
      action_id: action.id,
      entity_type: "project",
      entity_id: project.id,
    }]);

    expect(entry.id).toBeTruthy();
    expect(entry.action_id).toBe(action.id);
    expect(entry.entity_type).toBe("project");
    expect(entry.entity_id).toBe(project.id);
    expect(entry.status).toBe("running");
    expect(entry.output).toBeNull();
    expect(entry.started_at).toBeTruthy();
    expect(entry.finished_at).toBeNull();
  });

  it("updates status and output", () => {
    const [project] = ctx.projectService.create([{ title: "Update Log" }]);
    const [action] = ctx.actionService.create([{
      kind: "design",
      prompt: "Design it",
      agent: "tab:executor",
    }]);
    const [entry] = ctx.actionLogService.create([{
      action_id: action.id,
      entity_type: "project",
      entity_id: project.id,
    }]);

    const now = new Date().toISOString();
    const [updated] = ctx.actionLogService.update([{
      id: entry.id,
      status: "done",
      output: "Result text",
      finished_at: now,
    }]);

    expect(updated.status).toBe("done");
    expect(updated.output).toBe("Result text");
    expect(updated.finished_at).toBe(now);
  });

  it("rejects nonexistent action_id", () => {
    expect(() =>
      ctx.actionLogService.create([{
        action_id: "nonexistent",
        entity_type: "project",
        entity_id: "some-id",
      }])
    ).toThrow(ServiceError);
  });

  it("rejects invalid entity_type", () => {
    const { data: [action] } = ctx.actionService.list({ limit: 1, offset: 0 });
    expect(() =>
      ctx.actionLogService.create([{
        action_id: action.id,
        entity_type: "widget" as "project",
        entity_id: "x",
      }])
    ).toThrow(ServiceError);
  });

  it("throws 404 updating nonexistent entry", () => {
    expect(() =>
      ctx.actionLogService.update([{ id: "nonexistent", status: "done" }])
    ).toThrow(ServiceError);
  });

  it("list filters by entity_type and entity_id", () => {
    const result = ctx.actionLogService.list({ limit: 100, offset: 0, entity_type: "project" });
    expect(result.data).toBeArray();
    expect(result.data.every((e) => e.entity_type === "project")).toBe(true);
  });
});
