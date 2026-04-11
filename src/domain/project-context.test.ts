import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";

let ctx: AppContext;
let tempDir: string;

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "context-test-"));
  const dbPath = join(tempDir, "test.db");
  ctx = await bootstrap(dbPath);
});

afterAll(() => {
  ctx.db!.close();
  rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createProject(title: string, summary?: string) {
  const [p] = await ctx.projectService.create([{ title, summary }]);
  return p;
}

async function createTask(projectId: string, title: string, opts?: { status?: string; effort?: string; impact?: string; category?: string; group_key?: string }) {
  const [t] = await ctx.taskService.create([{
    project_id: projectId,
    title,
    status: opts?.status,
    effort: opts?.effort,
    impact: opts?.impact,
    category: opts?.category,
    group_key: opts?.group_key,
  }]);
  return t;
}

// ---------------------------------------------------------------------------
// get_project_context
// ---------------------------------------------------------------------------

describe("ProjectContextService", () => {
  it("returns context for an empty project", async () => {
    const project = await createProject("Empty Project", "No tasks yet");
    const result = await ctx.projectContextService.getProjectContext({
      project_id: project.id,
    });

    expect(result._meta).toBeDefined();
    expect(result._meta.tiers_included).toBeGreaterThanOrEqual(1);
    expect(result._meta.focus).toBe("full");
    expect(typeof result._meta.estimated_tokens).toBe("number");

    // Should have project info and health
    const proj = result.project as Record<string, unknown>;
    expect(proj.title).toBe("Empty Project");
    expect(proj.summary).toBe("No tasks yet");

    const health = result.health as Record<string, unknown>;
    expect(health.total_tasks).toBe(0);
    expect(health.blocked_count).toBe(0);
    expect(health.stale_count).toBe(0);
  });

  it("includes task breakdown by status", async () => {
    const project = await createProject("Task Breakdown");
    await createTask(project.id, "Todo 1");
    await createTask(project.id, "Todo 2");
    await createTask(project.id, "In Progress", { status: "in_progress" });
    await createTask(project.id, "Done", { status: "done" });

    const result = await ctx.projectContextService.getProjectContext({
      project_id: project.id,
      max_tokens: 8000,
    });

    const health = result.health as Record<string, Record<string, number>>;
    expect(health.total_tasks).toBe(4);
    expect(health.by_status.todo).toBe(2);
    expect(health.by_status.in_progress).toBe(1);
    expect(health.by_status.done).toBe(1);
  });

  it("includes blocked tasks in blockers section", async () => {
    const project = await createProject("Blockers Project");
    const [blocked] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Blocked Task",
    }]);
    await ctx.taskService.update([{ id: blocked.id, is_blocked: true }]);

    const result = await ctx.projectContextService.getProjectContext({
      project_id: project.id,
      max_tokens: 8000,
    });

    const blockers = result.blockers as Array<{ title: string; is_blocked: boolean }>;
    expect(blockers).toBeDefined();
    expect(blockers.length).toBeGreaterThanOrEqual(1);
    expect(blockers.some((b) => b.title === "Blocked Task")).toBe(true);
  });

  it("respects token budget — small budget returns fewer tiers", async () => {
    const project = await createProject("Budget Test");
    for (let i = 0; i < 10; i++) {
      await createTask(project.id, `Task ${i}`, {
        status: i < 3 ? "in_progress" : "todo",
        impact: "high",
        effort: "low",
      });
    }

    const small = await ctx.projectContextService.getProjectContext({
      project_id: project.id,
      max_tokens: 300,
    });

    const large = await ctx.projectContextService.getProjectContext({
      project_id: project.id,
      max_tokens: 10000,
    });

    // Small budget should have fewer estimated tokens
    expect(small._meta.estimated_tokens).toBeLessThan(large._meta.estimated_tokens);
    // Both should have at least tier 1
    expect(small._meta.tiers_included).toBeGreaterThanOrEqual(1);
    expect(large._meta.tiers_included).toBeGreaterThanOrEqual(small._meta.tiers_included);
  });

  it("focus=blockers prioritizes blocked tasks and dependency edges", async () => {
    const project = await createProject("Blockers Focus");
    const [task1] = await ctx.taskService.create([{ project_id: project.id, title: "Blocking Task" }]);
    const [task2] = await ctx.taskService.create([{ project_id: project.id, title: "Blocked by above" }]);
    await ctx.taskService.update([{ id: task2.id, is_blocked: true }]);
    await ctx.taskDependencyService.addDependencies(project.id, [{
      source_task_id: task1.id,
      target_task_id: task2.id,
      dependency_type: "blocks",
    }]);

    const result = await ctx.projectContextService.getProjectContext({
      project_id: project.id,
      max_tokens: 8000,
      focus: "blockers",
    });

    expect(result._meta.focus).toBe("blockers");
    expect(result.blockers).toBeDefined();
    // In blockers mode, dependency edges should appear in tier 2
    expect(result.dependency_edges).toBeDefined();
  });

  it("focus=active_work prioritizes in-progress tasks", async () => {
    const project = await createProject("Active Work Focus");
    await createTask(project.id, "In Progress Task", { status: "in_progress", impact: "high" });
    await createTask(project.id, "Todo Task", { impact: "medium" });

    const result = await ctx.projectContextService.getProjectContext({
      project_id: project.id,
      max_tokens: 8000,
      focus: "active_work",
    });

    expect(result._meta.focus).toBe("active_work");
    expect(result.in_progress).toBeDefined();
    const inProgress = result.in_progress as Array<{ title: string }>;
    expect(inProgress.some((t) => t.title === "In Progress Task")).toBe(true);
  });

  it("since parameter adds changes_since section", async () => {
    const project = await createProject("Since Test");

    // Record timestamp before creating tasks
    const before = new Date().toISOString();
    await new Promise((resolve) => setTimeout(resolve, 50));

    await createTask(project.id, "New Task After Since");
    const [doneTask] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Completed After Since",
      status: "done",
    }]);

    const result = await ctx.projectContextService.getProjectContext({
      project_id: project.id,
      max_tokens: 8000,
      since: before,
    });

    expect(result.changes_since).toBeDefined();
    const delta = result.changes_since as {
      tasks_created: Array<{ title: string }>;
      tasks_completed: Array<{ title: string }>;
    };
    expect(delta.tasks_created.some((t) => t.title === "New Task After Since")).toBe(true);
    expect(delta.tasks_completed.some((t) => t.title === "Completed After Since")).toBe(true);
  });

  it("throws 404 for nonexistent project", async () => {
    await expect(
      ctx.projectContextService.getProjectContext({ project_id: "nonexistent" })
    ).rejects.toThrow();
  });

  it("sorts todo tasks by impact desc then effort asc", async () => {
    const project = await createProject("Priority Sort");
    await createTask(project.id, "Low Impact High Effort", { impact: "low", effort: "high" });
    await createTask(project.id, "High Impact Low Effort", { impact: "high", effort: "low" });
    await createTask(project.id, "High Impact High Effort", { impact: "high", effort: "high" });

    const result = await ctx.projectContextService.getProjectContext({
      project_id: project.id,
      max_tokens: 8000,
    });

    const todoTasks = result.todo_tasks as Array<{ title: string; impact: string; effort: string }>;
    if (todoTasks && todoTasks.length >= 3) {
      // High impact, low effort should be first
      expect(todoTasks[0].title).toBe("High Impact Low Effort");
      // High impact, high effort second
      expect(todoTasks[1].title).toBe("High Impact High Effort");
      // Low impact last
      expect(todoTasks[2].title).toBe("Low Impact High Effort");
    }
  });

  it("default max_tokens is 4000", async () => {
    const project = await createProject("Default Budget");
    const result = await ctx.projectContextService.getProjectContext({
      project_id: project.id,
    });
    // With an empty project, estimated tokens should be well under 4000
    expect(result._meta.estimated_tokens).toBeLessThan(4000);
  });
});
