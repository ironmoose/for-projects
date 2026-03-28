/**
 * Integration tests for ResolverService — resolve() and compilePrompt().
 *
 * Also covers the REST endpoint at GET /api/resolve.
 */
import { describe, test, expect, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { Hono } from "hono";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { WorkflowRepository } from "./repositories/workflows";
import { PhaseRepository } from "./repositories/phases";
import { InstructionRepository, BindingRepository } from "./repositories/instructions";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { WorkflowService } from "./services/workflows";
import { PhaseService } from "./services/phases";
import { InstructionService, BindingService } from "./services/instructions";
import { ResolverService } from "./services/resolver";
import { EventBus } from "./events";
import { ServiceError } from "./errors";
import { buildArn, type ArnResolverMap, type EntityResolverMap } from "./arn";
import { resolveRoutes } from "../server/routes/resolve";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ResolverTestContext {
  db: Database;
  projectService: ProjectService;
  taskService: TaskService;
  workflowService: WorkflowService;
  phaseService: PhaseService;
  instructionService: InstructionService;
  bindingService: BindingService;
  resolverService: ResolverService;
  app: Hono;
  cleanup: () => void;
}

function createResolverTestContext(): ResolverTestContext {
  const dir = mkdtempSync(join(tmpdir(), "resolver-test-"));
  const dbPath = join(dir, "test.db");
  const db = new Database(dbPath);
  db.run("PRAGMA foreign_keys = ON");

  const eventBus = new EventBus();
  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const workflowRepo = new WorkflowRepository(db);
  const phaseRepo = new PhaseRepository(db);
  const instructionRepo = new InstructionRepository(db);
  const bindingRepo = new BindingRepository(db);

  const arnResolvers: ArnResolverMap = {
    project: (id) => projectRepo.findById(id) !== null,
    task: (id) => taskRepo.findById(id) !== null,
    workflow: (id) => workflowRepo.findById(id) !== null,
    phase: (id) => phaseRepo.findById(id) !== null,
    instruction: (id) => instructionRepo.findById(id) !== null,
  };

  const projectService = new ProjectService(projectRepo, eventBus);
  const taskService = new TaskService(taskRepo, projectRepo, eventBus);
  const workflowService = new WorkflowService(workflowRepo, eventBus);
  const phaseService = new PhaseService(phaseRepo, workflowRepo, eventBus);
  const instructionService = new InstructionService(instructionRepo, phaseRepo, eventBus);
  const bindingService = new BindingService(
    bindingRepo, instructionRepo, arnResolvers, eventBus,
  );

  const entityResolvers: EntityResolverMap = {
    project: (id) => projectService.findById(id),
    task: (id) => taskService.findById(id),
    workflow: (id) => workflowService.findById(id),
    phase: (id) => phaseService.findByIdDirect(id),
    instruction: (id) => instructionService.findByIdDirect(id),
  };

  const resolverService = new ResolverService(bindingService, entityResolvers);

  // Build a minimal Hono app with the resolve route + error handler
  const app = new Hono();
  app.route("/api/resolve", resolveRoutes(resolverService));
  app.onError((err, c) => {
    if (err instanceof ServiceError) {
      return c.json({ error: err.message }, err.statusCode as 400 | 404 | 500);
    }
    return c.json({ error: "internal server error" }, 500);
  });

  return {
    db, projectService, taskService, workflowService,
    phaseService, instructionService, bindingService,
    resolverService, app,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Helper: create a workflow + phase and return { workflow, phase }. */
function createWorkflowAndPhase(ctx: ResolverTestContext) {
  const workflow = ctx.workflowService.create({ goal: "Resolver test workflow" });
  const phase = ctx.phaseService.create(workflow.id, { title: "Phase 1" });
  return { workflow, phase };
}

// ---------------------------------------------------------------------------
// Tests — ResolverService.resolve()
// ---------------------------------------------------------------------------

describe("ResolverService.resolve()", () => {
  let ctx: ResolverTestContext;

  afterEach(() => {
    ctx?.cleanup();
  });

  test("resolves a single task ARN", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "P1" });
    const task = ctx.taskService.create(project.id, { title: "My Task" });
    const arn = buildArn("task", task.id);

    const results = ctx.resolverService.resolve([arn]);
    expect(results).toHaveLength(1);
    expect(results[0].arn).toBe(arn);
    expect(results[0].type).toBe("task");
    expect(results[0].data).not.toBeNull();
    expect((results[0].data as { title: string }).title).toBe("My Task");
  });

  test("resolves multiple ARNs in batch", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "P1" });
    const task = ctx.taskService.create(project.id, { title: "T1" });
    const workflow = ctx.workflowService.create({ goal: "W1" });

    const results = ctx.resolverService.resolve([
      buildArn("project", project.id),
      buildArn("task", task.id),
      buildArn("workflow", workflow.id),
    ]);

    expect(results).toHaveLength(3);
    expect(results[0].type).toBe("project");
    expect(results[1].type).toBe("task");
    expect(results[2].type).toBe("workflow");
    expect(results.every((r) => r.data !== null)).toBe(true);
  });

  test("resolves an instruction ARN and includes its bindings", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "P1" });
    const task = ctx.taskService.create(project.id, { title: "T1" });
    const { phase } = createWorkflowAndPhase(ctx);
    const instruction = ctx.instructionService.create(phase.id, { prompt: "Do something" });
    ctx.bindingService.create(instruction.id, { arn: buildArn("task", task.id) });

    const results = ctx.resolverService.resolve([buildArn("instruction", instruction.id)]);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("instruction");
    expect(results[0].bindings).toBeDefined();
    expect(results[0].bindings).toHaveLength(1);
  });

  test("returns error for invalid ARN format", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const results = ctx.resolverService.resolve(["not-an-arn"]);
    expect(results).toHaveLength(1);
    expect(results[0].data).toBeNull();
    expect(results[0].type).toBeNull();
    expect(results[0].error).toBeDefined();
  });

  test("returns null data for nonexistent resource", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const results = ctx.resolverService.resolve([buildArn("task", "NONEXISTENT")]);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("task");
    expect(results[0].data).toBeNull();
    expect(results[0].error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — ResolverService.compilePrompt()
// ---------------------------------------------------------------------------

describe("ResolverService.compilePrompt()", () => {
  let ctx: ResolverTestContext;

  afterEach(() => {
    ctx?.cleanup();
  });

  test("instruction with no bindings — just the prompt, no sections", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const { phase } = createWorkflowAndPhase(ctx);
    const instruction = ctx.instructionService.create(phase.id, {
      prompt: "Analyze the requirements",
    });

    const result = ctx.resolverService.compilePrompt(instruction.id);
    expect(result.instruction.id).toBe(instruction.id);
    expect(result.instruction.prompt).toBe("Analyze the requirements");
    expect(result.sections).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  test("instruction with task binding — prompt + Task section", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "P1" });
    const task = ctx.taskService.create(project.id, {
      title: "Build login page",
      description: "Implement OAuth login",
    });
    const { phase } = createWorkflowAndPhase(ctx);
    const instruction = ctx.instructionService.create(phase.id, {
      prompt: "Work on the task",
    });
    ctx.bindingService.create(instruction.id, { arn: buildArn("task", task.id) });

    const result = ctx.resolverService.compilePrompt(instruction.id);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].header).toBe("Task");
    expect(result.sections[0].type).toBe("task");
    expect(result.sections[0].content).toContain("Build login page");
    expect(result.sections[0].content).toContain("Implement OAuth login");
    expect(result.sections[0].truncated).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  test("instruction with instruction binding — prompt + Context section (uses output field)", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const { phase } = createWorkflowAndPhase(ctx);
    const upstream = ctx.instructionService.create(phase.id, {
      prompt: "Upstream analysis",
    });
    ctx.instructionService.update(phase.id, upstream.id, {
      output: "Analysis complete: 3 critical issues found",
    });

    const downstream = ctx.instructionService.create(phase.id, {
      prompt: "Fix the issues",
    });
    ctx.bindingService.create(downstream.id, {
      arn: buildArn("instruction", upstream.id),
    });

    const result = ctx.resolverService.compilePrompt(downstream.id);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].header).toBe("Context");
    expect(result.sections[0].type).toBe("instruction");
    expect(result.sections[0].content).toBe("Analysis complete: 3 critical issues found");
    expect(result.warnings).toHaveLength(0);
  });

  test("instruction binding where output is null — graceful placeholder", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const { phase } = createWorkflowAndPhase(ctx);
    const upstream = ctx.instructionService.create(phase.id, {
      prompt: "Pending step",
    });
    // Deliberately do NOT set output on upstream

    const downstream = ctx.instructionService.create(phase.id, {
      prompt: "Depends on upstream",
    });
    ctx.bindingService.create(downstream.id, {
      arn: buildArn("instruction", upstream.id),
    });

    const result = ctx.resolverService.compilePrompt(downstream.id);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].content).toBe("Output not yet available.");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("no output");
  });

  test("mixed bindings — correct section assembly", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "Project Alpha" });
    const task = ctx.taskService.create(project.id, {
      title: "Important task",
      description: "Do the thing",
    });
    const { workflow, phase } = createWorkflowAndPhase(ctx);
    const upstream = ctx.instructionService.create(phase.id, {
      prompt: "First step",
    });
    ctx.instructionService.update(phase.id, upstream.id, {
      output: "Step 1 done",
    });

    const instruction = ctx.instructionService.create(phase.id, {
      prompt: "Main instruction",
    });

    // Bind task, project, instruction, and workflow
    ctx.bindingService.create(instruction.id, { arn: buildArn("task", task.id) });
    ctx.bindingService.create(instruction.id, { arn: buildArn("project", project.id) });
    ctx.bindingService.create(instruction.id, { arn: buildArn("instruction", upstream.id) });
    ctx.bindingService.create(instruction.id, { arn: buildArn("workflow", workflow.id) });

    const result = ctx.resolverService.compilePrompt(instruction.id);
    expect(result.sections).toHaveLength(4);

    // Verify each section type is present with correct headers
    const headers = result.sections.map((s) => s.header);
    expect(headers).toContain("Task");
    expect(headers).toContain("Goal");
    expect(headers).toContain("Context");
    expect(headers).toContain("Workflow");
    expect(result.warnings).toHaveLength(0);
  });

  test("nonexistent instruction — throws 404 ServiceError", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    expect(() => {
      ctx.resolverService.compilePrompt("NONEXISTENT");
    }).toThrow(ServiceError);

    try {
      ctx.resolverService.compilePrompt("NONEXISTENT");
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceError);
      expect((err as ServiceError).statusCode).toBe(404);
    }
  });

  test("binding to deleted resource — tombstone section + warning", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "Will be deleted" });
    const task = ctx.taskService.create(project.id, { title: "Doomed task" });
    const { phase } = createWorkflowAndPhase(ctx);
    const instruction = ctx.instructionService.create(phase.id, {
      prompt: "Reference a task",
    });

    const taskArn = buildArn("task", task.id);
    ctx.bindingService.create(instruction.id, { arn: taskArn });

    // Delete the task after the binding was created
    ctx.taskService.delete(project.id, task.id);

    const result = ctx.resolverService.compilePrompt(instruction.id);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].content).toContain("no longer exists");
    expect(result.sections[0].truncated).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("resolved to null");
    expect(result.warnings[0]).toContain("deleted");
  });

  test("truncation behavior for oversized sections", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const { phase } = createWorkflowAndPhase(ctx);
    const upstream = ctx.instructionService.create(phase.id, {
      prompt: "Generate large output",
    });
    // Set an output that exceeds the max section length
    const largeOutput = "x".repeat(15_000);
    ctx.instructionService.update(phase.id, upstream.id, {
      output: largeOutput,
    });

    const downstream = ctx.instructionService.create(phase.id, {
      prompt: "Process large output",
    });
    ctx.bindingService.create(downstream.id, {
      arn: buildArn("instruction", upstream.id),
    });

    // Use default max (10,000)
    const result = ctx.resolverService.compilePrompt(downstream.id);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].truncated).toBe(true);
    expect(result.sections[0].content).toContain("[Truncated");
    expect(result.sections[0].content).toContain("15000 characters");
    // Truncated content should be shorter than the original
    expect(result.sections[0].content.length).toBeLessThan(largeOutput.length);
  });

  test("truncation with custom maxSectionLength", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const { phase } = createWorkflowAndPhase(ctx);
    const upstream = ctx.instructionService.create(phase.id, {
      prompt: "Generate output",
    });
    ctx.instructionService.update(phase.id, upstream.id, {
      output: "x".repeat(200),
    });

    const downstream = ctx.instructionService.create(phase.id, {
      prompt: "Process output",
    });
    ctx.bindingService.create(downstream.id, {
      arn: buildArn("instruction", upstream.id),
    });

    // With a small max, content should be truncated
    const result = ctx.resolverService.compilePrompt(downstream.id, { maxSectionLength: 50 });
    expect(result.sections[0].truncated).toBe(true);
    expect(result.sections[0].content).toContain("[Truncated");

    // With a large max, no truncation
    const result2 = ctx.resolverService.compilePrompt(downstream.id, { maxSectionLength: 500 });
    expect(result2.sections[0].truncated).toBe(false);
  });

  test("no truncation when content fits within limit", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "Small project" });
    const task = ctx.taskService.create(project.id, {
      title: "Small task",
      description: "Brief",
    });
    const { phase } = createWorkflowAndPhase(ctx);
    const instruction = ctx.instructionService.create(phase.id, { prompt: "Test" });
    ctx.bindingService.create(instruction.id, { arn: buildArn("task", task.id) });

    const result = ctx.resolverService.compilePrompt(instruction.id);
    expect(result.sections[0].truncated).toBe(false);
    expect(result.sections[0].content).not.toContain("[Truncated");
  });
});

// ---------------------------------------------------------------------------
// Tests — REST endpoint GET /api/resolve
// ---------------------------------------------------------------------------

describe("GET /api/resolve", () => {
  let ctx: ResolverTestContext;

  afterEach(() => {
    ctx?.cleanup();
  });

  test("returns 400 when no arn parameter provided", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const res = await ctx.app.request("/api/resolve");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("arn");
  });

  test("resolves a single ARN", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "REST test" });
    const arn = buildArn("project", project.id);

    const res = await ctx.app.request(`/api/resolve?arn=${encodeURIComponent(arn)}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.arn).toBe(arn);
    expect(body.data.type).toBe("project");
    expect(body.data.data).not.toBeNull();
  });

  test("resolves multiple ARNs", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "P1" });
    const workflow = ctx.workflowService.create({ goal: "W1" });

    const arn1 = buildArn("project", project.id);
    const arn2 = buildArn("workflow", workflow.id);

    const res = await ctx.app.request(
      `/api/resolve?arn=${encodeURIComponent(arn1)}&arn=${encodeURIComponent(arn2)}`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  test("compile=prompt returns compiled instruction", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "P1" });
    const task = ctx.taskService.create(project.id, { title: "T1", description: "Desc" });
    const { phase } = createWorkflowAndPhase(ctx);
    const instruction = ctx.instructionService.create(phase.id, { prompt: "Do it" });
    ctx.bindingService.create(instruction.id, { arn: buildArn("task", task.id) });

    const arn = buildArn("instruction", instruction.id);
    const res = await ctx.app.request(
      `/api/resolve?arn=${encodeURIComponent(arn)}&compile=prompt`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.instruction).toBeDefined();
    expect(body.data.instruction.prompt).toBe("Do it");
    expect(body.data.sections).toHaveLength(1);
    expect(body.data.sections[0].header).toBe("Task");
  });

  test("compile=prompt returns 400 for non-instruction ARN", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const project = ctx.projectService.create({ name: "P1" });
    const arn = buildArn("project", project.id);

    const res = await ctx.app.request(
      `/api/resolve?arn=${encodeURIComponent(arn)}&compile=prompt`,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("instruction");
  });

  test("compile=prompt returns 400 for multiple ARNs", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const { phase } = createWorkflowAndPhase(ctx);
    const i1 = ctx.instructionService.create(phase.id, { prompt: "A" });
    const i2 = ctx.instructionService.create(phase.id, { prompt: "B" });

    const arn1 = buildArn("instruction", i1.id);
    const arn2 = buildArn("instruction", i2.id);

    const res = await ctx.app.request(
      `/api/resolve?arn=${encodeURIComponent(arn1)}&arn=${encodeURIComponent(arn2)}&compile=prompt`,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("exactly one");
  });

  test("compile=prompt returns 404 for nonexistent instruction", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const arn = buildArn("instruction", "NONEXISTENT");
    const res = await ctx.app.request(
      `/api/resolve?arn=${encodeURIComponent(arn)}&compile=prompt`,
    );
    expect(res.status).toBe(404);
  });

  test("unknown compile mode returns 400", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const { phase } = createWorkflowAndPhase(ctx);
    const instruction = ctx.instructionService.create(phase.id, { prompt: "X" });
    const arn = buildArn("instruction", instruction.id);

    const res = await ctx.app.request(
      `/api/resolve?arn=${encodeURIComponent(arn)}&compile=unknown`,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Unknown compile mode");
  });

  test("invalid ARN format with compile=prompt returns 400", async () => {
    ctx = createResolverTestContext();
    await runMigrations(ctx.db);

    const res = await ctx.app.request(
      `/api/resolve?arn=bad-arn&compile=prompt`,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid ARN");
  });
});
