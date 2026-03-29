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

  it("update non-existent returns null", () => {
    const result = ctx.actionService.update("nonexistent", { prompt: "X" });
    expect(result).toBeNull();
  });

  it("findAll returns paginated results", () => {
    const result = ctx.actionService.findAll(10, 0);
    expect(result.data).toBeArray();
    expect(typeof result.total).toBe("number");
  });

  it("findAll with agent filter", () => {
    const a = ctx.actionService.create({ prompt: "Agent test", agent: "design" });
    const result = ctx.actionService.findAll(100, 0, { agent: "design" });
    expect(result.data.some(x => x.id === a.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Entity Action — link, unlink, status transitions, output
// ---------------------------------------------------------------------------

describe("EntityAction link/unlink", () => {
  it("links an action to a project with a role", () => {
    const action = ctx.actionService.create({ prompt: "Goal action" });
    const project = ctx.projectService.create({ name: "EA Project" });

    const ea = ctx.entityActionService.link({
      entity_type: "project",
      entity_id: project.id,
      role: "goal",
      action_id: action.id,
    });

    expect(ea.entity_type).toBe("project");
    expect(ea.entity_id).toBe(project.id);
    expect(ea.role).toBe("goal");
    expect(ea.action_id).toBe(action.id);
    expect(ea.status).toBe("todo");
    expect(ea.output).toBeNull();
    expect(ea.created_at).toBeTruthy();
  });

  it("links an action to a task with a role", () => {
    const project = ctx.projectService.create({ name: "EA Task Project" });
    const task = ctx.taskService.create({ project_id: project.id, summary: "EA Task" });
    const action = ctx.actionService.create({ prompt: "Impl action" });

    const ea = ctx.entityActionService.link({
      entity_type: "task",
      entity_id: task.id,
      role: "implementation",
      action_id: action.id,
    });

    expect(ea.entity_type).toBe("task");
    expect(ea.role).toBe("implementation");
    expect(ea.action_id).toBe(action.id);
  });

  it("rejects invalid entity_type", () => {
    const action = ctx.actionService.create({ prompt: "Bad type" });
    expect(() =>
      ctx.entityActionService.link({
        entity_type: "widget" as "project",
        entity_id: "x",
        role: "goal",
        action_id: action.id,
      })
    ).toThrow(ServiceError);
  });

  it("rejects implementation role for project (400)", () => {
    const project = ctx.projectService.create({ name: "Bad Role" });
    const action = ctx.actionService.create({ prompt: "Bad role" });
    try {
      ctx.entityActionService.link({
        entity_type: "project",
        entity_id: project.id,
        role: "implementation" as "goal",
        action_id: action.id,
      });
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceError);
      expect((err as ServiceError).statusCode).toBe(400);
    }
  });

  it("rejects goal role for task (400)", () => {
    const project = ctx.projectService.create({ name: "Task Bad Role" });
    const task = ctx.taskService.create({ project_id: project.id, summary: "No goal" });
    const action = ctx.actionService.create({ prompt: "Bad role task" });
    try {
      ctx.entityActionService.link({
        entity_type: "task",
        entity_id: task.id,
        role: "goal" as "implementation",
        action_id: action.id,
      });
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceError);
      expect((err as ServiceError).statusCode).toBe(400);
    }
  });

  it("rejects nonexistent entity", () => {
    const action = ctx.actionService.create({ prompt: "No entity" });
    expect(() =>
      ctx.entityActionService.link({
        entity_type: "project",
        entity_id: "nonexistent",
        role: "goal",
        action_id: action.id,
      })
    ).toThrow(ServiceError);
  });

  it("rejects nonexistent action", () => {
    const project = ctx.projectService.create({ name: "No Action" });
    expect(() =>
      ctx.entityActionService.link({
        entity_type: "project",
        entity_id: project.id,
        role: "goal",
        action_id: "nonexistent",
      })
    ).toThrow(ServiceError);
  });

  it("rejects duplicate link (409)", () => {
    const project = ctx.projectService.create({ name: "Dup Link" });
    const action = ctx.actionService.create({ prompt: "Dup" });
    ctx.entityActionService.link({
      entity_type: "project",
      entity_id: project.id,
      role: "design",
      action_id: action.id,
    });
    try {
      ctx.entityActionService.link({
        entity_type: "project",
        entity_id: project.id,
        role: "design",
        action_id: action.id,
      });
      expect(true).toBe(false); // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceError);
      expect((err as ServiceError).statusCode).toBe(409);
    }
  });

  it("unlinks an entity action", () => {
    const project = ctx.projectService.create({ name: "Unlink EA" });
    const action = ctx.actionService.create({ prompt: "Unlink" });
    ctx.entityActionService.link({
      entity_type: "project",
      entity_id: project.id,
      role: "requirements",
      action_id: action.id,
    });

    const deleted = ctx.entityActionService.unlink("project", project.id, "requirements");
    expect(deleted).toBe(true);

    const found = ctx.entityActionService.findByEntityAndRole("project", project.id, "requirements");
    expect(found).toBeNull();
  });

  it("unlink returns false when nothing to delete", () => {
    expect(ctx.entityActionService.unlink("project", "nonexistent", "goal")).toBe(false);
  });

  it("findByEntity returns all roles for an entity", () => {
    const project = ctx.projectService.create({ name: "Multi Role" });
    const a1 = ctx.actionService.create({ prompt: "Goal" });
    const a2 = ctx.actionService.create({ prompt: "Design" });

    ctx.entityActionService.link({ entity_type: "project", entity_id: project.id, role: "goal", action_id: a1.id });
    ctx.entityActionService.link({ entity_type: "project", entity_id: project.id, role: "design", action_id: a2.id });

    const eas = ctx.entityActionService.findByEntity("project", project.id);
    expect(eas.length).toBe(2);
    expect(eas.map(e => e.role).sort()).toEqual(["design", "goal"]);
  });
});

describe("EntityAction status transitions", () => {
  it("transitions todo -> in_progress -> complete", () => {
    const project = ctx.projectService.create({ name: "Status Project" });
    const action = ctx.actionService.create({ prompt: "Status" });
    ctx.entityActionService.link({
      entity_type: "project",
      entity_id: project.id,
      role: "goal",
      action_id: action.id,
    });

    const ip = ctx.entityActionService.updateStatus("project", project.id, "goal", "in_progress");
    expect(ip.status).toBe("in_progress");

    const complete = ctx.entityActionService.updateStatus("project", project.id, "goal", "complete");
    expect(complete.status).toBe("complete");
  });

  it("transitions in_progress -> failed -> todo (retry)", () => {
    const project = ctx.projectService.create({ name: "Retry Project" });
    const action = ctx.actionService.create({ prompt: "Retry" });
    ctx.entityActionService.link({
      entity_type: "project",
      entity_id: project.id,
      role: "design",
      action_id: action.id,
    });

    ctx.entityActionService.updateStatus("project", project.id, "design", "in_progress");
    const failed = ctx.entityActionService.updateStatus("project", project.id, "design", "failed");
    expect(failed.status).toBe("failed");

    const retried = ctx.entityActionService.updateStatus("project", project.id, "design", "todo");
    expect(retried.status).toBe("todo");
  });

  it("rejects invalid transition todo → complete (400)", () => {
    const project = ctx.projectService.create({ name: "Invalid Trans" });
    const action = ctx.actionService.create({ prompt: "No skip" });
    ctx.entityActionService.link({
      entity_type: "project",
      entity_id: project.id,
      role: "requirements",
      action_id: action.id,
    });

    try {
      ctx.entityActionService.updateStatus("project", project.id, "requirements", "complete");
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceError);
      expect((err as ServiceError).statusCode).toBe(400);
    }
  });

  it("rejects transition from complete", () => {
    const project = ctx.projectService.create({ name: "Complete Lock" });
    const action = ctx.actionService.create({ prompt: "Done" });
    ctx.entityActionService.link({
      entity_type: "project",
      entity_id: project.id,
      role: "goal",
      action_id: action.id,
    });

    ctx.entityActionService.updateStatus("project", project.id, "goal", "in_progress");
    ctx.entityActionService.updateStatus("project", project.id, "goal", "complete");

    expect(() => ctx.entityActionService.updateStatus("project", project.id, "goal", "todo")).toThrow(ServiceError);
    expect(() => ctx.entityActionService.updateStatus("project", project.id, "goal", "in_progress")).toThrow(ServiceError);
  });

  it("throws 404 for nonexistent entity action", () => {
    expect(() => ctx.entityActionService.updateStatus("project", "nope", "goal", "in_progress")).toThrow(ServiceError);
  });
});

describe("EntityAction output", () => {
  it("updates output on an entity action", () => {
    const project = ctx.projectService.create({ name: "Output Project" });
    const action = ctx.actionService.create({ prompt: "Output" });
    ctx.entityActionService.link({
      entity_type: "project",
      entity_id: project.id,
      role: "goal",
      action_id: action.id,
    });

    const updated = ctx.entityActionService.updateOutput("project", project.id, "goal", "Result text");
    expect(updated.output).toBe("Result text");
  });

  it("nulls output", () => {
    const project = ctx.projectService.create({ name: "Null Output" });
    const action = ctx.actionService.create({ prompt: "Null out" });
    ctx.entityActionService.link({
      entity_type: "project",
      entity_id: project.id,
      role: "design",
      action_id: action.id,
    });

    ctx.entityActionService.updateOutput("project", project.id, "design", "Something");
    const nulled = ctx.entityActionService.updateOutput("project", project.id, "design", null);
    expect(nulled.output).toBeNull();
  });

  it("throws 404 for nonexistent entity action", () => {
    expect(() => ctx.entityActionService.updateOutput("project", "nope", "goal", "x")).toThrow(ServiceError);
  });
});
