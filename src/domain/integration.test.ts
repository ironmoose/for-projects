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
// Template CRUD
// ---------------------------------------------------------------------------

describe("Template CRUD", () => {
  it("creates a template with name + prompt", () => {
    const template = ctx.templateService.create({
      name: "Code Review",
      prompt: "Review this code for quality",
    });

    expect(template.id).toBeTruthy();
    expect(template.name).toBe("Code Review");
    expect(template.prompt).toBe("Review this code for quality");
    expect(template.created_at).toBeTruthy();
    expect(template.updated_at).toBeTruthy();
  });

  it("updates template name, description, prompt, agent", () => {
    const template = ctx.templateService.create({
      name: "Original",
      prompt: "Original prompt",
    });

    const updated = ctx.templateService.update(template.id, {
      name: "Updated",
      description: "A description",
      prompt: "Updated prompt",
      agent: "research",
    });

    expect(updated!.name).toBe("Updated");
    expect(updated!.description).toBe("A description");
    expect(updated!.prompt).toBe("Updated prompt");
    expect(updated!.agent).toBe("research");
  });

  it("lists templates", () => {
    const before = ctx.templateService.findAll();
    const t = ctx.templateService.create({ name: "List Test", prompt: "p" });
    const after = ctx.templateService.findAll();

    expect(after.total).toBe(before.total + 1);
    expect(after.data.some((tmpl) => tmpl.id === t.id)).toBe(true);
  });

  it("deletes a template (hard delete)", () => {
    const template = ctx.templateService.create({ name: "To Delete", prompt: "p" });
    expect(ctx.templateService.findById(template.id)).not.toBeNull();

    const deleted = ctx.templateService.delete(template.id);
    expect(deleted).toBe(true);
    expect(ctx.templateService.findById(template.id)).toBeNull();
  });

  it("action survives template deletion", () => {
    const project = ctx.projectService.create({ name: "Template Delete Project" });
    const template = ctx.templateService.create({
      name: "Ephemeral",
      prompt: "Template prompt",
      agent: "design",
    });

    const target = `tab:project:${project.id}`;
    const [action] = ctx.actionService.createMany(target, [
      { rank: 1, template_id: template.id },
    ]);

    expect(action.prompt).toBe("Template prompt");
    expect(action.agent).toBe("design");

    // Delete the template
    ctx.templateService.delete(template.id);

    // Action still exists with its own prompt/agent
    const fetched = ctx.actionService.findById(action.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.prompt).toBe("Template prompt");
    expect(fetched!.agent).toBe("design");
  });
});

// ---------------------------------------------------------------------------
// Action bulk CRUD
// ---------------------------------------------------------------------------

describe("Action bulk CRUD", () => {
  let projectId: string;
  let target: string;

  beforeAll(() => {
    const project = ctx.projectService.create({ name: "Action Project" });
    projectId = project.id;
    target = `tab:project:${projectId}`;
  });

  it("createMany: creates 3 actions with ranks 1, 2, 3", () => {
    const actions = ctx.actionService.createMany(target, [
      { rank: 1, prompt: "First" },
      { rank: 2, prompt: "Second" },
      { rank: 3, prompt: "Third" },
    ]);

    expect(actions.length).toBe(3);
    expect(actions[0].rank).toBe(1);
    expect(actions[0].prompt).toBe("First");
    expect(actions[1].rank).toBe(2);
    expect(actions[2].rank).toBe(3);
    expect(actions[0].target).toBe(target);
  });

  it("createMany: inherits prompt/agent from template", () => {
    const p = ctx.projectService.create({ name: "Template Inherit Project" });
    const t = `tab:project:${p.id}`;
    const template = ctx.templateService.create({
      name: "Inherit Test",
      prompt: "Template prompt",
      agent: "research",
    });

    const [action] = ctx.actionService.createMany(t, [
      { rank: 1, template_id: template.id },
    ]);

    expect(action.prompt).toBe("Template prompt");
    expect(action.agent).toBe("research");
    expect(action.template_id).toBe(template.id);
  });

  it("createMany: explicit prompt overrides template prompt", () => {
    const p = ctx.projectService.create({ name: "Override Prompt Project" });
    const t = `tab:project:${p.id}`;
    const template = ctx.templateService.create({
      name: "Override Test",
      prompt: "Template prompt",
      agent: "design",
    });

    const [action] = ctx.actionService.createMany(t, [
      { rank: 1, template_id: template.id, prompt: "Explicit prompt" },
    ]);

    expect(action.prompt).toBe("Explicit prompt");
    expect(action.agent).toBe("design"); // still inherited
  });

  it("createMany: explicit agent overrides template agent", () => {
    const p = ctx.projectService.create({ name: "Override Agent Project" });
    const t = `tab:project:${p.id}`;
    const template = ctx.templateService.create({
      name: "Agent Override",
      prompt: "Some prompt",
      agent: "design",
    });

    const [action] = ctx.actionService.createMany(t, [
      { rank: 1, template_id: template.id, agent: "review" },
    ]);

    expect(action.prompt).toBe("Some prompt"); // inherited
    expect(action.agent).toBe("review"); // overridden
  });

  it("createMany: requires prompt when no template_id", () => {
    const p = ctx.projectService.create({ name: "No Prompt Project" });
    const t = `tab:project:${p.id}`;

    expect(() =>
      ctx.actionService.createMany(t, [{ rank: 1 }])
    ).toThrow(ServiceError);
  });

  it("createMany: throws on nonexistent template_id", () => {
    const p = ctx.projectService.create({ name: "Bad Template Project" });
    const t = `tab:project:${p.id}`;

    expect(() =>
      ctx.actionService.createMany(t, [{ rank: 1, template_id: "nonexistent" }])
    ).toThrow(ServiceError);
  });

  it("createMany: throws on duplicate ranks", () => {
    const p = ctx.projectService.create({ name: "Dupe Rank Project" });
    const t = `tab:project:${p.id}`;

    expect(() =>
      ctx.actionService.createMany(t, [
        { rank: 1, prompt: "A" },
        { rank: 1, prompt: "B" },
      ])
    ).toThrow(ServiceError);
  });

  it("createMany: throws on nonexistent target", () => {
    expect(() =>
      ctx.actionService.createMany("tab:project:nonexistent-id", [
        { rank: 1, prompt: "A" },
      ])
    ).toThrow(ServiceError);
  });

  it("createMany: throws on malformed ARN", () => {
    expect(() =>
      ctx.actionService.createMany("bad:target:123", [
        { rank: 1, prompt: "A" },
      ])
    ).toThrow(ServiceError);
  });

  it("updateMany: updates prompt and agent on multiple actions", () => {
    const p = ctx.projectService.create({ name: "Update Many Project" });
    const t = `tab:project:${p.id}`;
    const actions = ctx.actionService.createMany(t, [
      { rank: 1, prompt: "Original 1" },
      { rank: 2, prompt: "Original 2" },
    ]);

    const updated = ctx.actionService.updateMany(t, [
      { id: actions[0].id, prompt: "Updated 1", agent: "research" },
      { id: actions[1].id, prompt: "Updated 2", agent: "design" },
    ]);

    expect(updated.length).toBe(2);
    expect(updated[0].prompt).toBe("Updated 1");
    expect(updated[0].agent).toBe("research");
    expect(updated[1].prompt).toBe("Updated 2");
    expect(updated[1].agent).toBe("design");
  });

  it("updateMany: action IDs must belong to specified target", () => {
    const p1 = ctx.projectService.create({ name: "Target 1" });
    const p2 = ctx.projectService.create({ name: "Target 2" });
    const t1 = `tab:project:${p1.id}`;
    const t2 = `tab:project:${p2.id}`;

    const [a1] = ctx.actionService.createMany(t1, [{ rank: 1, prompt: "A" }]);

    expect(() =>
      ctx.actionService.updateMany(t2, [{ id: a1.id, prompt: "Hijack" }])
    ).toThrow(ServiceError);
  });

  it("deleteMany: deletes 2 of 3 actions (hard delete)", () => {
    const p = ctx.projectService.create({ name: "Delete Many Project" });
    const t = `tab:project:${p.id}`;
    const actions = ctx.actionService.createMany(t, [
      { rank: 1, prompt: "A" },
      { rank: 2, prompt: "B" },
      { rank: 3, prompt: "C" },
    ]);

    const deleted = ctx.actionService.deleteMany(t, [actions[0].id, actions[1].id]);
    expect(deleted).toBe(2);

    // Verify hard delete
    expect(ctx.actionService.findById(actions[0].id)).toBeNull();
    expect(ctx.actionService.findById(actions[1].id)).toBeNull();
    expect(ctx.actionService.findById(actions[2].id)).not.toBeNull();
  });

  it("deleteMany: action IDs must belong to specified target", () => {
    const p1 = ctx.projectService.create({ name: "Delete Target 1" });
    const p2 = ctx.projectService.create({ name: "Delete Target 2" });
    const t1 = `tab:project:${p1.id}`;
    const t2 = `tab:project:${p2.id}`;

    const [a1] = ctx.actionService.createMany(t1, [{ rank: 1, prompt: "A" }]);

    expect(() =>
      ctx.actionService.deleteMany(t2, [a1.id])
    ).toThrow(ServiceError);
  });
});

// ---------------------------------------------------------------------------
// Reorder pattern
// ---------------------------------------------------------------------------

describe("Reorder pattern", () => {
  it("delete and recreate actions to reorder", () => {
    const project = ctx.projectService.create({ name: "Reorder Project" });
    const target = `tab:project:${project.id}`;

    // Create 3 actions with ranks 1, 2, 3
    const original = ctx.actionService.createMany(target, [
      { rank: 1, prompt: "Step A" },
      { rank: 2, prompt: "Step B" },
      { rank: 3, prompt: "Step C" },
    ]);

    // Delete ranks 2 and 3
    ctx.actionService.deleteMany(target, [original[1].id, original[2].id]);

    // Recreate with new prompts at ranks 2 and 3
    const newActions = ctx.actionService.createMany(target, [
      { rank: 2, prompt: "Step D" },
      { rank: 3, prompt: "Step E" },
    ]);

    // Verify final order and content
    const all = ctx.actionService.findByTarget(target);
    expect(all.data.length).toBe(3);
    expect(all.data[0].rank).toBe(1);
    expect(all.data[0].prompt).toBe("Step A");
    expect(all.data[1].rank).toBe(2);
    expect(all.data[1].prompt).toBe("Step D");
    expect(all.data[2].rank).toBe(3);
    expect(all.data[2].prompt).toBe("Step E");
  });
});
