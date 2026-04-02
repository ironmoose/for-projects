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

// ---------------------------------------------------------------------------
// Document CRUD
// ---------------------------------------------------------------------------

describe("Document CRUD", () => {
  it("creates a document with title and content", () => {
    const [doc] = ctx.documentService.create([{
      title: "My Document",
      content: "Some content here",
    }]);

    expect(doc.id).toBeTruthy();
    expect(doc.id.length).toBeGreaterThan(10);
    expect(doc.title).toBe("My Document");
    expect(doc.content).toBe("Some content here");
    expect(doc.created_at).toBeTruthy();
    expect(doc.updated_at).toBeTruthy();
    expect(() => new Date(doc.created_at)).not.toThrow();
  });

  it("creates a document with tags array", () => {
    const [doc] = ctx.documentService.create([{
      title: "Tagged Doc",
      tags: ["api", "design"],
    }]);

    expect(doc.tags).toBeArray();
    expect(doc.tags).toContain("api");
    expect(doc.tags).toContain("design");
  });

  it("updates document title and content", () => {
    const [doc] = ctx.documentService.create([{ title: "Original Title", content: "Old" }]);
    const [updated] = ctx.documentService.update([{
      id: doc.id,
      title: "New Title",
      content: "New content",
    }]);

    expect(updated.title).toBe("New Title");
    expect(updated.content).toBe("New content");
  });

  it("lists documents with pagination", () => {
    // Create a few documents for listing
    ctx.documentService.create([
      { title: "Paginated A" },
      { title: "Paginated B" },
      { title: "Paginated C" },
    ]);

    const page1 = ctx.documentService.list({ limit: 2, offset: 0 });
    expect(page1.data).toBeArray();
    expect(page1.data.length).toBeLessThanOrEqual(2);
    expect(typeof page1.total).toBe("number");
    expect(page1.total).toBeGreaterThanOrEqual(3);
  });

  it("lists documents filtered by tag", () => {
    ctx.documentService.create([{ title: "Tagged for filter", tags: ["unique-filter-tag"] }]);
    ctx.documentService.create([{ title: "Untagged for filter" }]);

    const result = ctx.documentService.list({ tag: "unique-filter-tag" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    for (const doc of result.data) {
      expect(doc.tags).toContain("unique-filter-tag");
    }
  });

  it("lists documents filtered by title search", () => {
    ctx.documentService.create([{ title: "UniqueSearchableName123" }]);

    const result = ctx.documentService.list({ title: "UniqueSearchableName123" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0].title).toBe("UniqueSearchableName123");
  });

  it("gets single document by id with full content", () => {
    const [doc] = ctx.documentService.create([{
      title: "Full Doc",
      content: "Full content body",
      tags: ["get-test"],
    }]);

    const fetched = ctx.documentService.get(doc.id);
    expect(fetched.id).toBe(doc.id);
    expect(fetched.title).toBe("Full Doc");
    expect(fetched.content).toBe("Full content body");
    expect(fetched.tags).toContain("get-test");
  });

  it("rejects empty title", () => {
    expect(() => ctx.documentService.create([{ title: "" }])).toThrow(ServiceError);
  });

  it("throws 404 when updating nonexistent document", () => {
    expect(() =>
      ctx.documentService.update([{ id: "nonexistent", title: "X" }])
    ).toThrow(ServiceError);
  });

  it("deletes a document and verifies it is gone", () => {
    const [doc] = ctx.documentService.create([{ title: "Delete Me" }]);
    ctx.documentService.remove([doc.id]);

    expect(() => ctx.documentService.get(doc.id)).toThrow(ServiceError);
  });

  it("emits activity log after create", () => {
    const [doc] = ctx.documentService.create([{ title: "Activity Log Doc" }]);

    const logs = ctx.activityLogRepo.findMany({
      entity_type: "document",
      entity_id: doc.id,
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const createLog = logs.find((l) => l.action === "created");
    expect(createLog).toBeTruthy();
    expect(createLog!.entity_id).toBe(doc.id);
  });

  // Tag-specific tests

  it("normalizes tags to lowercase", () => {
    const [doc] = ctx.documentService.create([{
      title: "Case Tag Doc",
      tags: ["UPPER", "MiXeD"],
    }]);

    expect(doc.tags).toContain("upper");
    expect(doc.tags).toContain("mixed");
    expect(doc.tags).not.toContain("UPPER");
    expect(doc.tags).not.toContain("MiXeD");
  });

  it("setTagsForEntity replaces all tags", () => {
    const [doc] = ctx.documentService.create([{
      title: "Replace Tags Doc",
      tags: ["old-a", "old-b"],
    }]);

    expect(doc.tags).toContain("old-a");
    expect(doc.tags).toContain("old-b");

    const [updated] = ctx.documentService.update([{
      id: doc.id,
      tags: ["new-x"],
    }]);

    expect(updated.tags).toEqual(["new-x"]);
  });

  it("getTagsForEntity returns current tags", () => {
    const [doc] = ctx.documentService.create([{
      title: "Get Tags Doc",
      tags: ["alpha", "beta"],
    }]);

    const fetched = ctx.documentService.get(doc.id);
    expect(fetched.tags).toContain("alpha");
    expect(fetched.tags).toContain("beta");
    expect(fetched.tags.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Project-Document Linking
// ---------------------------------------------------------------------------

describe("Project-Document Linking", () => {
  it("attaches documents via project update", () => {
    const [project] = ctx.projectService.create([{ title: "Link Project" }]);
    const [doc] = ctx.documentService.create([{ title: "Link Doc" }]);

    ctx.projectService.update([{
      id: project.id,
      attach_documents: [doc.id],
    }]);

    const fetched = ctx.projectService.get(project.id);
    expect(fetched.documents.length).toBeGreaterThanOrEqual(1);
    expect(fetched.documents.some((d) => d.id === doc.id)).toBe(true);
  });

  it("detaches documents via project update", () => {
    const [project] = ctx.projectService.create([{ title: "Detach Project" }]);
    const [doc] = ctx.documentService.create([{ title: "Detach Doc" }]);

    ctx.projectService.update([{ id: project.id, attach_documents: [doc.id] }]);
    const before = ctx.projectService.get(project.id);
    expect(before.documents.some((d) => d.id === doc.id)).toBe(true);

    ctx.projectService.update([{ id: project.id, detach_documents: [doc.id] }]);
    const after = ctx.projectService.get(project.id);
    expect(after.documents.some((d) => d.id === doc.id)).toBe(false);
  });

  it("rejects same ID in both attach and detach", () => {
    const [project] = ctx.projectService.create([{ title: "Conflict Project" }]);
    const [doc] = ctx.documentService.create([{ title: "Conflict Doc" }]);

    expect(() =>
      ctx.projectService.update([{
        id: project.id,
        attach_documents: [doc.id],
        detach_documents: [doc.id],
      }])
    ).toThrow(ServiceError);
  });

  it("throws 404 on nonexistent document ID in attach", () => {
    const [project] = ctx.projectService.create([{ title: "404 Attach Project" }]);

    expect(() =>
      ctx.projectService.update([{
        id: project.id,
        attach_documents: ["nonexistent-doc-id"],
      }])
    ).toThrow(ServiceError);
  });

  it("idempotent re-attach does not error", () => {
    const [project] = ctx.projectService.create([{ title: "Idempotent Project" }]);
    const [doc] = ctx.documentService.create([{ title: "Idempotent Doc" }]);

    ctx.projectService.update([{ id: project.id, attach_documents: [doc.id] }]);
    // Second attach should not throw
    expect(() =>
      ctx.projectService.update([{ id: project.id, attach_documents: [doc.id] }])
    ).not.toThrow();

    const fetched = ctx.projectService.get(project.id);
    // Should still appear exactly once
    const matches = fetched.documents.filter((d) => d.id === doc.id);
    expect(matches.length).toBe(1);
  });

  it("project GET includes document summaries without content", () => {
    const [project] = ctx.projectService.create([{ title: "Summary Project" }]);
    const [doc] = ctx.documentService.create([{
      title: "Summary Doc",
      content: "This should not appear",
    }]);

    ctx.projectService.update([{ id: project.id, attach_documents: [doc.id] }]);

    const fetched = ctx.projectService.get(project.id);
    const linked = fetched.documents.find((d) => d.id === doc.id);
    expect(linked).toBeTruthy();
    expect(linked!.title).toBe("Summary Doc");
    expect(linked!.id).toBe(doc.id);
    // DocumentSummary should not include content field
    expect((linked as any).content).toBeUndefined();
  });

  it("cascade on document delete removes join rows", () => {
    const [project] = ctx.projectService.create([{ title: "Cascade Project" }]);
    const [doc] = ctx.documentService.create([{ title: "Cascade Doc" }]);

    ctx.projectService.update([{ id: project.id, attach_documents: [doc.id] }]);
    const before = ctx.projectService.get(project.id);
    expect(before.documents.some((d) => d.id === doc.id)).toBe(true);

    ctx.documentService.remove([doc.id]);

    const after = ctx.projectService.get(project.id);
    expect(after.documents.some((d) => d.id === doc.id)).toBe(false);
  });
});
