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
  it("creates a project with name + description", () => {
    const project = ctx.projectService.create({
      name: "My Project",
      description: "A fine project",
    });

    expect(project.id).toBeTruthy();
    expect(project.id.length).toBeGreaterThan(10); // ULID
    expect(project.name).toBe("My Project");
    expect(project.description).toBe("A fine project");
    expect(project.status).toBe("active");
    expect(project.created_at).toBeTruthy();
    expect(project.updated_at).toBeTruthy();
    // ISO 8601
    expect(() => new Date(project.created_at)).not.toThrow();
  });

  it("updates project name, description, status", () => {
    const project = ctx.projectService.create({ name: "Original" });
    const updated = ctx.projectService.update(project.id, {
      name: "Renamed",
      description: "New desc",
      status: "archived",
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Renamed");
    expect(updated!.description).toBe("New desc");
    expect(updated!.status).toBe("archived");
  });

  it("lists projects filtered by status", () => {
    // Create fresh projects with unique names
    const active = ctx.projectService.create({ name: "Filter Active" });
    const archived = ctx.projectService.create({ name: "Filter Archived" });
    ctx.projectService.update(archived.id, { status: "archived" });

    const activeResults = ctx.projectService.findAll(100, 0, { status: "active" });
    const archivedResults = ctx.projectService.findAll(100, 0, { status: "archived" });

    expect(activeResults.data.some((p) => p.id === active.id)).toBe(true);
    expect(activeResults.data.some((p) => p.id === archived.id)).toBe(false);
    expect(archivedResults.data.some((p) => p.id === archived.id)).toBe(true);
  });

  it("archives a project by setting status to archived", () => {
    const project = ctx.projectService.create({ name: "To Archive" });
    expect(project.status).toBe("active");

    const archived = ctx.projectService.update(project.id, { status: "archived" });
    expect(archived!.status).toBe("archived");

    const fetched = ctx.projectService.findById(project.id);
    expect(fetched!.status).toBe("archived");
  });
});

// ---------------------------------------------------------------------------
// Task CRUD
// ---------------------------------------------------------------------------

describe("Task CRUD", () => {
  it("creates a task with summary + context under a project", () => {
    const project = ctx.projectService.create({ name: "Task Project" });
    const task = ctx.taskService.create({
      project_id: project.id,
      summary: "Do the thing",
      context: "Some context",
    });

    expect(task.id).toBeTruthy();
    expect(task.project_id).toBe(project.id);
    expect(task.summary).toBe("Do the thing");
    expect(task.context).toBe("Some context");
    expect(task.status).toBe("todo");
    expect(task.created_at).toBeTruthy();
    expect(task.updated_at).toBeTruthy();
  });

  it("updates task summary, context, status", () => {
    const project = ctx.projectService.create({ name: "Task Update Project" });
    const task = ctx.taskService.create({
      project_id: project.id,
      summary: "Original summary",
    });

    // Update summary
    const u1 = ctx.taskService.update(task.id, { summary: "New summary" });
    expect(u1!.summary).toBe("New summary");

    // Update context
    const u2 = ctx.taskService.update(task.id, { context: "New context" });
    expect(u2!.context).toBe("New context");

    // Transition through statuses
    const u3 = ctx.taskService.update(task.id, { status: "in_progress" });
    expect(u3!.status).toBe("in_progress");

    const u4 = ctx.taskService.update(task.id, { status: "done" });
    expect(u4!.status).toBe("done");
  });

  it("lists tasks filtered by project_id and status", () => {
    const project = ctx.projectService.create({ name: "Task Filter Project" });
    const t1 = ctx.taskService.create({ project_id: project.id, summary: "Task 1" });
    const t2 = ctx.taskService.create({ project_id: project.id, summary: "Task 2" });
    ctx.taskService.update(t2.id, { status: "done" });

    const todoTasks = ctx.taskService.findByProjectId(project.id, 100, 0, { status: "todo" });
    expect(todoTasks.data.length).toBe(1);
    expect(todoTasks.data[0].id).toBe(t1.id);

    const doneTasks = ctx.taskService.findByProjectId(project.id, 100, 0, { status: "done" });
    expect(doneTasks.data.length).toBe(1);
    expect(doneTasks.data[0].id).toBe(t2.id);
  });

  it("throws when creating task with nonexistent project_id", () => {
    expect(() =>
      ctx.taskService.create({
        project_id: "nonexistent-id",
        summary: "Orphan task",
      })
    ).toThrow(ServiceError);
  });
});

// ---------------------------------------------------------------------------
// Action CRUD
// ---------------------------------------------------------------------------

describe("Action CRUD", () => {
  it("creates action with prompt only", () => {
    const action = ctx.actionService.create({ prompt: "Test prompt" });
    expect(action.id).toBeTruthy();
    expect(action.prompt).toBe("Test prompt");
    expect(action.status).toBe("todo");
    expect(action.output).toBeNull();
    expect(action.agent).toBeNull();
    expect(action.created_at).toBeTruthy();
  });

  it("creates action with prompt + agent", () => {
    const action = ctx.actionService.create({ prompt: "Research task", agent: "research" });
    expect(action.agent).toBe("research");
  });

  it("rejects invalid agent", () => {
    expect(() => ctx.actionService.create({ prompt: "X", agent: "invalid" })).toThrow(ServiceError);
  });

  it("rejects empty prompt", () => {
    expect(() => ctx.actionService.create({ prompt: "" })).toThrow(ServiceError);
  });

  it("updates action prompt", async () => {
    const action = ctx.actionService.create({ prompt: "Original" });
    await new Promise((r) => setTimeout(r, 5));
    const updated = ctx.actionService.update(action.id, { prompt: "Updated" });
    expect(updated!.prompt).toBe("Updated");
    expect(updated!.updated_at).not.toBe(action.updated_at);
  });

  it("updates action output", () => {
    const action = ctx.actionService.create({ prompt: "Generate" });
    const updated = ctx.actionService.update(action.id, { output: "Result text" });
    expect(updated!.output).toBe("Result text");
  });

  it("update non-existent returns null", () => {
    const result = ctx.actionService.update("nonexistent", { prompt: "X" });
    expect(result).toBeNull();
  });

  it("findAll returns paginated results", () => {
    const result = ctx.actionService.findAll(10, 0);
    expect(result.data).toBeArray();
    expect(typeof result.total).toBe("number");
  });

  it("findAll with status filter", () => {
    const a = ctx.actionService.create({ prompt: "Filter test" });
    ctx.actionService.updateStatus(a.id, "in_progress");
    const result = ctx.actionService.findAll(100, 0, { status: "in_progress" });
    expect(result.data.some(x => x.id === a.id)).toBe(true);
  });

  it("findAll with agent filter", () => {
    const a = ctx.actionService.create({ prompt: "Agent test", agent: "design" });
    const result = ctx.actionService.findAll(100, 0, { agent: "design" });
    expect(result.data.some(x => x.id === a.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Action status transitions
// ---------------------------------------------------------------------------

describe("Action status transitions", () => {
  it("transitions todo -> in_progress -> complete", () => {
    const action = ctx.actionService.create({ prompt: "Do it" });

    expect(action.status).toBe("todo");

    const inProgress = ctx.actionService.updateStatus(action.id, "in_progress");
    expect(inProgress!.status).toBe("in_progress");

    const complete = ctx.actionService.updateStatus(action.id, "complete");
    expect(complete!.status).toBe("complete");
  });

  it("transitions in_progress -> failed -> todo (retry)", () => {
    const action = ctx.actionService.create({ prompt: "Retry me" });

    ctx.actionService.updateStatus(action.id, "in_progress");
    const failed = ctx.actionService.updateStatus(action.id, "failed");
    expect(failed!.status).toBe("failed");

    const retried = ctx.actionService.updateStatus(action.id, "todo");
    expect(retried!.status).toBe("todo");
  });

  it("rejects invalid transitions", () => {
    const action = ctx.actionService.create({ prompt: "No skip" });

    // todo -> complete (not allowed, must go through in_progress)
    expect(() => ctx.actionService.updateStatus(action.id, "complete")).toThrow(ServiceError);

    // todo -> failed (not allowed)
    expect(() => ctx.actionService.updateStatus(action.id, "failed")).toThrow(ServiceError);
  });

  it("rejects transition from complete", () => {
    const action = ctx.actionService.create({ prompt: "Done" });

    ctx.actionService.updateStatus(action.id, "in_progress");
    ctx.actionService.updateStatus(action.id, "complete");

    expect(() => ctx.actionService.updateStatus(action.id, "todo")).toThrow(ServiceError);
    expect(() => ctx.actionService.updateStatus(action.id, "in_progress")).toThrow(ServiceError);
  });
});

// ---------------------------------------------------------------------------
// Project with action references
// ---------------------------------------------------------------------------

describe("Project with action references", () => {
  it("creates project with goal_action_id", () => {
    const action = ctx.actionService.create({ prompt: "Goal" });
    const project = ctx.projectService.create({ name: "With Goal", goal_action_id: action.id });
    expect(project.goal_action_id).toBe(action.id);
  });

  it("rejects invalid goal_action_id", () => {
    expect(() => ctx.projectService.create({ name: "Bad", goal_action_id: "nonexistent" })).toThrow(ServiceError);
  });

  it("updates project design_action_id", () => {
    const action = ctx.actionService.create({ prompt: "Design" });
    const project = ctx.projectService.create({ name: "Update Test" });
    const updated = ctx.projectService.update(project.id, { design_action_id: action.id });
    expect(updated!.design_action_id).toBe(action.id);
  });

  it("nulls out requirements_action_id (unlink)", () => {
    const action = ctx.actionService.create({ prompt: "Req" });
    const project = ctx.projectService.create({ name: "Unlink Test", requirements_action_id: action.id });
    const updated = ctx.projectService.update(project.id, { requirements_action_id: null });
    expect(updated!.requirements_action_id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Task with action references
// ---------------------------------------------------------------------------

describe("Task with action references", () => {
  it("creates task with implementation_action_id", () => {
    const project = ctx.projectService.create({ name: "Task Ref Project" });
    const action = ctx.actionService.create({ prompt: "Implement" });
    const task = ctx.taskService.create({ project_id: project.id, summary: "With action", implementation_action_id: action.id });
    expect(task.implementation_action_id).toBe(action.id);
  });

  it("rejects invalid action_id", () => {
    const project = ctx.projectService.create({ name: "Bad Ref Project" });
    expect(() => ctx.taskService.create({ project_id: project.id, summary: "Bad", implementation_action_id: "nonexistent" })).toThrow(ServiceError);
  });

  it("updates task validation_action_id", () => {
    const project = ctx.projectService.create({ name: "Update Ref Project" });
    const task = ctx.taskService.create({ project_id: project.id, summary: "Update test" });
    const action = ctx.actionService.create({ prompt: "Validate" });
    const updated = ctx.taskService.update(task.id, { validation_action_id: action.id });
    expect(updated!.validation_action_id).toBe(action.id);
  });

  it("nulls out action_id (unlink)", () => {
    const project = ctx.projectService.create({ name: "Unlink Ref Project" });
    const action = ctx.actionService.create({ prompt: "To unlink" });
    const task = ctx.taskService.create({ project_id: project.id, summary: "Unlink", validation_action_id: action.id });
    const updated = ctx.taskService.update(task.id, { validation_action_id: null });
    expect(updated!.validation_action_id).toBeNull();
  });
});
