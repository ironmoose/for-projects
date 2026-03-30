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

  it("creates a task with description, implementation, and acceptance_criteria", () => {
    const [project] = ctx.projectService.create([{ title: "New Fields Project" }]);
    const [task] = ctx.taskService.create([{
      project_id: project.id,
      title: "Full task",
      description: "A description",
      implementation: "Some implementation details",
      acceptance_criteria: "It works",
    }]);

    expect(task.description).toBe("A description");
    expect(task.implementation).toBe("Some implementation details");
    expect(task.acceptance_criteria).toBe("It works");
  });

  it("new task fields default to null", () => {
    const [project] = ctx.projectService.create([{ title: "Null Fields Project" }]);
    const [task] = ctx.taskService.create([{
      project_id: project.id,
      title: "Bare task",
    }]);

    expect(task.description).toBeNull();
    expect(task.implementation).toBeNull();
    expect(task.acceptance_criteria).toBeNull();
  });

  it("updates description, implementation, acceptance_criteria", () => {
    const [project] = ctx.projectService.create([{ title: "Update Fields Project" }]);
    const [task] = ctx.taskService.create([{
      project_id: project.id,
      title: "Update me",
    }]);

    const [updated] = ctx.taskService.update([{
      id: task.id,
      description: "Updated desc",
      implementation: "Updated impl",
      acceptance_criteria: "Updated AC",
    }]);

    expect(updated.description).toBe("Updated desc");
    expect(updated.implementation).toBe("Updated impl");
    expect(updated.acceptance_criteria).toBe("Updated AC");
  });

  it("nulls out a field on update", () => {
    const [project] = ctx.projectService.create([{ title: "Null Update Project" }]);
    const [task] = ctx.taskService.create([{
      project_id: project.id,
      title: "Null me",
      description: "Has a description",
    }]);

    expect(task.description).toBe("Has a description");

    const [updated] = ctx.taskService.update([{
      id: task.id,
      description: null,
    }]);

    expect(updated.description).toBeNull();
  });
});
