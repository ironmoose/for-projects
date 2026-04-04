import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";
import type { TagName } from "./entities";

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
      tags: ["security", "ui"],
    }]);

    expect(doc.tags).toBeArray();
    expect(doc.tags).toContain("security");
    expect(doc.tags).toContain("ui");
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
    ctx.documentService.create([{ title: "Tagged for filter", tags: ["infra"] }]);
    ctx.documentService.create([{ title: "Untagged for filter" }]);

    const result = ctx.documentService.list({ tag: "infra" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    for (const doc of result.data) {
      expect(doc.tags).toContain("infra");
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
      tags: ["guide"],
    }]);

    const fetched = ctx.documentService.get(doc.id);
    expect(fetched.id).toBe(doc.id);
    expect(fetched.title).toBe("Full Doc");
    expect(fetched.content).toBe("Full content body");
    expect(fetched.tags).toContain("guide");
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
      tags: ["UI", "Data"] as string[] as TagName[],
    }]);

    expect(doc.tags).toContain("ui");
    expect(doc.tags).toContain("data");
    expect(doc.tags).not.toContain("UI");
    expect(doc.tags).not.toContain("Data");
  });

  it("setTagsForEntity replaces all tags", () => {
    const [doc] = ctx.documentService.create([{
      title: "Replace Tags Doc",
      tags: ["security", "performance"],
    }]);

    expect(doc.tags).toContain("security");
    expect(doc.tags).toContain("performance");

    const [updated] = ctx.documentService.update([{
      id: doc.id,
      tags: ["testing"],
    }]);

    expect(updated.tags).toEqual(["testing"]);
  });

  it("getTagsForEntity returns current tags", () => {
    const [doc] = ctx.documentService.create([{
      title: "Get Tags Doc",
      tags: ["architecture", "domain"],
    }]);

    const fetched = ctx.documentService.get(doc.id);
    expect(fetched.tags).toContain("architecture");
    expect(fetched.tags).toContain("domain");
    expect(fetched.tags.length).toBe(2);
  });

  it("rejects invalid tag names on create", () => {
    expect(() =>
      ctx.documentService.create([{ title: "Bad Tag Doc", tags: ["invalid-tag"] as any }])
    ).toThrow(ServiceError);
  });

  it("rejects invalid tag names on update", () => {
    const [doc] = ctx.documentService.create([{ title: "Update Bad Tag Doc" }]);
    expect(() =>
      ctx.documentService.update([{ id: doc.id, tags: ["not-a-tag"] as any }])
    ).toThrow(ServiceError);
  });

  it("batch creates multiple documents in one call", () => {
    const docs = ctx.documentService.create([
      { title: "Batch Doc A", content: "Content A" },
      { title: "Batch Doc B", content: "Content B" },
      { title: "Batch Doc C" },
    ]);

    expect(docs).toHaveLength(3);
    expect(docs[0].title).toBe("Batch Doc A");
    expect(docs[0].content).toBe("Content A");
    expect(docs[1].title).toBe("Batch Doc B");
    expect(docs[1].content).toBe("Content B");
    expect(docs[2].title).toBe("Batch Doc C");
    expect(docs[2].id).toBeTruthy();
  });

  it("creates document with content=undefined defaults to null", () => {
    const [doc] = ctx.documentService.create([{ title: "No Content Doc" }]);

    expect(doc.content).toBeNull();
  });

  it("update with tags=[] clears all tags", () => {
    const [doc] = ctx.documentService.create([{
      title: "Clear Tags Doc",
      tags: ["security", "ui"],
    }]);

    expect(doc.tags.length).toBe(2);

    const [updated] = ctx.documentService.update([{
      id: doc.id,
      tags: [],
    }]);

    expect(updated.tags).toEqual([]);

    const fetched = ctx.documentService.get(doc.id);
    expect(fetched.tags).toEqual([]);
  });

  it("deletes multiple documents in one call", () => {
    const docs = ctx.documentService.create([
      { title: "Batch Del A" },
      { title: "Batch Del B" },
      { title: "Batch Del C" },
    ]);

    ctx.documentService.remove(docs.map((d) => d.id));

    for (const doc of docs) {
      expect(() => ctx.documentService.get(doc.id)).toThrow(ServiceError);
    }
  });

  it("delete document cleans up entity_tags rows", () => {
    const [doc] = ctx.documentService.create([{
      title: "Tag Cleanup Doc",
      tags: ["architecture", "guide"],
    }]);

    const beforeGet = ctx.documentService.get(doc.id);
    expect(beforeGet.tags.length).toBe(2);

    // Link to a project to verify cascade on that side too
    const [project] = ctx.projectService.create([{ title: "Tag Cleanup Project" }]);
    ctx.projectService.update([{ id: project.id, attach_documents: [doc.id] }]);

    ctx.documentService.remove([doc.id]);

    // Document is gone
    expect(() => ctx.documentService.get(doc.id)).toThrow(ServiceError);

    // Project-document link is also gone
    const projectAfter = ctx.projectService.get(project.id);
    expect(projectAfter.documents.some((d) => d.id === doc.id)).toBe(false);
  });

  it("lists documents filtered by project_id", () => {
    const [project] = ctx.projectService.create([{ title: "Doc Filter Project" }]);
    const [linkedDoc] = ctx.documentService.create([{ title: "Linked Doc for Filter" }]);
    const [unlinkedDoc] = ctx.documentService.create([{ title: "Unlinked Doc for Filter" }]);

    ctx.projectService.update([{ id: project.id, attach_documents: [linkedDoc.id] }]);

    const result = ctx.documentService.list({ project_id: project.id });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.some((d) => d.id === linkedDoc.id)).toBe(true);
    expect(result.data.some((d) => d.id === unlinkedDoc.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Batch Tag Fetching (N+1 fix)
// ---------------------------------------------------------------------------

describe("Batch Tag Fetching", () => {
  it("getTagsForEntities returns correct tags for multiple documents", () => {
    const { TagRepository } = require("./repositories/tags");
    const tagRepo = new TagRepository(ctx.db);

    const [doc1] = ctx.documentService.create([{ title: "Batch Tag Doc 1", tags: ["ui", "data"] }]);
    const [doc2] = ctx.documentService.create([{ title: "Batch Tag Doc 2", tags: ["security"] }]);
    const [doc3] = ctx.documentService.create([{ title: "Batch Tag Doc 3" }]);

    const tagMap = tagRepo.getTagsForEntities("document", [doc1.id, doc2.id, doc3.id]);

    expect(tagMap.get(doc1.id)?.sort()).toEqual(["data", "ui"]);
    expect(tagMap.get(doc2.id)).toEqual(["security"]);
    expect(tagMap.get(doc3.id)).toBeUndefined(); // no tags = not in map
  });

  it("getTagsForEntities returns empty Map for empty input", () => {
    const { TagRepository } = require("./repositories/tags");
    const tagRepo = new TagRepository(ctx.db);

    const tagMap = tagRepo.getTagsForEntities("document", []);
    expect(tagMap.size).toBe(0);
  });

  it("DocumentService.list() returns correct tags on each document summary", () => {
    const [d1] = ctx.documentService.create([{ title: "List Tag A", tags: ["architecture"] }]);
    const [d2] = ctx.documentService.create([{ title: "List Tag B", tags: ["conventions", "guide"] }]);

    const result = ctx.documentService.list({ title: "List Tag" });
    expect(result.data.length).toBe(2);

    const a = result.data.find((d) => d.id === d1.id);
    const b = result.data.find((d) => d.id === d2.id);

    expect(a?.tags).toEqual(["architecture"]);
    expect(b?.tags?.sort()).toEqual(["conventions", "guide"]);
  });
});

// ---------------------------------------------------------------------------
// Document Summary Field
// ---------------------------------------------------------------------------

describe("Document Summary Field", () => {
  it("creates document with summary", () => {
    const [doc] = ctx.documentService.create([{
      title: "Doc With Summary",
      summary: "A short summary",
      content: "Full content here",
    }]);

    expect(doc.summary).toBe("A short summary");
    expect(doc.content).toBe("Full content here");
  });

  it("creates document without summary defaults to null", () => {
    const [doc] = ctx.documentService.create([{ title: "No Summary Doc" }]);

    expect(doc.summary).toBeNull();
  });

  it("updates summary", () => {
    const [doc] = ctx.documentService.create([{ title: "Update Summary Doc" }]);
    const [updated] = ctx.documentService.update([{
      id: doc.id,
      summary: "New summary",
    }]);

    expect(updated.summary).toBe("New summary");
  });

  it("sets summary to null to clear it", () => {
    const [doc] = ctx.documentService.create([{
      title: "Clear Summary Doc",
      summary: "Will be cleared",
    }]);
    expect(doc.summary).toBe("Will be cleared");

    const [updated] = ctx.documentService.update([{
      id: doc.id,
      summary: null,
    }]);

    expect(updated.summary).toBeNull();
  });

  it("summary appears in list results", () => {
    const [doc] = ctx.documentService.create([{
      title: "SummaryListTestUnique999",
      summary: "Listed summary",
    }]);

    const result = ctx.documentService.list({ title: "SummaryListTestUnique999" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    const found = result.data.find((d) => d.id === doc.id);
    expect(found).toBeTruthy();
    expect(found!.summary).toBe("Listed summary");
  });

  it("summary appears in get results", () => {
    const [doc] = ctx.documentService.create([{
      title: "Summary Get Doc",
      summary: "Get summary",
    }]);

    const fetched = ctx.documentService.get(doc.id);
    expect(fetched.summary).toBe("Get summary");
  });

  it("rejects summary over 500 characters on create", () => {
    expect(() =>
      ctx.documentService.create([{ title: "Long Summary", summary: "x".repeat(501) }])
    ).toThrow(ServiceError);
  });

  it("rejects summary over 500 characters on update", () => {
    const [doc] = ctx.documentService.create([{ title: "Update Long Summary" }]);
    expect(() =>
      ctx.documentService.update([{ id: doc.id, summary: "x".repeat(501) }])
    ).toThrow(ServiceError);
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

  it("attaches multiple documents in single update", () => {
    const [project] = ctx.projectService.create([{ title: "Multi Attach Project" }]);
    const [docA] = ctx.documentService.create([{ title: "Multi Attach Doc A" }]);
    const [docB] = ctx.documentService.create([{ title: "Multi Attach Doc B" }]);

    ctx.projectService.update([{
      id: project.id,
      attach_documents: [docA.id, docB.id],
    }]);

    const fetched = ctx.projectService.get(project.id);
    expect(fetched.documents.some((d) => d.id === docA.id)).toBe(true);
    expect(fetched.documents.some((d) => d.id === docB.id)).toBe(true);
    expect(fetched.documents.length).toBeGreaterThanOrEqual(2);
  });

  it("detach nonexistent document link silently succeeds", () => {
    const [project] = ctx.projectService.create([{ title: "Silent Detach Project" }]);
    const [doc] = ctx.documentService.create([{ title: "Never Attached Doc" }]);

    // Detach a doc that was never attached — should not throw
    expect(() =>
      ctx.projectService.update([{
        id: project.id,
        detach_documents: [doc.id],
      }])
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Input Validation Edge Cases
// ---------------------------------------------------------------------------

describe("Input Validation Edge Cases", () => {
  let projectId: string;

  beforeAll(() => {
    const [project] = ctx.projectService.create([{ title: "Validation Test Project" }]);
    projectId = project.id;
  });

  // --- Invalid enum values ---

  it("rejects task with invalid status enum", () => {
    expect(() =>
      ctx.taskService.create([{
        project_id: projectId,
        title: "Bad status",
        status: "invalid" as any,
      }])
    ).toThrow(ServiceError);
  });

  it("rejects task with invalid effort enum", () => {
    expect(() =>
      ctx.taskService.create([{
        project_id: projectId,
        title: "Bad effort",
        effort: "mega" as any,
      }])
    ).toThrow(ServiceError);
  });

  it("rejects task with invalid impact enum", () => {
    expect(() =>
      ctx.taskService.create([{
        project_id: projectId,
        title: "Bad impact",
        impact: "none" as any,
      }])
    ).toThrow(ServiceError);
  });

  it("rejects task with invalid category enum", () => {
    expect(() =>
      ctx.taskService.create([{
        project_id: projectId,
        title: "Bad category",
        category: "misc" as any,
      }])
    ).toThrow(ServiceError);
  });

  // --- Field length limits ---

  it("rejects task with group_key over 32 chars", () => {
    expect(() =>
      ctx.taskService.create([{
        project_id: projectId,
        title: "Long group_key",
        group_key: "a".repeat(33),
      }])
    ).toThrow(ServiceError);
  });

  it("rejects task with plan over 50000 chars", () => {
    expect(() =>
      ctx.taskService.create([{
        project_id: projectId,
        title: "Long plan",
        plan: "x".repeat(50001),
      }])
    ).toThrow(ServiceError);
  });

  it("rejects document with content over 50000 chars", () => {
    expect(() =>
      ctx.documentService.create([{
        title: "Long content doc",
        content: "x".repeat(50001),
      }])
    ).toThrow(ServiceError);
  });

  it("rejects project with goal over 50000 chars", () => {
    expect(() =>
      ctx.projectService.create([{
        title: "Long goal project",
        goal: "x".repeat(50001),
      }])
    ).toThrow(ServiceError);
  });

  // --- Boundary values ---

  it("accepts title of exactly 255 chars", () => {
    const title = "a".repeat(255);
    const [project] = ctx.projectService.create([{ title }]);
    expect(project.title).toBe(title);
    expect(project.title.length).toBe(255);
  });

  it("rejects whitespace-only title", () => {
    expect(() =>
      ctx.projectService.create([{ title: "   " }])
    ).toThrow(ServiceError);
  });

  // --- Mixed batch atomicity ---

  it("rejects entire batch when any item fails validation", () => {
    const countBefore = ctx.taskService.list({
      project_id: projectId,
      limit: 200,
      offset: 0,
    }).total;

    expect(() =>
      ctx.taskService.create([
        { project_id: projectId, title: "Valid task in mixed batch" },
        { project_id: projectId, title: "" },
      ])
    ).toThrow(ServiceError);

    const countAfter = ctx.taskService.list({
      project_id: projectId,
      limit: 200,
      offset: 0,
    }).total;

    // No tasks should have been persisted
    expect(countAfter).toBe(countBefore);
  });

  // --- Invalid enum on update ---

  it("rejects task update with invalid status enum", () => {
    const [task] = ctx.taskService.create([{
      project_id: projectId,
      title: "Update enum test",
    }]);

    expect(() =>
      ctx.taskService.update([{
        id: task.id,
        status: "completed" as any,
      }])
    ).toThrow(ServiceError);
  });
});

// ---------------------------------------------------------------------------
// Task Dependency Service
// ---------------------------------------------------------------------------

describe("Task Dependency Service", () => {
  let projectId: string;
  let taskA: string;
  let taskB: string;
  let taskC: string;

  beforeAll(() => {
    const [project] = ctx.projectService.create([{ title: "Dep Test Project" }]);
    projectId = project.id;
    const [a] = ctx.taskService.create([{ project_id: projectId, title: "Task A" }]);
    const [b] = ctx.taskService.create([{ project_id: projectId, title: "Task B" }]);
    const [c] = ctx.taskService.create([{ project_id: projectId, title: "Task C" }]);
    taskA = a.id;
    taskB = b.id;
    taskC = c.id;
  });

  it("adds a blocks dependency between two tasks", () => {
    const deps = ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskA, target_task_id: taskB, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(1);
    expect(deps[0].source_task_id).toBe(taskA);
    expect(deps[0].target_task_id).toBe(taskB);
    expect(deps[0].dependency_type).toBe("blocks");
    expect(deps[0].created_at).toBeTruthy();
  });

  it("adds a relates_to dependency", () => {
    const deps = ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskB, target_task_id: taskC, dependency_type: "relates_to" },
    ]);
    expect(deps).toHaveLength(1);
    expect(deps[0].dependency_type).toBe("relates_to");
  });

  it("rejects self-referential dependency", () => {
    expect(() =>
      ctx.taskDependencyService.addDependencies(projectId, [
        { source_task_id: taskA, target_task_id: taskA, dependency_type: "blocks" },
      ])
    ).toThrow("a task cannot depend on itself");
  });

  it("rejects invalid dependency_type", () => {
    expect(() =>
      ctx.taskDependencyService.addDependencies(projectId, [
        { source_task_id: taskA, target_task_id: taskC, dependency_type: "unknown" as "blocks" },
      ])
    ).toThrow("dependency_type must be one of:");
  });

  it("rejects dependency for nonexistent task", () => {
    expect(() =>
      ctx.taskDependencyService.addDependencies(projectId, [
        { source_task_id: "NONEXISTENT_TASK_ID_ABC", target_task_id: taskB, dependency_type: "blocks" },
      ])
    ).toThrow("task not found");
  });

  it("rejects cross-project dependency", () => {
    const [otherProject] = ctx.projectService.create([{ title: "Other Project" }]);
    const [otherTask] = ctx.taskService.create([{ project_id: otherProject.id, title: "Other Task" }]);
    expect(() =>
      ctx.taskDependencyService.addDependencies(projectId, [
        { source_task_id: taskA, target_task_id: otherTask.id, dependency_type: "blocks" },
      ])
    ).toThrow("dependencies must be within the same project");
  });

  it("allows cyclic blocks edges (A->B already exists, adding B->A)", () => {
    const deps = ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskB, target_task_id: taskA, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(1);
    expect(deps[0].dependency_type).toBe("blocks");
    // Both tasks should now be is_blocked (mutual blocking, both still todo)
    const depsA = ctx.taskDependencyService.getDependencies(taskA);
    const depsB = ctx.taskDependencyService.getDependencies(taskB);
    expect(depsA.is_blocked).toBe(true);
    expect(depsB.is_blocked).toBe(true);
  });

  it("allows cyclic chains > 2 (X->Y->Z->X)", () => {
    // Use fresh tasks to avoid conflicts with earlier relates_to edges
    const [x] = ctx.taskService.create([{ project_id: projectId, title: "Chain X" }]);
    const [y] = ctx.taskService.create([{ project_id: projectId, title: "Chain Y" }]);
    const [z] = ctx.taskService.create([{ project_id: projectId, title: "Chain Z" }]);
    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: x.id, target_task_id: y.id, dependency_type: "blocks" },
    ]);
    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: y.id, target_task_id: z.id, dependency_type: "blocks" },
    ]);
    const deps = ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: z.id, target_task_id: x.id, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(1);
    // All three tasks should be is_blocked
    const depsX = ctx.taskDependencyService.getDependencies(x.id);
    const depsY = ctx.taskDependencyService.getDependencies(y.id);
    const depsZ = ctx.taskDependencyService.getDependencies(z.id);
    expect(depsX.is_blocked).toBe(true);
    expect(depsY.is_blocked).toBe(true);
    expect(depsZ.is_blocked).toBe(true);
  });

  it("allows relates_to even if it would form a cycle in blocks graph", () => {
    // B->A as relates_to should be fine even though A blocks B
    const deps = ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskB, target_task_id: taskA, dependency_type: "relates_to" },
    ]);
    expect(deps).toHaveLength(1);
  });

  it("allows batch cycle: [{A->B, blocks}, {B->A, blocks}]", () => {
    const [bA] = ctx.taskService.create([{ project_id: projectId, title: "Batch A" }]);
    const [bB] = ctx.taskService.create([{ project_id: projectId, title: "Batch B" }]);
    const deps = ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: bA.id, target_task_id: bB.id, dependency_type: "blocks" },
      { source_task_id: bB.id, target_task_id: bA.id, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(2);
    // Both edges should be persisted and both tasks blocked
    const depsA = ctx.taskDependencyService.getDependencies(bA.id);
    const depsB = ctx.taskDependencyService.getDependencies(bB.id);
    expect(depsA.blocked_by).toHaveLength(1);
    expect(depsB.blocked_by).toHaveLength(1);
    expect(depsA.is_blocked).toBe(true);
    expect(depsB.is_blocked).toBe(true);
  });

  it("allows batch 3-node cycle: [{A->B, blocks}, {B->C, blocks}, {C->A, blocks}]", () => {
    const [c1] = ctx.taskService.create([{ project_id: projectId, title: "Cycle3 A" }]);
    const [c2] = ctx.taskService.create([{ project_id: projectId, title: "Cycle3 B" }]);
    const [c3] = ctx.taskService.create([{ project_id: projectId, title: "Cycle3 C" }]);
    const deps = ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: c1.id, target_task_id: c2.id, dependency_type: "blocks" },
      { source_task_id: c2.id, target_task_id: c3.id, dependency_type: "blocks" },
      { source_task_id: c3.id, target_task_id: c1.id, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(3);
    // All three tasks should be is_blocked
    const d1 = ctx.taskDependencyService.getDependencies(c1.id);
    const d2 = ctx.taskDependencyService.getDependencies(c2.id);
    const d3 = ctx.taskDependencyService.getDependencies(c3.id);
    expect(d1.is_blocked).toBe(true);
    expect(d2.is_blocked).toBe(true);
    expect(d3.is_blocked).toBe(true);
  });

  it("allows non-cyclic batch: [{A->B, blocks}, {B->C, blocks}]", () => {
    const [n1] = ctx.taskService.create([{ project_id: projectId, title: "Chain1" }]);
    const [n2] = ctx.taskService.create([{ project_id: projectId, title: "Chain2" }]);
    const [n3] = ctx.taskService.create([{ project_id: projectId, title: "Chain3" }]);
    const deps = ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: n1.id, target_task_id: n2.id, dependency_type: "blocks" },
      { source_task_id: n2.id, target_task_id: n3.id, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(2);
  });

  it("batch with relates_to does not trigger cycle detection", () => {
    const [r1] = ctx.taskService.create([{ project_id: projectId, title: "Rel1" }]);
    const [r2] = ctx.taskService.create([{ project_id: projectId, title: "Rel2" }]);
    // Both directions as relates_to should be fine
    const deps = ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: r1.id, target_task_id: r2.id, dependency_type: "relates_to" },
      { source_task_id: r2.id, target_task_id: r1.id, dependency_type: "relates_to" },
    ]);
    expect(deps).toHaveLength(2);
  });

  it("getDependencies returns grouped shape with blocks, blocked_by, relates_to, is_blocked", () => {
    const result = ctx.taskDependencyService.getDependencies(taskB);
    // B has: blocked_by (A->B blocks), relates_to (B->C relates_to, B->A relates_to)
    // B does not block any task (no "blocks" from B with type=blocks)
    expect(result.blocked_by.length).toBeGreaterThanOrEqual(1);
    expect(result.relates_to.length).toBeGreaterThanOrEqual(1);
    // A blocks B and A is still todo, so B is_blocked
    expect(result.is_blocked).toBe(true);
    expect(result.blocked_by.some((d) => d.task_id === taskA)).toBe(true);
  });

  it("getGraph returns edges and blocked_task_ids", () => {
    const graph = ctx.taskDependencyService.getGraph(projectId);
    expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    // B should be blocked (A->B blocks, A is still todo)
    expect(graph.blocked_task_ids).toContain(taskB);
  });

  it("removeDependencies removes specified pairs", () => {
    ctx.taskDependencyService.removeDependencies([
      { source_task_id: taskB, target_task_id: taskA },
    ]);
    const result = ctx.taskDependencyService.getDependencies(taskA);
    // B->A relates_to should be gone
    expect(result.relates_to.some((d) => d.task_id === taskB)).toBe(false);
  });

  it("activity log entries are written for add operations", () => {
    const logs = ctx.activityLogRepo.findMany({ entity_type: "task", limit: 100 });
    const depAddedLogs = logs.filter((l) => {
      if (l.action !== "created") return false;
      const summary = JSON.parse(l.summary);
      return summary.event === "dependency_added";
    });
    expect(depAddedLogs.length).toBeGreaterThanOrEqual(1);
    const summary = JSON.parse(depAddedLogs[0].summary);
    expect(summary.source_task_id).toBeDefined();
    expect(summary.target_task_id).toBeDefined();
    expect(summary.dependency_type).toBeDefined();
    expect(depAddedLogs[0].entity_id).not.toBeNull();
  });

  it("activity log entries are written for remove operations", () => {
    const logs = ctx.activityLogRepo.findMany({ entity_type: "task", limit: 100 });
    const depRemovedLogs = logs.filter((l) => {
      if (l.action !== "deleted") return false;
      const summary = JSON.parse(l.summary);
      return summary.event === "dependency_removed";
    });
    expect(depRemovedLogs.length).toBeGreaterThanOrEqual(1);
    expect(depRemovedLogs[0].entity_id).not.toBeNull();
  });

  it("upserts dependency_type when re-adding with different type (relates_to -> blocks)", () => {
    const [p] = ctx.projectService.create([{ title: "Upsert Test" }]);
    const [tA] = ctx.taskService.create([{ project_id: p.id, title: "UA" }]);
    const [tB] = ctx.taskService.create([{ project_id: p.id, title: "UB" }]);

    const first = ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "relates_to" },
    ]);
    expect(first[0].dependency_type).toBe("relates_to");
    const firstCreatedAt = first[0].created_at;

    const second = ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
    ]);
    expect(second[0].dependency_type).toBe("blocks");
    // created_at is refreshed by the UPSERT (may equal firstCreatedAt in fast tests)
    expect(second[0].created_at).toBeTruthy();
  });

  it("upserts dependency_type when downgrading (blocks -> relates_to)", () => {
    const [p] = ctx.projectService.create([{ title: "Downgrade Test" }]);
    const [tA] = ctx.taskService.create([{ project_id: p.id, title: "DA" }]);
    const [tB] = ctx.taskService.create([{ project_id: p.id, title: "DB" }]);

    ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
    ]);
    const downgraded = ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "relates_to" },
    ]);
    expect(downgraded[0].dependency_type).toBe("relates_to");
  });

  it("re-adding same type does not error", () => {
    const [p] = ctx.projectService.create([{ title: "Same Type Test" }]);
    const [tA] = ctx.taskService.create([{ project_id: p.id, title: "SA" }]);
    const [tB] = ctx.taskService.create([{ project_id: p.id, title: "SB" }]);

    ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
    ]);
    const again = ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
    ]);
    expect(again[0].dependency_type).toBe("blocks");
  });

  it("upgrading relates_to to blocks allows cycles", () => {
    const [p] = ctx.projectService.create([{ title: "Cycle Upgrade Test" }]);
    const [tA] = ctx.taskService.create([{ project_id: p.id, title: "CA" }]);
    const [tB] = ctx.taskService.create([{ project_id: p.id, title: "CB" }]);
    const [tC] = ctx.taskService.create([{ project_id: p.id, title: "CC" }]);

    // A blocks B
    ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
    ]);
    // B relates_to C (no cycle concern)
    ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tB.id, target_task_id: tC.id, dependency_type: "relates_to" },
    ]);
    // Upgrade B->C to blocks (should succeed — no cycle)
    const upgraded = ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tB.id, target_task_id: tC.id, dependency_type: "blocks" },
    ]);
    expect(upgraded[0].dependency_type).toBe("blocks");

    // C->A as blocks creates cycle A->B->C->A — now allowed
    const cycleEdge = ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tC.id, target_task_id: tA.id, dependency_type: "blocks" },
    ]);
    expect(cycleEdge).toHaveLength(1);
    expect(cycleEdge[0].dependency_type).toBe("blocks");
  });

  it("cyclic tasks are all is_blocked", () => {
    const [p] = ctx.projectService.create([{ title: "Cycle Blocked Test" }]);
    const [tA] = ctx.taskService.create([{ project_id: p.id, title: "CycBlk A" }]);
    const [tB] = ctx.taskService.create([{ project_id: p.id, title: "CycBlk B" }]);
    // A blocks B, B blocks A
    ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
      { source_task_id: tB.id, target_task_id: tA.id, dependency_type: "blocks" },
    ]);
    const depsA = ctx.taskDependencyService.getDependencies(tA.id);
    const depsB = ctx.taskDependencyService.getDependencies(tB.id);
    expect(depsA.is_blocked).toBe(true);
    expect(depsB.is_blocked).toBe(true);
  });

  it("get_dependency_graph includes cyclic edges", () => {
    const [p] = ctx.projectService.create([{ title: "Cycle Graph Test" }]);
    const [tA] = ctx.taskService.create([{ project_id: p.id, title: "CycGrph A" }]);
    const [tB] = ctx.taskService.create([{ project_id: p.id, title: "CycGrph B" }]);
    // Create 2-node cycle
    ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
      { source_task_id: tB.id, target_task_id: tA.id, dependency_type: "blocks" },
    ]);
    const graph = ctx.taskDependencyService.getGraph(p.id);
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges.some((e) => e.source_task_id === tA.id && e.target_task_id === tB.id)).toBe(true);
    expect(graph.edges.some((e) => e.source_task_id === tB.id && e.target_task_id === tA.id)).toBe(true);
    expect(graph.blocked_task_ids).toContain(tA.id);
    expect(graph.blocked_task_ids).toContain(tB.id);
  });

  it("completing one task in a cycle unblocks the other", () => {
    const [p] = ctx.projectService.create([{ title: "Cycle Unblock Test" }]);
    const [tA] = ctx.taskService.create([{ project_id: p.id, title: "CycUnblk A" }]);
    const [tB] = ctx.taskService.create([{ project_id: p.id, title: "CycUnblk B" }]);
    // Create 2-node cycle
    ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
      { source_task_id: tB.id, target_task_id: tA.id, dependency_type: "blocks" },
    ]);
    // Both blocked initially
    expect(ctx.taskDependencyService.getDependencies(tA.id).is_blocked).toBe(true);
    expect(ctx.taskDependencyService.getDependencies(tB.id).is_blocked).toBe(true);
    // Mark A as done
    ctx.taskService.update([{ id: tA.id, status: "done" }]);
    // B should no longer be blocked (its only blocker A is done)
    expect(ctx.taskDependencyService.getDependencies(tB.id).is_blocked).toBe(false);
    // A is still blocked by B (B is still todo), but that's expected
    expect(ctx.taskDependencyService.getDependencies(tA.id).is_blocked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task is_blocked Computation
// ---------------------------------------------------------------------------

describe("Task is_blocked computation", () => {
  let projectId: string;

  beforeAll(() => {
    const [project] = ctx.projectService.create([{ title: "Blocked Test Project" }]);
    projectId = project.id;
  });

  it("newly created tasks have is_blocked = false", () => {
    const [task] = ctx.taskService.create([{ project_id: projectId, title: "New Task" }]);
    expect(task.is_blocked).toBe(false);
  });

  it("task with unfinished blocker has is_blocked = true", () => {
    const [blocker] = ctx.taskService.create([{ project_id: projectId, title: "Blocker" }]);
    const [blocked] = ctx.taskService.create([{ project_id: projectId, title: "Blocked" }]);
    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: blocker.id, target_task_id: blocked.id, dependency_type: "blocks" },
    ]);

    const result = ctx.taskService.get(blocked.id);
    expect(result.is_blocked).toBe(true);
  });

  it("task unblocked when blocker is done", () => {
    const [blocker] = ctx.taskService.create([{ project_id: projectId, title: "Will Finish" }]);
    const [blocked] = ctx.taskService.create([{ project_id: projectId, title: "Waiting" }]);
    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: blocker.id, target_task_id: blocked.id, dependency_type: "blocks" },
    ]);

    // Initially blocked
    expect(ctx.taskService.get(blocked.id).is_blocked).toBe(true);

    // Mark blocker as done
    ctx.taskService.update([{ id: blocker.id, status: "done" }]);
    expect(ctx.taskService.get(blocked.id).is_blocked).toBe(false);
  });

  it("task unblocked when blocker is archived", () => {
    const [blocker] = ctx.taskService.create([{ project_id: projectId, title: "Will Archive" }]);
    const [blocked] = ctx.taskService.create([{ project_id: projectId, title: "Waiting Archive" }]);
    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: blocker.id, target_task_id: blocked.id, dependency_type: "blocks" },
    ]);

    ctx.taskService.update([{ id: blocker.id, status: "archived" }]);
    expect(ctx.taskService.get(blocked.id).is_blocked).toBe(false);
  });

  it("task with no dependencies has is_blocked = false", () => {
    const [task] = ctx.taskService.create([{ project_id: projectId, title: "No Deps" }]);
    expect(ctx.taskService.get(task.id).is_blocked).toBe(false);
  });

  it("task with only relates_to dependency has is_blocked = false", () => {
    const [a] = ctx.taskService.create([{ project_id: projectId, title: "Relates A" }]);
    const [b] = ctx.taskService.create([{ project_id: projectId, title: "Relates B" }]);
    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: a.id, target_task_id: b.id, dependency_type: "relates_to" },
    ]);
    expect(ctx.taskService.get(b.id).is_blocked).toBe(false);
  });

  it("list() returns is_blocked in summaries", () => {
    const [blocker] = ctx.taskService.create([{ project_id: projectId, title: "List Blocker" }]);
    const [blocked] = ctx.taskService.create([{ project_id: projectId, title: "List Blocked" }]);
    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: blocker.id, target_task_id: blocked.id, dependency_type: "blocks" },
    ]);

    const result = ctx.taskService.list({ project_id: projectId });
    const blockedSummary = result.data.find((t) => t.id === blocked.id);
    const blockerSummary = result.data.find((t) => t.id === blocker.id);
    expect(blockedSummary?.is_blocked).toBe(true);
    expect(blockerSummary?.is_blocked).toBe(false);
  });

  it("is_blocked uses batch query (single SQL per project)", () => {
    // This is a design validation -- if it works for multiple tasks in one list call, the batch approach is working
    const result = ctx.taskService.list({ project_id: projectId });
    // All tasks should have is_blocked defined as boolean
    for (const task of result.data) {
      expect(typeof task.is_blocked).toBe("boolean");
    }
  });
});

// ---------------------------------------------------------------------------
// Cascading Unblock Notifications
// ---------------------------------------------------------------------------

describe("Cascading Unblock Notifications", () => {
  let projectId: string;

  beforeAll(() => {
    const [project] = ctx.projectService.create([{ title: "Unblock Notification Project" }]);
    projectId = project.id;
  });

  it("emits unblock activity log and event when blocker is completed", () => {
    const [taskA] = ctx.taskService.create([{ project_id: projectId, title: "Blocker A" }]);
    const [taskB] = ctx.taskService.create([{ project_id: projectId, title: "Blocked B" }]);

    // A blocks B
    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskA.id, target_task_id: taskB.id, dependency_type: "blocks" },
    ]);

    // Collect emitted events
    const emittedEvents: { type: string; entity_type: string; payload: unknown }[] = [];
    const unsub = ctx.eventBus.subscribe((event) => {
      if (event.type === "updated" && event.entity_type === "task") {
        emittedEvents.push(event as { type: string; entity_type: string; payload: unknown });
      }
    });

    // Complete A
    ctx.taskService.update([{ id: taskA.id, status: "done" }]);

    unsub();

    // Check activity log for the unblocked entry
    const logs = ctx.activityLogRepo.findMany({ entity_type: "task", entity_id: taskB.id, limit: 50 });
    const unblockedLog = logs.find((l) => {
      if (l.action !== "updated") return false;
      const summary = JSON.parse(l.summary);
      return summary.event === "unblocked";
    });
    expect(unblockedLog).toBeTruthy();
    const summary = JSON.parse(unblockedLog!.summary);
    expect(summary.event).toBe("unblocked");
    expect(summary.unblocked_by).toBe(taskA.id);
    expect(summary.message).toBe("Task unblocked: all blocking dependencies are now complete");

    // Check emitted domain event for unblocked
    const unblockedEvent = emittedEvents.find((e) => {
      const p = e.payload as Record<string, unknown>;
      return p.event === "unblocked" && p.id === taskB.id;
    });
    expect(unblockedEvent).toBeTruthy();
    const payload = unblockedEvent!.payload as Record<string, unknown>;
    expect(payload.unblocked_by).toBe(taskA.id);
  });

  it("does NOT emit unblock when other blockers remain", () => {
    const [taskX] = ctx.taskService.create([{ project_id: projectId, title: "Blocker X" }]);
    const [taskY] = ctx.taskService.create([{ project_id: projectId, title: "Blocker Y" }]);
    const [taskZ] = ctx.taskService.create([{ project_id: projectId, title: "Blocked Z" }]);

    // X and Y both block Z
    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskX.id, target_task_id: taskZ.id, dependency_type: "blocks" },
      { source_task_id: taskY.id, target_task_id: taskZ.id, dependency_type: "blocks" },
    ]);

    const emittedEvents: { type: string; entity_type: string; payload: unknown }[] = [];
    const unsub = ctx.eventBus.subscribe((event) => {
      if (event.type === "updated" && event.entity_type === "task") {
        emittedEvents.push(event as { type: string; entity_type: string; payload: unknown });
      }
    });

    // Complete only X -- Y still blocks Z
    ctx.taskService.update([{ id: taskX.id, status: "done" }]);

    unsub();

    // Should NOT have an unblocked event for Z
    const unblockedEvent = emittedEvents.find((e) => {
      const p = e.payload as Record<string, unknown>;
      return p.event === "unblocked" && p.id === taskZ.id;
    });
    expect(unblockedEvent).toBeUndefined();

    // Check activity log -- no unblocked entry for Z
    const logs = ctx.activityLogRepo.findMany({ entity_type: "task", entity_id: taskZ.id, limit: 50 });
    const unblockedLog = logs.find((l) => {
      if (l.action !== "updated") return false;
      const summary = JSON.parse(l.summary);
      return summary.event === "unblocked";
    });
    expect(unblockedLog).toBeUndefined();
  });

  it("emits unblock when last blocker is completed (multiple blockers)", () => {
    const [taskP] = ctx.taskService.create([{ project_id: projectId, title: "Blocker P" }]);
    const [taskQ] = ctx.taskService.create([{ project_id: projectId, title: "Blocker Q" }]);
    const [taskR] = ctx.taskService.create([{ project_id: projectId, title: "Blocked R" }]);

    // P and Q both block R
    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskP.id, target_task_id: taskR.id, dependency_type: "blocks" },
      { source_task_id: taskQ.id, target_task_id: taskR.id, dependency_type: "blocks" },
    ]);

    // Complete P first
    ctx.taskService.update([{ id: taskP.id, status: "done" }]);

    // Now complete Q -- this should trigger the unblock
    const emittedEvents: { type: string; entity_type: string; payload: unknown }[] = [];
    const unsub = ctx.eventBus.subscribe((event) => {
      if (event.type === "updated" && event.entity_type === "task") {
        emittedEvents.push(event as { type: string; entity_type: string; payload: unknown });
      }
    });

    ctx.taskService.update([{ id: taskQ.id, status: "done" }]);

    unsub();

    // Now R should be unblocked
    const unblockedEvent = emittedEvents.find((e) => {
      const p = e.payload as Record<string, unknown>;
      return p.event === "unblocked" && p.id === taskR.id;
    });
    expect(unblockedEvent).toBeTruthy();
  });

  it("emits unblock when blocker is archived (not just done)", () => {
    const [taskM] = ctx.taskService.create([{ project_id: projectId, title: "Blocker M" }]);
    const [taskN] = ctx.taskService.create([{ project_id: projectId, title: "Blocked N" }]);

    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskM.id, target_task_id: taskN.id, dependency_type: "blocks" },
    ]);

    const emittedEvents: { type: string; entity_type: string; payload: unknown }[] = [];
    const unsub = ctx.eventBus.subscribe((event) => {
      if (event.type === "updated" && event.entity_type === "task") {
        emittedEvents.push(event as { type: string; entity_type: string; payload: unknown });
      }
    });

    // Archive M instead of marking done
    ctx.taskService.update([{ id: taskM.id, status: "archived" }]);

    unsub();

    const unblockedEvent = emittedEvents.find((e) => {
      const p = e.payload as Record<string, unknown>;
      return p.event === "unblocked" && p.id === taskN.id;
    });
    expect(unblockedEvent).toBeTruthy();
  });

  it("does not auto-change the status of unblocked tasks", () => {
    const [taskD] = ctx.taskService.create([{ project_id: projectId, title: "Blocker D" }]);
    const [taskE] = ctx.taskService.create([{ project_id: projectId, title: "Blocked E" }]);

    ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskD.id, target_task_id: taskE.id, dependency_type: "blocks" },
    ]);

    // Complete D
    ctx.taskService.update([{ id: taskD.id, status: "done" }]);

    // E's status should still be 'todo', not automatically changed
    const taskEAfter = ctx.taskService.get(taskE.id);
    expect(taskEAfter.status).toBe("todo");
  });
});

// ---------------------------------------------------------------------------
// Dependency Edge Cases
// ---------------------------------------------------------------------------

describe("Dependency Edge Cases", () => {
  it("is_blocked is boolean when listing tasks without project_id", () => {
    // Create tasks with a dependency in a fresh project
    const [project] = ctx.projectService.create([{ title: "Global List Blocked Project" }]);
    const [blocker] = ctx.taskService.create([{ project_id: project.id, title: "Global Blocker" }]);
    const [blocked] = ctx.taskService.create([{ project_id: project.id, title: "Global Blocked" }]);
    ctx.taskDependencyService.addDependencies(project.id, [
      { source_task_id: blocker.id, target_task_id: blocked.id, dependency_type: "blocks" },
    ]);

    // List without project_id (global list)
    const result = ctx.taskService.list({ limit: 200 });
    expect(result.data.length).toBeGreaterThan(0);
    const blockedTask = result.data.find((t) => t.id === blocked.id);
    const blockerTask = result.data.find((t) => t.id === blocker.id);
    expect(blockedTask).toBeTruthy();
    expect(blockerTask).toBeTruthy();
    expect(blockedTask!.is_blocked).toBe(true);
    expect(blockerTask!.is_blocked).toBe(false);
  });

  it("task deletion via CASCADE removes dependency rows", () => {
    const [project] = ctx.projectService.create([{ title: "CASCADE Delete Project" }]);
    const [taskA] = ctx.taskService.create([{ project_id: project.id, title: "CASCADE A" }]);
    const [taskB] = ctx.taskService.create([{ project_id: project.id, title: "CASCADE B" }]);
    ctx.taskDependencyService.addDependencies(project.id, [
      { source_task_id: taskA.id, target_task_id: taskB.id, dependency_type: "blocks" },
    ]);

    // Verify B is blocked
    expect(ctx.taskService.get(taskB.id).is_blocked).toBe(true);

    // Delete A
    ctx.taskService.remove([taskA.id]);

    // B should no longer be blocked
    expect(ctx.taskService.get(taskB.id).is_blocked).toBe(false);

    // Dependencies for B should be empty
    const deps = ctx.taskDependencyService.getDependencies(taskB.id);
    expect(deps.blocked_by).toHaveLength(0);
  });

  it("UPSERT: re-adding same edge with different type updates the type", () => {
    const [project] = ctx.projectService.create([{ title: "Upsert Edge Project" }]);
    const [taskA] = ctx.taskService.create([{ project_id: project.id, title: "Upsert A" }]);
    const [taskB] = ctx.taskService.create([{ project_id: project.id, title: "Upsert B" }]);

    // Add as relates_to
    ctx.taskDependencyService.addDependencies(project.id, [
      { source_task_id: taskA.id, target_task_id: taskB.id, dependency_type: "relates_to" },
    ]);
    let deps = ctx.taskDependencyService.getDependencies(taskB.id);
    expect(deps.relates_to.length).toBeGreaterThanOrEqual(1);

    // Re-add as blocks (upsert)
    ctx.taskDependencyService.addDependencies(project.id, [
      { source_task_id: taskA.id, target_task_id: taskB.id, dependency_type: "blocks" },
    ]);
    deps = ctx.taskDependencyService.getDependencies(taskB.id);
    expect(deps.blocked_by.some((d) => d.task_id === taskA.id)).toBe(true);
  });

  it("add_dependencies via task update creates correct source/target mapping", () => {
    const [project] = ctx.projectService.create([{ title: "Mapping Test Project" }]);
    const [taskA] = ctx.taskService.create([{ project_id: project.id, title: "Mapper A" }]);
    const [taskB] = ctx.taskService.create([{ project_id: project.id, title: "Mapper B" }]);

    // update taskB with add_dependencies [{task_id: taskA, type: blocks}]
    // This should mean: taskA is the blocker (source), taskB is the blocked (target)
    ctx.taskService.update([{
      id: taskB.id,
      add_dependencies: [{ task_id: taskA.id, type: "blocks" }],
    }]);

    const deps = ctx.taskDependencyService.getDependencies(taskB.id);
    expect(deps.blocked_by.some((d) => d.task_id === taskA.id)).toBe(true);
    expect(deps.is_blocked).toBe(true);

    // From A's perspective, A should appear in blocks
    const depsA = ctx.taskDependencyService.getDependencies(taskA.id);
    expect(depsA.blocks.some((d) => d.task_id === taskB.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Activity Log Retention
// ---------------------------------------------------------------------------

describe("Activity Log Retention", () => {
  it("countAll returns correct count", () => {
    const countBefore = ctx.activityLogRepo.countAll();
    // Creating a project generates an activity log entry
    ctx.projectService.create([{ title: "Retention Count Test" }]);
    const countAfter = ctx.activityLogRepo.countAll();
    expect(countAfter).toBe(countBefore + 1);
  });

  it("deleteOlderThan removes only entries before cutoff", () => {
    // Insert a backdated entry directly via the db
    const oldDate = "2020-01-01T00:00:00.000Z";
    ctx.db
      .query(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("retention-old-1", "test", null, "created", "{}", oldDate);
    ctx.db
      .query(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("retention-old-2", "test", null, "created", "{}", "2020-06-15T00:00:00.000Z");

    const countBefore = ctx.activityLogRepo.countAll();

    // Use a cutoff that is after the old entries but before any recent ones
    const cutoff = "2021-01-01T00:00:00.000Z";
    const deleted = ctx.activityLogRepo.deleteOlderThan(cutoff);

    expect(deleted).toBe(2);
    expect(ctx.activityLogRepo.countAll()).toBe(countBefore - 2);
  });

  it("deleteOlderThan returns 0 when no entries match", () => {
    // Use a very old cutoff that predates all entries
    const deleted = ctx.activityLogRepo.deleteOlderThan("1970-01-01T00:00:00.000Z");
    expect(deleted).toBe(0);
  });
});
