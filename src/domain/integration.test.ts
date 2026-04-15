import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";
import { ActivityLogRepository } from "./repositories/sqlite";
import type { TagName } from "./entities";

let ctx: AppContext;
let tempDir: string;
let activityLogRepo: ActivityLogRepository;

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "integration-test-"));
  const dbPath = join(tempDir, "test.db");
  ctx = await bootstrap(dbPath);
  activityLogRepo = new ActivityLogRepository(ctx.db!);
});

afterAll(() => {
  ctx.db!.close();
  rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Project CRUD
// ---------------------------------------------------------------------------

describe("Project CRUD", () => {
  it("creates a project with title", async () => {
    const [project] = await ctx.projectService.create([{ title: "My Project" }]);

    expect(project.id).toBeTruthy();
    expect(project.id.length).toBeGreaterThan(10); // ULID
    expect(project.title).toBe("My Project");
    expect(project.summary).toBeNull();
    expect(project.created_at).toBeTruthy();
    expect(project.updated_at).toBeTruthy();
    expect(() => new Date(project.created_at)).not.toThrow();
  });

  it("creates a project with optional fields", async () => {
    const [project] = await ctx.projectService.create([{
      title: "Full Project",
      summary: "Ship it fast",
    }]);

    expect(project.title).toBe("Full Project");
    expect(project.summary).toBe("Ship it fast");
  });

  it("updates project title and optional fields", async () => {
    const [project] = await ctx.projectService.create([{ title: "Original" }]);
    const [updated] = await ctx.projectService.update([{
      id: project.id,
      title: "Renamed",
      summary: "New summary",
    }]);

    expect(updated.title).toBe("Renamed");
    expect(updated.summary).toBe("New summary");
  });

  it("lists projects", async () => {
    const result = await ctx.projectService.list({ limit: 100, offset: 0 });
    expect(result.data).toBeArray();
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("rejects empty title", async () => {
    await expect(ctx.projectService.create([{ title: "" }])).rejects.toThrow(ServiceError);
  });

  it("rejects title over 255 chars", async () => {
    await expect(ctx.projectService.create([{ title: "x".repeat(256) }])).rejects.toThrow(ServiceError);
  });

  it("throws 404 when updating nonexistent project", async () => {
    await expect(ctx.projectService.update([{ id: "nonexistent", title: "X" }])).rejects.toThrow(ServiceError);
  });
});

// ---------------------------------------------------------------------------
// Task CRUD
// ---------------------------------------------------------------------------

describe("Task CRUD", () => {
  it("creates a task with title under a project", async () => {
    const [project] = await ctx.projectService.create([{ title: "Task Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Do the thing",
    }]);

    expect(task.id).toBeTruthy();
    expect(task.project_id).toBe(project.id);
    expect(task.title).toBe("Do the thing");
    expect(task.summary).toBeNull();
    expect(task.created_at).toBeTruthy();
    expect(task.updated_at).toBeTruthy();
  });

  it("creates a task with summary", async () => {
    const [project] = await ctx.projectService.create([{ title: "Summary Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Summarized task",
      summary: "Step 1, step 2",
    }]);

    expect(task.summary).toBe("Step 1, step 2");
  });

  it("updates task title and summary", async () => {
    const [project] = await ctx.projectService.create([{ title: "Update Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Original",
    }]);

    const [u1] = await ctx.taskService.update([{ id: task.id, title: "New title" }]);
    expect(u1.title).toBe("New title");

    const [u2] = await ctx.taskService.update([{ id: task.id, summary: "New summary" }]);
    expect(u2.summary).toBe("New summary");
  });

  it("lists tasks filtered by project_id", async () => {
    const [project] = await ctx.projectService.create([{ title: "Filter Project" }]);
    await ctx.taskService.create([
      { project_id: project.id, title: "Task 1" },
      { project_id: project.id, title: "Task 2" },
    ]);

    const result = await ctx.taskService.list({ project_id: project.id, limit: 100, offset: 0 });
    expect(result.data.length).toBe(2);
  });

  it("throws when creating task with nonexistent project_id", async () => {
    await expect(ctx.taskService.create([{
        project_id: "nonexistent-id",
        title: "Orphan task",
      }])).rejects.toThrow(ServiceError);
  });

  it("rejects empty title", async () => {
    const [project] = await ctx.projectService.create([{ title: "Empty Title" }]);
    await expect(ctx.taskService.create([{ project_id: project.id, title: "" }])).rejects.toThrow(ServiceError);
  });

  it("creates a task with summary field", async () => {
    const [project] = await ctx.projectService.create([{ title: "New Fields Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Full task",
      summary: "A summary",
    }]);

    expect(task.summary).toBe("A summary");
  });

  it("new task summary defaults to null", async () => {
    const [project] = await ctx.projectService.create([{ title: "Null Fields Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Bare task",
    }]);

    expect(task.summary).toBeNull();
  });

  it("updates summary", async () => {
    const [project] = await ctx.projectService.create([{ title: "Update Fields Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Update me",
    }]);

    const [updated] = await ctx.taskService.update([{
      id: task.id,
      summary: "Updated summary",
    }]);

    expect(updated.summary).toBe("Updated summary");
  });

  it("nulls out summary on update", async () => {
    const [project] = await ctx.projectService.create([{ title: "Null Update Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Null me",
      summary: "Has a summary",
    }]);

    expect(task.summary).toBe("Has a summary");

    const [updated] = await ctx.taskService.update([{
      id: task.id,
      summary: null,
    }]);

    expect(updated.summary).toBeNull();
  });

  it("creates a task with context and acceptance_criteria", async () => {
    const [project] = await ctx.projectService.create([{ title: "Context AC Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Full fields task",
      context: "Background information for this task",
      acceptance_criteria: "All tests pass and coverage is above 80%",
    }]);

    expect(task.context).toBe("Background information for this task");
    expect(task.acceptance_criteria).toBe("All tests pass and coverage is above 80%");
  });

  it("context and acceptance_criteria default to null", async () => {
    const [project] = await ctx.projectService.create([{ title: "Default Null CA Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Bare task for defaults",
    }]);

    expect(task.context).toBeNull();
    expect(task.acceptance_criteria).toBeNull();
  });

  it("updates context and acceptance_criteria", async () => {
    const [project] = await ctx.projectService.create([{ title: "Update CA Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Update context task",
    }]);

    const [updated] = await ctx.taskService.update([{
      id: task.id,
      context: "New context",
      acceptance_criteria: "New AC",
    }]);

    expect(updated.context).toBe("New context");
    expect(updated.acceptance_criteria).toBe("New AC");
  });

  it("clears context via null on update", async () => {
    const [project] = await ctx.projectService.create([{ title: "Null Context Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Clear context",
      context: "Will be cleared",
    }]);

    expect(task.context).toBe("Will be cleared");

    const [updated] = await ctx.taskService.update([{
      id: task.id,
      context: null,
    }]);

    expect(updated.context).toBeNull();
  });

  it("clears acceptance_criteria via null on update", async () => {
    const [project] = await ctx.projectService.create([{ title: "Null AC Project" }]);
    const [task] = await ctx.taskService.create([{
      project_id: project.id,
      title: "Clear AC",
      acceptance_criteria: "Will be cleared",
    }]);

    expect(task.acceptance_criteria).toBe("Will be cleared");

    const [updated] = await ctx.taskService.update([{
      id: task.id,
      acceptance_criteria: null,
    }]);

    expect(updated.acceptance_criteria).toBeNull();
  });

  it("list returns has_context and has_acceptance_criteria booleans", async () => {
    const [project] = await ctx.projectService.create([{ title: "List CA Project" }]);
    await ctx.taskService.create([{
      project_id: project.id,
      title: "With context and AC",
      context: "Some context",
      acceptance_criteria: "Some AC",
    }]);
    await ctx.taskService.create([{
      project_id: project.id,
      title: "Without context and AC",
    }]);

    const result = await ctx.taskService.list({ project_id: project.id, limit: 100, offset: 0 });
    const withFields = result.data.find(t => t.title === "With context and AC");
    const withoutFields = result.data.find(t => t.title === "Without context and AC");

    expect(withFields).toBeTruthy();
    expect(withFields!.has_context).toBe(true);
    expect(withFields!.has_acceptance_criteria).toBe(true);
    // Summary should not include the full text fields
    expect((withFields as unknown as Record<string, unknown>)["context"]).toBeUndefined();
    expect((withFields as unknown as Record<string, unknown>)["acceptance_criteria"]).toBeUndefined();

    expect(withoutFields).toBeTruthy();
    expect(withoutFields!.has_context).toBe(false);
    expect(withoutFields!.has_acceptance_criteria).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Document CRUD
// ---------------------------------------------------------------------------

describe("Document CRUD", () => {
  it("creates a document with title and content", async () => {
    const [doc] = await ctx.documentService.create([{
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

  it("creates a document with tags array", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "Tagged Doc",
      tags: ["security", "ui"],
    }]);

    expect(doc.tags).toBeArray();
    expect(doc.tags).toContain("security");
    expect(doc.tags).toContain("ui");
  });

  it("updates document title and content", async () => {
    const [doc] = await ctx.documentService.create([{ title: "Original Title", content: "Old" }]);
    const [updated] = await ctx.documentService.update([{
      id: doc.id,
      title: "New Title",
      content: "New content",
    }]);

    expect(updated.title).toBe("New Title");
    expect(updated.content).toBe("New content");
  });

  it("lists documents with pagination", async () => {
    // Create a few documents for listing
    await ctx.documentService.create([
      { title: "Paginated A" },
      { title: "Paginated B" },
      { title: "Paginated C" },
    ]);

    const page1 = await ctx.documentService.list({ limit: 2, offset: 0 });
    expect(page1.data).toBeArray();
    expect(page1.data.length).toBeLessThanOrEqual(2);
    expect(typeof page1.total).toBe("number");
    expect(page1.total).toBeGreaterThanOrEqual(3);
  });

  it("lists documents filtered by tag", async () => {
    await ctx.documentService.create([{ title: "Tagged for filter", tags: ["infra"] }]);
    await ctx.documentService.create([{ title: "Untagged for filter" }]);

    const result = await ctx.documentService.list({ tag: "infra" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    for (const doc of result.data) {
      expect(doc.tags).toContain("infra");
    }
  });

  it("lists documents filtered by title search", async () => {
    await ctx.documentService.create([{ title: "UniqueSearchableName123" }]);

    const result = await ctx.documentService.list({ title: "UniqueSearchableName123" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0].title).toBe("UniqueSearchableName123");
  });

  it("gets single document by id with full content", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "Full Doc",
      content: "Full content body",
      tags: ["guide"],
    }]);

    const fetched = await ctx.documentService.get(doc.id);
    expect(fetched.id).toBe(doc.id);
    expect(fetched.title).toBe("Full Doc");
    expect(fetched.content).toBe("Full content body");
    expect(fetched.tags).toContain("guide");
  });

  it("rejects empty title", async () => {
    await expect(ctx.documentService.create([{ title: "" }])).rejects.toThrow(ServiceError);
  });

  it("throws 404 when updating nonexistent document", async () => {
    await expect(ctx.documentService.update([{ id: "nonexistent", title: "X" }])).rejects.toThrow(ServiceError);
  });

  it("deletes a document and verifies it is gone", async () => {
    const [doc] = await ctx.documentService.create([{ title: "Delete Me" }]);
    await ctx.documentService.remove([doc.id]);

    await expect(ctx.documentService.get(doc.id)).rejects.toThrow(ServiceError);
  });

  it("emits activity log after create", async () => {
    const [doc] = await ctx.documentService.create([{ title: "Activity Log Doc" }]);

    const logs = await activityLogRepo.findMany({
      entity_type: "document",
      entity_id: doc.id,
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const createLog = logs.find((l) => l.action === "created");
    expect(createLog).toBeTruthy();
    expect(createLog!.entity_id).toBe(doc.id);
  });

  // Tag-specific tests

  it("normalizes tags to lowercase", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "Case Tag Doc",
      tags: ["UI", "Data"] as string[] as TagName[],
    }]);

    expect(doc.tags).toContain("ui");
    expect(doc.tags).toContain("data");
    expect(doc.tags).not.toContain("UI");
    expect(doc.tags).not.toContain("Data");
  });

  it("setTagsForEntity replaces all tags", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "Replace Tags Doc",
      tags: ["security", "performance"],
    }]);

    expect(doc.tags).toContain("security");
    expect(doc.tags).toContain("performance");

    const [updated] = await ctx.documentService.update([{
      id: doc.id,
      tags: ["testing"],
    }]);

    expect(updated.tags).toEqual(["testing"]);
  });

  it("getTagsForEntity returns current tags", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "Get Tags Doc",
      tags: ["architecture", "domain"],
    }]);

    const fetched = await ctx.documentService.get(doc.id);
    expect(fetched.tags).toContain("architecture");
    expect(fetched.tags).toContain("domain");
    expect(fetched.tags.length).toBe(2);
  });

  it("rejects invalid tag names on create", async () => {
    await expect(ctx.documentService.create([{ title: "Bad Tag Doc", tags: ["invalid-tag"] as any }])).rejects.toThrow(ServiceError);
  });

  it("rejects invalid tag names on update", async () => {
    const [doc] = await ctx.documentService.create([{ title: "Update Bad Tag Doc" }]);
    await expect(ctx.documentService.update([{ id: doc.id, tags: ["not-a-tag"] as any }])).rejects.toThrow(ServiceError);
  });

  it("batch creates multiple documents in one call", async () => {
    const docs = await ctx.documentService.create([
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

  it("creates document with content=undefined defaults to null", async () => {
    const [doc] = await ctx.documentService.create([{ title: "No Content Doc" }]);

    expect(doc.content).toBeNull();
  });

  it("update with tags=[] clears all tags", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "Clear Tags Doc",
      tags: ["security", "ui"],
    }]);

    expect(doc.tags.length).toBe(2);

    const [updated] = await ctx.documentService.update([{
      id: doc.id,
      tags: [],
    }]);

    expect(updated.tags).toEqual([]);

    const fetched = await ctx.documentService.get(doc.id);
    expect(fetched.tags).toEqual([]);
  });

  it("deletes multiple documents in one call", async () => {
    const docs = await ctx.documentService.create([
      { title: "Batch Del A" },
      { title: "Batch Del B" },
      { title: "Batch Del C" },
    ]);

    await ctx.documentService.remove(docs.map((d) => d.id));

    for (const doc of docs) {
      await expect(ctx.documentService.get(doc.id)).rejects.toThrow(ServiceError);
    }
  });

  it("delete document cleans up entity_tags rows", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "Tag Cleanup Doc",
      tags: ["architecture", "guide"],
    }]);

    const beforeGet = await ctx.documentService.get(doc.id);
    expect(beforeGet.tags.length).toBe(2);

    // Link to a project to verify cascade on that side too
    const [project] = await ctx.projectService.create([{ title: "Tag Cleanup Project" }]);
    await ctx.projectService.update([{ id: project.id, documents: { [doc.id]: [{ type: "reference" }] } }]);

    await ctx.documentService.remove([doc.id]);

    // Document is gone
    await expect(ctx.documentService.get(doc.id)).rejects.toThrow(ServiceError);

    // Project-document link is also gone
    const projectAfter = await ctx.projectService.get(project.id);
    expect(projectAfter.documents.some((d) => d.document_id === doc.id)).toBe(false);
  });

  it("lists documents filtered by entity_type and entity_id", async () => {
    const [project] = await ctx.projectService.create([{ title: "Doc Filter Project" }]);
    const [linkedDoc] = await ctx.documentService.create([{ title: "Linked Doc for Filter" }]);
    const [unlinkedDoc] = await ctx.documentService.create([{ title: "Unlinked Doc for Filter" }]);

    await ctx.projectService.update([{ id: project.id, documents: { [linkedDoc.id]: [{ type: "reference" }] } }]);

    const result = await ctx.documentService.list({ entity_type: "project", entity_id: project.id });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.some((d) => d.id === linkedDoc.id)).toBe(true);
    expect(result.data.some((d) => d.id === unlinkedDoc.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Batch Tag Fetching (N+1 fix)
// ---------------------------------------------------------------------------

describe("Batch Tag Fetching", () => {
  it("getTagsForEntities returns correct tags for multiple documents", async () => {
    const { TagRepository } = require("./repositories/sqlite/tags");
    const tagRepo = new TagRepository(ctx.db!);

    const [doc1] = await ctx.documentService.create([{ title: "Batch Tag Doc 1", tags: ["ui", "data"] }]);
    const [doc2] = await ctx.documentService.create([{ title: "Batch Tag Doc 2", tags: ["security"] }]);
    const [doc3] = await ctx.documentService.create([{ title: "Batch Tag Doc 3" }]);

    const tagMap = await tagRepo.getTagsForEntities("document", [doc1.id, doc2.id, doc3.id]);

    expect(tagMap.get(doc1.id)?.sort()).toEqual(["data", "ui"]);
    expect(tagMap.get(doc2.id)).toEqual(["security"]);
    expect(tagMap.get(doc3.id)).toBeUndefined(); // no tags = not in map
  });

  it("getTagsForEntities returns empty Map for empty input", async () => {
    const { TagRepository } = require("./repositories/sqlite/tags");
    const tagRepo = new TagRepository(ctx.db!);

    const tagMap = await tagRepo.getTagsForEntities("document", []);
    expect(tagMap.size).toBe(0);
  });

  it("DocumentService.list() returns correct tags on each document summary", async () => {
    const [d1] = await ctx.documentService.create([{ title: "List Tag A", tags: ["architecture"] }]);
    const [d2] = await ctx.documentService.create([{ title: "List Tag B", tags: ["conventions", "guide"] }]);

    const result = await ctx.documentService.list({ title: "List Tag" });
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
  it("creates document with summary", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "Doc With Summary",
      summary: "A short summary",
      content: "Full content here",
    }]);

    expect(doc.summary).toBe("A short summary");
    expect(doc.content).toBe("Full content here");
  });

  it("creates document without summary defaults to null", async () => {
    const [doc] = await ctx.documentService.create([{ title: "No Summary Doc" }]);

    expect(doc.summary).toBeNull();
  });

  it("updates summary", async () => {
    const [doc] = await ctx.documentService.create([{ title: "Update Summary Doc" }]);
    const [updated] = await ctx.documentService.update([{
      id: doc.id,
      summary: "New summary",
    }]);

    expect(updated.summary).toBe("New summary");
  });

  it("sets summary to null to clear it", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "Clear Summary Doc",
      summary: "Will be cleared",
    }]);
    expect(doc.summary).toBe("Will be cleared");

    const [updated] = await ctx.documentService.update([{
      id: doc.id,
      summary: null,
    }]);

    expect(updated.summary).toBeNull();
  });

  it("summary appears in list results", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "SummaryListTestUnique999",
      summary: "Listed summary",
    }]);

    const result = await ctx.documentService.list({ title: "SummaryListTestUnique999" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    const found = result.data.find((d) => d.id === doc.id);
    expect(found).toBeTruthy();
    expect(found!.summary).toBe("Listed summary");
  });

  it("summary appears in get results", async () => {
    const [doc] = await ctx.documentService.create([{
      title: "Summary Get Doc",
      summary: "Get summary",
    }]);

    const fetched = await ctx.documentService.get(doc.id);
    expect(fetched.summary).toBe("Get summary");
  });

  it("rejects summary over 500 characters on create", async () => {
    await expect(ctx.documentService.create([{ title: "Long Summary", summary: "x".repeat(501) }])).rejects.toThrow(ServiceError);
  });

  it("rejects summary over 500 characters on update", async () => {
    const [doc] = await ctx.documentService.create([{ title: "Update Long Summary" }]);
    await expect(ctx.documentService.update([{ id: doc.id, summary: "x".repeat(501) }])).rejects.toThrow(ServiceError);
  });
});

// ---------------------------------------------------------------------------
// Document Search (search parameter — title OR summary)
// ---------------------------------------------------------------------------

describe("Document Search", () => {
  it("search matches documents by title only (summary is null)", async () => {
    await ctx.documentService.create([{ title: "Zebra Unique Title" }]);
    const result = await ctx.documentService.list({ search: "Zebra Unique" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.some((d) => d.title === "Zebra Unique Title")).toBe(true);
  });

  it("search matches documents by summary only (title does not match)", async () => {
    await ctx.documentService.create([{ title: "Unrelated Name AAA", summary: "quantum flux capacitor" }]);
    const result = await ctx.documentService.list({ search: "quantum flux" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.some((d) => d.title === "Unrelated Name AAA")).toBe(true);
  });

  it("search matches documents where both title and summary match", async () => {
    await ctx.documentService.create([{ title: "Photon Doc BBB", summary: "photon energy levels" }]);
    const result = await ctx.documentService.list({ search: "photon" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.some((d) => d.title === "Photon Doc BBB")).toBe(true);
  });

  it("search returns empty when neither title nor summary matches", async () => {
    const result = await ctx.documentService.list({ search: "zzzyyyxxx_nomatch_999" });
    expect(result.data.length).toBe(0);
    expect(result.total).toBe(0);
  });

  it("search with NULL summary still finds by title", async () => {
    await ctx.documentService.create([{ title: "Nullsum Searchable CCC" }]);
    const result = await ctx.documentService.list({ search: "Nullsum Searchable" });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.some((d) => d.title === "Nullsum Searchable CCC")).toBe(true);
  });

  it("search is case-insensitive", async () => {
    await ctx.documentService.create([{ title: "CaseSensDoc DDD", summary: "UPPERCASE SUMMARY" }]);
    const byTitle = await ctx.documentService.list({ search: "caseSensDOC" });
    expect(byTitle.data.some((d) => d.title === "CaseSensDoc DDD")).toBe(true);
    const bySummary = await ctx.documentService.list({ search: "uppercase summary" });
    expect(bySummary.data.some((d) => d.title === "CaseSensDoc DDD")).toBe(true);
  });

  it("search supports partial matching (substring)", async () => {
    await ctx.documentService.create([{ title: "Partial Match EEE", summary: "abcdefghij" }]);
    const result = await ctx.documentService.list({ search: "cdefg" });
    expect(result.data.some((d) => d.title === "Partial Match EEE")).toBe(true);
  });

  it("search and title can coexist (AND logic)", async () => {
    await ctx.documentService.create([{ title: "Combo FFF Doc", summary: "special combo summary" }]);
    // Both match
    const both = await ctx.documentService.list({ search: "combo", title: "Combo FFF" });
    expect(both.data.some((d) => d.title === "Combo FFF Doc")).toBe(true);
    // search matches but title filter does not
    const mismatch = await ctx.documentService.list({ search: "combo", title: "zzz_no_title_match" });
    expect(mismatch.data.some((d) => d.title === "Combo FFF Doc")).toBe(false);
  });

  it("existing title filter continues to work independently", async () => {
    await ctx.documentService.create([{ title: "TitleOnly GGG Filter" }]);
    const result = await ctx.documentService.list({ title: "TitleOnly GGG" });
    expect(result.data.some((d) => d.title === "TitleOnly GGG Filter")).toBe(true);
  });

  it("search total count is consistent with data", async () => {
    await ctx.documentService.create([{ title: "CountCheck HHH", summary: "countcheck unique" }]);
    const result = await ctx.documentService.list({ search: "countcheck unique" });
    expect(result.total).toBe(result.data.length);
  });
});

// ---------------------------------------------------------------------------
// Project-Document Linking
// ---------------------------------------------------------------------------

describe("Project-Document Linking", () => {
  it("attaches documents via project update merge-patch", async () => {
    const [project] = await ctx.projectService.create([{ title: "Link Project" }]);
    const [doc] = await ctx.documentService.create([{ title: "Link Doc" }]);

    await ctx.projectService.update([{
      id: project.id,
      documents: { [doc.id]: [{ type: "reference" }] },
    }]);

    const fetched = await ctx.projectService.get(project.id);
    expect(fetched.documents.length).toBeGreaterThanOrEqual(1);
    expect(fetched.documents.some((d) => d.document_id === doc.id)).toBe(true);
  });

  it("detaches documents via project update merge-patch null", async () => {
    const [project] = await ctx.projectService.create([{ title: "Detach Project" }]);
    const [doc] = await ctx.documentService.create([{ title: "Detach Doc" }]);

    await ctx.projectService.update([{ id: project.id, documents: { [doc.id]: [{ type: "design" }] } }]);
    const before = await ctx.projectService.get(project.id);
    expect(before.documents.some((d) => d.document_id === doc.id)).toBe(true);

    await ctx.projectService.update([{ id: project.id, documents: { [doc.id]: null } }]);
    const after = await ctx.projectService.get(project.id);
    expect(after.documents.some((d) => d.document_id === doc.id)).toBe(false);
  });

  it("throws on nonexistent document ID in merge-patch", async () => {
    const [project] = await ctx.projectService.create([{ title: "404 Attach Project" }]);

    await expect(ctx.projectService.update([{
        id: project.id,
        documents: { "nonexistent-doc-id": [{ type: "reference" }] },
      }])).rejects.toThrow(ServiceError);
  });

  it("idempotent re-attach does not error", async () => {
    const [project] = await ctx.projectService.create([{ title: "Idempotent Project" }]);
    const [doc] = await ctx.documentService.create([{ title: "Idempotent Doc" }]);

    await ctx.projectService.update([{ id: project.id, documents: { [doc.id]: [{ type: "reference" }] } }]);
    // Second attach should not throw
    await ctx.projectService.update([{ id: project.id, documents: { [doc.id]: [{ type: "reference" }] } }]);

    const fetched = await ctx.projectService.get(project.id);
    // Should still appear exactly once for this type
    const matches = fetched.documents.filter((d) => d.document_id === doc.id);
    expect(matches.length).toBe(1);
  });

  it("project GET includes document reference summaries", async () => {
    const [project] = await ctx.projectService.create([{ title: "Summary Project" }]);
    const [doc] = await ctx.documentService.create([{
      title: "Summary Doc",
      content: "This should not appear",
    }]);

    await ctx.projectService.update([{ id: project.id, documents: { [doc.id]: [{ type: "reference" }] } }]);

    const fetched = await ctx.projectService.get(project.id);
    const linked = fetched.documents.find((d) => d.document_id === doc.id);
    expect(linked).toBeTruthy();
    expect(linked!.title).toBe("Summary Doc");
    expect(linked!.document_id).toBe(doc.id);
    expect(linked!.type).toBe("reference");
    // DocumentReferenceSummary should not include content field
    expect((linked as any).content).toBeUndefined();
  });

  it("cascade on document delete removes reference rows", async () => {
    const [project] = await ctx.projectService.create([{ title: "Cascade Project" }]);
    const [doc] = await ctx.documentService.create([{ title: "Cascade Doc" }]);

    await ctx.projectService.update([{ id: project.id, documents: { [doc.id]: [{ type: "reference" }] } }]);
    const before = await ctx.projectService.get(project.id);
    expect(before.documents.some((d) => d.document_id === doc.id)).toBe(true);

    await ctx.documentService.remove([doc.id]);

    const after = await ctx.projectService.get(project.id);
    expect(after.documents.some((d) => d.document_id === doc.id)).toBe(false);
  });

  it("attaches multiple documents in single update", async () => {
    const [project] = await ctx.projectService.create([{ title: "Multi Attach Project" }]);
    const [docA] = await ctx.documentService.create([{ title: "Multi Attach Doc A" }]);
    const [docB] = await ctx.documentService.create([{ title: "Multi Attach Doc B" }]);

    await ctx.projectService.update([{
      id: project.id,
      documents: {
        [docA.id]: [{ type: "design" }],
        [docB.id]: [{ type: "reference" }],
      },
    }]);

    const fetched = await ctx.projectService.get(project.id);
    expect(fetched.documents.some((d) => d.document_id === docA.id)).toBe(true);
    expect(fetched.documents.some((d) => d.document_id === docB.id)).toBe(true);
    expect(fetched.documents.length).toBeGreaterThanOrEqual(2);
  });

  it("detach nonexistent document link silently succeeds", async () => {
    const [project] = await ctx.projectService.create([{ title: "Silent Detach Project" }]);
    const [doc] = await ctx.documentService.create([{ title: "Never Attached Doc" }]);

    // Detach a doc that was never attached — should not throw
    await ctx.projectService.update([{
        id: project.id,
        documents: { [doc.id]: null },
      }]);
  });
});

// ---------------------------------------------------------------------------
// Task-Document Merge-Patch (via service)
// ---------------------------------------------------------------------------

describe("Task-Document Merge-Patch via service", () => {
  let projectId: string;

  beforeAll(async () => {
    const [project] = await ctx.projectService.create([{ title: "Task Doc MP Project" }]);
    projectId = project.id;
  });

  it("task create with documents produces correct references", async () => {
    const [doc] = await ctx.documentService.create([{ title: "Task Create Doc" }]);
    const [task] = await ctx.taskService.create([{
      project_id: projectId,
      title: "Task with docs on create",
      documents: { [doc.id]: [{ type: "goal" }, { type: "plan" }] },
    }]);

    const fetched = await ctx.taskService.get(task.id);
    expect(fetched.documents).toHaveLength(2);
    const types = fetched.documents.map((d) => d.type).sort();
    expect(types).toEqual(["goal", "plan"]);
    expect(fetched.documents.every((d) => d.document_id === doc.id)).toBe(true);
  });

  it("task update with documents replaces reference types", async () => {
    const [doc] = await ctx.documentService.create([{ title: "Task Replace Doc" }]);
    const [task] = await ctx.taskService.create([{
      project_id: projectId,
      title: "Task to replace refs",
      documents: { [doc.id]: [{ type: "goal" }] },
    }]);

    // Verify initial
    let fetched = await ctx.taskService.get(task.id);
    expect(fetched.documents).toHaveLength(1);
    expect(fetched.documents[0].type).toBe("goal");

    // Replace with different types
    await ctx.taskService.update([{
      id: task.id,
      documents: { [doc.id]: [{ type: "design" }, { type: "reference" }] },
    }]);

    fetched = await ctx.taskService.get(task.id);
    expect(fetched.documents).toHaveLength(2);
    const types = fetched.documents.map((d) => d.type).sort();
    expect(types).toEqual(["design", "reference"]);
  });

  it("task update with null removes references", async () => {
    const [doc] = await ctx.documentService.create([{ title: "Task Null Doc" }]);
    const [task] = await ctx.taskService.create([{
      project_id: projectId,
      title: "Task to null refs",
      documents: { [doc.id]: [{ type: "plan" }] },
    }]);

    // Verify initial
    let fetched = await ctx.taskService.get(task.id);
    expect(fetched.documents).toHaveLength(1);

    // Remove via null
    await ctx.taskService.update([{
      id: task.id,
      documents: { [doc.id]: null },
    }]);

    fetched = await ctx.taskService.get(task.id);
    expect(fetched.documents).toHaveLength(0);
  });

  it("task update with absent key preserves existing references", async () => {
    const [doc1] = await ctx.documentService.create([{ title: "Task Absent Doc 1" }]);
    const [doc2] = await ctx.documentService.create([{ title: "Task Absent Doc 2" }]);
    const [task] = await ctx.taskService.create([{
      project_id: projectId,
      title: "Task with two docs",
      documents: {
        [doc1.id]: [{ type: "goal" }],
        [doc2.id]: [{ type: "plan" }],
      },
    }]);

    // Update only doc2; doc1 should be untouched
    await ctx.taskService.update([{
      id: task.id,
      documents: { [doc2.id]: [{ type: "note" }] },
    }]);

    const fetched = await ctx.taskService.get(task.id);
    expect(fetched.documents).toHaveLength(2);
    const doc1Ref = fetched.documents.find((d) => d.document_id === doc1.id);
    const doc2Ref = fetched.documents.find((d) => d.document_id === doc2.id);
    expect(doc1Ref?.type).toBe("goal"); // untouched
    expect(doc2Ref?.type).toBe("note"); // updated
  });

  it("task delete removes all document references", async () => {
    const [doc] = await ctx.documentService.create([{ title: "Task Delete Doc" }]);
    const [task] = await ctx.taskService.create([{
      project_id: projectId,
      title: "Task to delete with refs",
      documents: { [doc.id]: [{ type: "requirements" }, { type: "design" }] },
    }]);

    // Verify references exist
    const fetched = await ctx.taskService.get(task.id);
    expect(fetched.documents).toHaveLength(2);

    // Delete the task
    await ctx.taskService.remove([task.id]);

    // Task is gone
    await expect(ctx.taskService.get(task.id)).rejects.toThrow(ServiceError);

    // Document still exists (not cascaded)
    const doc2 = await ctx.documentService.get(doc.id);
    expect(doc2.title).toBe("Task Delete Doc");
  });
});

// ---------------------------------------------------------------------------
// Input Validation Edge Cases
// ---------------------------------------------------------------------------

describe("Input Validation Edge Cases", () => {
  let projectId: string;

  beforeAll(async () => {
    const [project] = await ctx.projectService.create([{ title: "Validation Test Project" }]);
    projectId = project.id;
  });

  // --- Invalid enum values ---

  it("rejects task with invalid status enum", async () => {
    await expect(ctx.taskService.create([{
        project_id: projectId,
        title: "Bad status",
        status: "invalid" as any,
      }])).rejects.toThrow(ServiceError);
  });

  it("rejects task with invalid effort enum", async () => {
    await expect(ctx.taskService.create([{
        project_id: projectId,
        title: "Bad effort",
        effort: "mega" as any,
      }])).rejects.toThrow(ServiceError);
  });

  it("rejects task with invalid impact enum", async () => {
    await expect(ctx.taskService.create([{
        project_id: projectId,
        title: "Bad impact",
        impact: "none" as any,
      }])).rejects.toThrow(ServiceError);
  });

  it("rejects task with invalid category enum", async () => {
    await expect(ctx.taskService.create([{
        project_id: projectId,
        title: "Bad category",
        category: "misc" as any,
      }])).rejects.toThrow(ServiceError);
  });

  // --- Field length limits ---

  it("rejects task with group_key over 32 chars", async () => {
    await expect(ctx.taskService.create([{
        project_id: projectId,
        title: "Long group_key",
        group_key: "a".repeat(33),
      }])).rejects.toThrow(ServiceError);
  });

  it("rejects task with summary over 1000 chars", async () => {
    await expect(ctx.taskService.create([{
        project_id: projectId,
        title: "Long summary",
        summary: "x".repeat(1001),
      }])).rejects.toThrow(ServiceError);
  });

  it("rejects document with content over 50000 chars", async () => {
    await expect(ctx.documentService.create([{
        title: "Long content doc",
        content: "x".repeat(50001),
      }])).rejects.toThrow(ServiceError);
  });

  it("rejects project with summary over 1000 chars", async () => {
    await expect(ctx.projectService.create([{
        title: "Long summary project",
        summary: "x".repeat(1001),
      }])).rejects.toThrow(ServiceError);
  });

  // --- Boundary values ---

  it("accepts title of exactly 255 chars", async () => {
    const title = "a".repeat(255);
    const [project] = await ctx.projectService.create([{ title }]);
    expect(project.title).toBe(title);
    expect(project.title.length).toBe(255);
  });

  it("rejects whitespace-only title", async () => {
    await expect(ctx.projectService.create([{ title: "   " }])).rejects.toThrow(ServiceError);
  });

  // --- Mixed batch atomicity ---

  it("rejects entire batch when any item fails validation", async () => {
    const countBefore = (await ctx.taskService.list({
      project_id: projectId,
      limit: 200,
      offset: 0,
    })).total;

    await expect(ctx.taskService.create([
        { project_id: projectId, title: "Valid task in mixed batch" },
        { project_id: projectId, title: "" },
      ])).rejects.toThrow(ServiceError);

    const countAfter = (await ctx.taskService.list({
      project_id: projectId,
      limit: 200,
      offset: 0,
    })).total;

    // No tasks should have been persisted
    expect(countAfter).toBe(countBefore);
  });

  // --- Invalid enum on update ---

  it("rejects task update with invalid status enum", async () => {
    const [task] = await ctx.taskService.create([{
      project_id: projectId,
      title: "Update enum test",
    }]);

    await expect(ctx.taskService.update([{
        id: task.id,
        status: "completed" as any,
      }])).rejects.toThrow(ServiceError);
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

  beforeAll(async () => {
    const [project] = await ctx.projectService.create([{ title: "Dep Test Project" }]);
    projectId = project.id;
    const [a] = await ctx.taskService.create([{ project_id: projectId, title: "Task A" }]);
    const [b] = await ctx.taskService.create([{ project_id: projectId, title: "Task B" }]);
    const [c] = await ctx.taskService.create([{ project_id: projectId, title: "Task C" }]);
    taskA = a.id;
    taskB = b.id;
    taskC = c.id;
  });

  it("adds a blocks dependency between two tasks", async () => {
    const deps = await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskA, target_task_id: taskB, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(1);
    expect(deps[0].source_task_id).toBe(taskA);
    expect(deps[0].target_task_id).toBe(taskB);
    expect(deps[0].dependency_type).toBe("blocks");
    expect(deps[0].created_at).toBeTruthy();
  });

  it("adds a relates_to dependency", async () => {
    const deps = await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskB, target_task_id: taskC, dependency_type: "relates_to" },
    ]);
    expect(deps).toHaveLength(1);
    expect(deps[0].dependency_type).toBe("relates_to");
  });

  it("rejects self-referential dependency", async () => {
    await expect(ctx.taskDependencyService.addDependencies(projectId, [
        { source_task_id: taskA, target_task_id: taskA, dependency_type: "blocks" },
      ])).rejects.toThrow("a task cannot depend on itself");
  });

  it("rejects invalid dependency_type", async () => {
    await expect(ctx.taskDependencyService.addDependencies(projectId, [
        { source_task_id: taskA, target_task_id: taskC, dependency_type: "unknown" as "blocks" },
      ])).rejects.toThrow("dependency_type must be one of:");
  });

  it("rejects dependency for nonexistent task", async () => {
    await expect(ctx.taskDependencyService.addDependencies(projectId, [
        { source_task_id: "NONEXISTENT_TASK_ID_ABC", target_task_id: taskB, dependency_type: "blocks" },
      ])).rejects.toThrow("task not found");
  });

  it("rejects cross-project dependency", async () => {
    const [otherProject] = await ctx.projectService.create([{ title: "Other Project" }]);
    const [otherTask] = await ctx.taskService.create([{ project_id: otherProject.id, title: "Other Task" }]);
    await expect(ctx.taskDependencyService.addDependencies(projectId, [
        { source_task_id: taskA, target_task_id: otherTask.id, dependency_type: "blocks" },
      ])).rejects.toThrow("dependencies must be within the same project");
  });

  it("allows cyclic blocks edges (A->B already exists, adding B->A)", async () => {
    const deps = await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskB, target_task_id: taskA, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(1);
    expect(deps[0].dependency_type).toBe("blocks");
    // Both tasks should now be is_blocked (mutual blocking, both still todo)
    const depsA = await ctx.taskDependencyService.getDependencies(taskA);
    const depsB = await ctx.taskDependencyService.getDependencies(taskB);
    expect(depsA.is_blocked).toBe(true);
    expect(depsB.is_blocked).toBe(true);
  });

  it("allows cyclic chains > 2 (X->Y->Z->X)", async () => {
    // Use fresh tasks to avoid conflicts with earlier relates_to edges
    const [x] = await ctx.taskService.create([{ project_id: projectId, title: "Chain X" }]);
    const [y] = await ctx.taskService.create([{ project_id: projectId, title: "Chain Y" }]);
    const [z] = await ctx.taskService.create([{ project_id: projectId, title: "Chain Z" }]);
    await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: x.id, target_task_id: y.id, dependency_type: "blocks" },
    ]);
    await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: y.id, target_task_id: z.id, dependency_type: "blocks" },
    ]);
    const deps = await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: z.id, target_task_id: x.id, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(1);
    // All three tasks should be is_blocked
    const depsX = await ctx.taskDependencyService.getDependencies(x.id);
    const depsY = await ctx.taskDependencyService.getDependencies(y.id);
    const depsZ = await ctx.taskDependencyService.getDependencies(z.id);
    expect(depsX.is_blocked).toBe(true);
    expect(depsY.is_blocked).toBe(true);
    expect(depsZ.is_blocked).toBe(true);
  });

  it("allows relates_to even if it would form a cycle in blocks graph", async () => {
    // B->A as relates_to should be fine even though A blocks B
    const deps = await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: taskB, target_task_id: taskA, dependency_type: "relates_to" },
    ]);
    expect(deps).toHaveLength(1);
  });

  it("allows batch cycle: [{A->B, blocks}, {B->A, blocks}]", async () => {
    const [bA] = await ctx.taskService.create([{ project_id: projectId, title: "Batch A" }]);
    const [bB] = await ctx.taskService.create([{ project_id: projectId, title: "Batch B" }]);
    const deps = await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: bA.id, target_task_id: bB.id, dependency_type: "blocks" },
      { source_task_id: bB.id, target_task_id: bA.id, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(2);
    // Both edges should be persisted and both tasks blocked
    const depsA = await ctx.taskDependencyService.getDependencies(bA.id);
    const depsB = await ctx.taskDependencyService.getDependencies(bB.id);
    expect(depsA.blocked_by).toHaveLength(1);
    expect(depsB.blocked_by).toHaveLength(1);
    expect(depsA.is_blocked).toBe(true);
    expect(depsB.is_blocked).toBe(true);
  });

  it("allows batch 3-node cycle: [{A->B, blocks}, {B->C, blocks}, {C->A, blocks}]", async () => {
    const [c1] = await ctx.taskService.create([{ project_id: projectId, title: "Cycle3 A" }]);
    const [c2] = await ctx.taskService.create([{ project_id: projectId, title: "Cycle3 B" }]);
    const [c3] = await ctx.taskService.create([{ project_id: projectId, title: "Cycle3 C" }]);
    const deps = await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: c1.id, target_task_id: c2.id, dependency_type: "blocks" },
      { source_task_id: c2.id, target_task_id: c3.id, dependency_type: "blocks" },
      { source_task_id: c3.id, target_task_id: c1.id, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(3);
    // All three tasks should be is_blocked
    const d1 = await ctx.taskDependencyService.getDependencies(c1.id);
    const d2 = await ctx.taskDependencyService.getDependencies(c2.id);
    const d3 = await ctx.taskDependencyService.getDependencies(c3.id);
    expect(d1.is_blocked).toBe(true);
    expect(d2.is_blocked).toBe(true);
    expect(d3.is_blocked).toBe(true);
  });

  it("allows non-cyclic batch: [{A->B, blocks}, {B->C, blocks}]", async () => {
    const [n1] = await ctx.taskService.create([{ project_id: projectId, title: "Chain1" }]);
    const [n2] = await ctx.taskService.create([{ project_id: projectId, title: "Chain2" }]);
    const [n3] = await ctx.taskService.create([{ project_id: projectId, title: "Chain3" }]);
    const deps = await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: n1.id, target_task_id: n2.id, dependency_type: "blocks" },
      { source_task_id: n2.id, target_task_id: n3.id, dependency_type: "blocks" },
    ]);
    expect(deps).toHaveLength(2);
  });

  it("batch with relates_to does not trigger cycle detection", async () => {
    const [r1] = await ctx.taskService.create([{ project_id: projectId, title: "Rel1" }]);
    const [r2] = await ctx.taskService.create([{ project_id: projectId, title: "Rel2" }]);
    // Both directions as relates_to should be fine
    const deps = await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: r1.id, target_task_id: r2.id, dependency_type: "relates_to" },
      { source_task_id: r2.id, target_task_id: r1.id, dependency_type: "relates_to" },
    ]);
    expect(deps).toHaveLength(2);
  });

  it("getDependencies returns grouped shape with blocks, blocked_by, relates_to, is_blocked", async () => {
    const result = await ctx.taskDependencyService.getDependencies(taskB);
    // B has: blocked_by (A->B blocks), relates_to (B->C relates_to, B->A relates_to)
    // B does not block any task (no "blocks" from B with type=blocks)
    expect(result.blocked_by.length).toBeGreaterThanOrEqual(1);
    expect(result.relates_to.length).toBeGreaterThanOrEqual(1);
    // A blocks B and A is still todo, so B is_blocked
    expect(result.is_blocked).toBe(true);
    expect(result.blocked_by.some((d) => d.task_id === taskA)).toBe(true);
  });

  it("getGraph returns edges and blocked_task_ids", async () => {
    const graph = await ctx.taskDependencyService.getGraph(projectId);
    expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    // B should be blocked (A->B blocks, A is still todo)
    expect(graph.blocked_task_ids).toContain(taskB);
  });

  it("removeDependencies removes specified pairs", async () => {
    await ctx.taskDependencyService.removeDependencies(projectId, [
      { source_task_id: taskB, target_task_id: taskA },
    ]);
    const result = await ctx.taskDependencyService.getDependencies(taskA);
    // B->A relates_to should be gone
    expect(result.relates_to.some((d) => d.task_id === taskB)).toBe(false);
  });

  it("activity log entries are written for add operations", async () => {
    const logs = await activityLogRepo.findMany({ entity_type: "task", limit: 100 });
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

  it("activity log entries are written for remove operations", async () => {
    const logs = await activityLogRepo.findMany({ entity_type: "task", limit: 100 });
    const depRemovedLogs = logs.filter((l) => {
      if (l.action !== "deleted") return false;
      const summary = JSON.parse(l.summary);
      return summary.event === "dependency_removed";
    });
    expect(depRemovedLogs.length).toBeGreaterThanOrEqual(1);
    expect(depRemovedLogs[0].entity_id).not.toBeNull();
  });

  it("upserts dependency_type when re-adding with different type (relates_to -> blocks)", async () => {
    const [p] = await ctx.projectService.create([{ title: "Upsert Test" }]);
    const [tA] = await ctx.taskService.create([{ project_id: p.id, title: "UA" }]);
    const [tB] = await ctx.taskService.create([{ project_id: p.id, title: "UB" }]);

    const first = await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "relates_to" },
    ]);
    expect(first[0].dependency_type).toBe("relates_to");
    const firstCreatedAt = first[0].created_at;

    const second = await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
    ]);
    expect(second[0].dependency_type).toBe("blocks");
    // created_at is refreshed by the UPSERT (may equal firstCreatedAt in fast tests)
    expect(second[0].created_at).toBeTruthy();
  });

  it("upserts dependency_type when downgrading (blocks -> relates_to)", async () => {
    const [p] = await ctx.projectService.create([{ title: "Downgrade Test" }]);
    const [tA] = await ctx.taskService.create([{ project_id: p.id, title: "DA" }]);
    const [tB] = await ctx.taskService.create([{ project_id: p.id, title: "DB" }]);

    await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
    ]);
    const downgraded = await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "relates_to" },
    ]);
    expect(downgraded[0].dependency_type).toBe("relates_to");
  });

  it("re-adding same type does not error", async () => {
    const [p] = await ctx.projectService.create([{ title: "Same Type Test" }]);
    const [tA] = await ctx.taskService.create([{ project_id: p.id, title: "SA" }]);
    const [tB] = await ctx.taskService.create([{ project_id: p.id, title: "SB" }]);

    await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
    ]);
    const again = await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
    ]);
    expect(again[0].dependency_type).toBe("blocks");
  });

  it("upgrading relates_to to blocks allows cycles", async () => {
    const [p] = await ctx.projectService.create([{ title: "Cycle Upgrade Test" }]);
    const [tA] = await ctx.taskService.create([{ project_id: p.id, title: "CA" }]);
    const [tB] = await ctx.taskService.create([{ project_id: p.id, title: "CB" }]);
    const [tC] = await ctx.taskService.create([{ project_id: p.id, title: "CC" }]);

    // A blocks B
    await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
    ]);
    // B relates_to C (no cycle concern)
    await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tB.id, target_task_id: tC.id, dependency_type: "relates_to" },
    ]);
    // Upgrade B->C to blocks (should succeed — no cycle)
    const upgraded = await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tB.id, target_task_id: tC.id, dependency_type: "blocks" },
    ]);
    expect(upgraded[0].dependency_type).toBe("blocks");

    // C->A as blocks creates cycle A->B->C->A — now allowed
    const cycleEdge = await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tC.id, target_task_id: tA.id, dependency_type: "blocks" },
    ]);
    expect(cycleEdge).toHaveLength(1);
    expect(cycleEdge[0].dependency_type).toBe("blocks");
  });

  it("cyclic tasks are all is_blocked", async () => {
    const [p] = await ctx.projectService.create([{ title: "Cycle Blocked Test" }]);
    const [tA] = await ctx.taskService.create([{ project_id: p.id, title: "CycBlk A" }]);
    const [tB] = await ctx.taskService.create([{ project_id: p.id, title: "CycBlk B" }]);
    // A blocks B, B blocks A
    await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
      { source_task_id: tB.id, target_task_id: tA.id, dependency_type: "blocks" },
    ]);
    const depsA = await ctx.taskDependencyService.getDependencies(tA.id);
    const depsB = await ctx.taskDependencyService.getDependencies(tB.id);
    expect(depsA.is_blocked).toBe(true);
    expect(depsB.is_blocked).toBe(true);
  });

  it("get_dependency_graph includes cyclic edges", async () => {
    const [p] = await ctx.projectService.create([{ title: "Cycle Graph Test" }]);
    const [tA] = await ctx.taskService.create([{ project_id: p.id, title: "CycGrph A" }]);
    const [tB] = await ctx.taskService.create([{ project_id: p.id, title: "CycGrph B" }]);
    // Create 2-node cycle
    await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
      { source_task_id: tB.id, target_task_id: tA.id, dependency_type: "blocks" },
    ]);
    const graph = await ctx.taskDependencyService.getGraph(p.id);
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges.some((e) => e.source_task_id === tA.id && e.target_task_id === tB.id)).toBe(true);
    expect(graph.edges.some((e) => e.source_task_id === tB.id && e.target_task_id === tA.id)).toBe(true);
    expect(graph.blocked_task_ids).toContain(tA.id);
    expect(graph.blocked_task_ids).toContain(tB.id);
  });

  it("completing one task in a cycle unblocks the other", async () => {
    const [p] = await ctx.projectService.create([{ title: "Cycle Unblock Test" }]);
    const [tA] = await ctx.taskService.create([{ project_id: p.id, title: "CycUnblk A" }]);
    const [tB] = await ctx.taskService.create([{ project_id: p.id, title: "CycUnblk B" }]);
    // Create 2-node cycle
    await ctx.taskDependencyService.addDependencies(p.id, [
      { source_task_id: tA.id, target_task_id: tB.id, dependency_type: "blocks" },
      { source_task_id: tB.id, target_task_id: tA.id, dependency_type: "blocks" },
    ]);
    // Both blocked initially
    expect((await ctx.taskDependencyService.getDependencies(tA.id)).is_blocked).toBe(true);
    expect((await ctx.taskDependencyService.getDependencies(tB.id)).is_blocked).toBe(true);
    // Mark A as done
    await ctx.taskService.update([{ id: tA.id, status: "done" }]);
    // B should no longer be blocked (its only blocker A is done)
    expect((await ctx.taskDependencyService.getDependencies(tB.id)).is_blocked).toBe(false);
    // A is still blocked by B (B is still todo), but that's expected
    expect((await ctx.taskDependencyService.getDependencies(tA.id)).is_blocked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task is_blocked field
// ---------------------------------------------------------------------------

describe("Task is_blocked field", () => {
  let projectId: string;

  beforeAll(async () => {
    const [project] = await ctx.projectService.create([{ title: "Blocked Test Project" }]);
    projectId = project.id;
  });

  it("newly created tasks have is_blocked = false", async () => {
    const [task] = await ctx.taskService.create([{ project_id: projectId, title: "New Task" }]);
    expect(task.is_blocked).toBe(false);
  });

  it("is_blocked can be set to true via update", async () => {
    const [task] = await ctx.taskService.create([{ project_id: projectId, title: "Will Block" }]);
    await ctx.taskService.update([{ id: task.id, is_blocked: true }]);
    expect((await ctx.taskService.get(task.id)).is_blocked).toBe(true);
  });

  it("is_blocked can be set back to false via update", async () => {
    const [task] = await ctx.taskService.create([{ project_id: projectId, title: "Block Then Unblock" }]);
    await ctx.taskService.update([{ id: task.id, is_blocked: true }]);
    expect((await ctx.taskService.get(task.id)).is_blocked).toBe(true);
    await ctx.taskService.update([{ id: task.id, is_blocked: false }]);
    expect((await ctx.taskService.get(task.id)).is_blocked).toBe(false);
  });

  it("is_blocked is not changed by dependency edges", async () => {
    const [blocker] = await ctx.taskService.create([{ project_id: projectId, title: "Blocker" }]);
    const [blocked] = await ctx.taskService.create([{ project_id: projectId, title: "Blocked" }]);
    await ctx.taskDependencyService.addDependencies(projectId, [
      { source_task_id: blocker.id, target_task_id: blocked.id, dependency_type: "blocks" },
    ]);
    // is_blocked is a user-managed field, not derived from dependency edges
    expect((await ctx.taskService.get(blocked.id)).is_blocked).toBe(false);
  });

  it("list() returns is_blocked as boolean in summaries", async () => {
    const result = await ctx.taskService.list({ project_id: projectId });
    for (const task of result.data) {
      expect(typeof task.is_blocked).toBe("boolean");
    }
  });

  it("list() filters by blocked parameter", async () => {
    const [task] = await ctx.taskService.create([{ project_id: projectId, title: "Filter Blocked" }]);
    await ctx.taskService.update([{ id: task.id, is_blocked: true }]);

    const blockedResult = await ctx.taskService.list({ project_id: projectId, blocked: true });
    expect(blockedResult.data.some((t) => t.id === task.id)).toBe(true);

    const unblockedResult = await ctx.taskService.list({ project_id: projectId, blocked: false });
    expect(unblockedResult.data.some((t) => t.id === task.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Dependency Edge Cases
// ---------------------------------------------------------------------------

describe("Dependency Edge Cases", () => {
  it("is_blocked is boolean when listing tasks without project_id", async () => {
    const [project] = await ctx.projectService.create([{ title: "Global List Blocked Project" }]);
    const [task] = await ctx.taskService.create([{ project_id: project.id, title: "Global Task" }]);
    await ctx.taskService.update([{ id: task.id, is_blocked: true }]);

    // List without project_id (global list)
    const result = await ctx.taskService.list({ limit: 200 });
    const found = result.data.find((t) => t.id === task.id);
    expect(found).toBeTruthy();
    expect(found!.is_blocked).toBe(true);
    expect(typeof found!.is_blocked).toBe("boolean");
  });

  it("task deletion via CASCADE removes dependency rows", async () => {
    const [project] = await ctx.projectService.create([{ title: "CASCADE Delete Project" }]);
    const [taskA] = await ctx.taskService.create([{ project_id: project.id, title: "CASCADE A" }]);
    const [taskB] = await ctx.taskService.create([{ project_id: project.id, title: "CASCADE B" }]);
    await ctx.taskDependencyService.addDependencies(project.id, [
      { source_task_id: taskA.id, target_task_id: taskB.id, dependency_type: "blocks" },
    ]);

    // Delete A
    await ctx.taskService.remove([taskA.id]);

    // Dependencies for B should be empty
    const deps = await ctx.taskDependencyService.getDependencies(taskB.id);
    expect(deps.blocked_by).toHaveLength(0);
  });

  it("UPSERT: re-adding same edge with different type updates the type", async () => {
    const [project] = await ctx.projectService.create([{ title: "Upsert Edge Project" }]);
    const [taskA] = await ctx.taskService.create([{ project_id: project.id, title: "Upsert A" }]);
    const [taskB] = await ctx.taskService.create([{ project_id: project.id, title: "Upsert B" }]);

    // Add as relates_to
    await ctx.taskDependencyService.addDependencies(project.id, [
      { source_task_id: taskA.id, target_task_id: taskB.id, dependency_type: "relates_to" },
    ]);
    let deps = await ctx.taskDependencyService.getDependencies(taskB.id);
    expect(deps.relates_to.length).toBeGreaterThanOrEqual(1);

    // Re-add as blocks (upsert)
    await ctx.taskDependencyService.addDependencies(project.id, [
      { source_task_id: taskA.id, target_task_id: taskB.id, dependency_type: "blocks" },
    ]);
    deps = await ctx.taskDependencyService.getDependencies(taskB.id);
    expect(deps.blocked_by.some((d) => d.task_id === taskA.id)).toBe(true);
  });

  it("add_dependencies via task update creates correct source/target mapping", async () => {
    const [project] = await ctx.projectService.create([{ title: "Mapping Test Project" }]);
    const [taskA] = await ctx.taskService.create([{ project_id: project.id, title: "Mapper A" }]);
    const [taskB] = await ctx.taskService.create([{ project_id: project.id, title: "Mapper B" }]);

    // update taskB with add_dependencies [{task_id: taskA, type: blocks}]
    // This should mean: taskA is the blocker (source), taskB is the blocked (target)
    await ctx.taskService.update([{
      id: taskB.id,
      add_dependencies: [{ task_id: taskA.id, type: "blocks" }],
    }]);

    const deps = await ctx.taskDependencyService.getDependencies(taskB.id);
    expect(deps.blocked_by.some((d) => d.task_id === taskA.id)).toBe(true);
    expect(deps.is_blocked).toBe(true);

    // From A's perspective, A should appear in blocks
    const depsA = await ctx.taskDependencyService.getDependencies(taskA.id);
    expect(depsA.blocks.some((d) => d.task_id === taskB.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Activity Log Retention
// ---------------------------------------------------------------------------

describe("Activity Log Retention", () => {
  it("countAll returns correct count", async () => {
    const countBefore = await activityLogRepo.countAll();
    // Creating a project generates an activity log entry
    await ctx.projectService.create([{ title: "Retention Count Test" }]);
    const countAfter = await activityLogRepo.countAll();
    expect(countAfter).toBe(countBefore + 1);
  });

  it("deleteOlderThan removes only entries before cutoff", async () => {
    // Insert a backdated entry directly via the db
    const oldDate = "2020-01-01T00:00:00.000Z";
    ctx.db!
      .query(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("retention-old-1", "test", null, "created", "{}", oldDate);
    ctx.db!
      .query(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("retention-old-2", "test", null, "created", "{}", "2020-06-15T00:00:00.000Z");

    const countBefore = await activityLogRepo.countAll();

    // Use a cutoff that is after the old entries but before any recent ones
    const cutoff = "2021-01-01T00:00:00.000Z";
    const deleted = await activityLogRepo.deleteOlderThan(cutoff);

    expect(deleted).toBe(2);
    expect(await activityLogRepo.countAll()).toBe(countBefore - 2);
  });

  it("deleteOlderThan returns 0 when no entries match", async () => {
    // Use a very old cutoff that predates all entries
    const deleted = await activityLogRepo.deleteOlderThan("1970-01-01T00:00:00.000Z");
    expect(deleted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Automation CRUD
// ---------------------------------------------------------------------------

describe("Automation CRUD", () => {
  it("creates an automation with title only", async () => {
    const [automation] = await ctx.automationService.create([{ title: "My Prompt" }]);
    expect(automation.id).toBeTruthy();
    expect(automation.title).toBe("My Prompt");
    expect(automation.summary).toBeNull();
    expect(automation.prompt).toBeNull();
    expect(automation.agent).toBeNull();
    expect(automation.category).toBeNull();
    expect(automation.is_favorite).toBe(false);
    expect(automation.tags).toEqual([]);
  });

  it("creates an automation with all fields", async () => {
    const [automation] = await ctx.automationService.create([{
      title: "Full Prompt",
      summary: "Runs a code review",
      prompt: "Review this code for bugs and style issues.",
      agent: "code-reviewer",
      category: "code-review",
      is_favorite: true,
      tags: ["ui" as TagName],
    }]);
    expect(automation.title).toBe("Full Prompt");
    expect(automation.summary).toBe("Runs a code review");
    expect(automation.prompt).toBe("Review this code for bugs and style issues.");
    expect(automation.agent).toBe("code-reviewer");
    expect(automation.category).toBe("code-review");
    expect(automation.is_favorite).toBe(true);
    expect(automation.tags).toEqual(["ui"]);
  });

  it("lists automations", async () => {
    const result = await ctx.automationService.list();
    expect(result.data).toBeArray();
    expect(result.total).toBeGreaterThanOrEqual(2);
    // Summaries should have has_prompt, not prompt
    const first = result.data[0];
    expect(first).toHaveProperty("has_prompt");
    expect(first).not.toHaveProperty("prompt");
  });

  it("filters by title", async () => {
    const result = await ctx.automationService.list({ title: "Full Prompt" });
    expect(result.total).toBe(1);
    expect(result.data[0].title).toBe("Full Prompt");
  });

  it("filters by category", async () => {
    const result = await ctx.automationService.list({ category: "code-review" });
    expect(result.total).toBe(1);
  });

  it("filters by is_favorite", async () => {
    const result = await ctx.automationService.list({ is_favorite: true });
    expect(result.total).toBeGreaterThanOrEqual(1);
    for (const a of result.data) expect(a.is_favorite).toBe(true);
  });

  it("filters by tag", async () => {
    const result = await ctx.automationService.list({ tag: "ui" });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("paginates with limit/offset", async () => {
    const result = await ctx.automationService.list({ limit: 1, offset: 0 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  it("gets a single automation with tags", async () => {
    const [created] = await ctx.automationService.create([{
      title: "Get Test",
      prompt: "test prompt",
      tags: ["data" as TagName],
    }]);
    const fetched = await ctx.automationService.get(created.id);
    expect(fetched.title).toBe("Get Test");
    expect(fetched.prompt).toBe("test prompt");
    expect(fetched.tags).toEqual(["data"]);
  });

  it("throws 404 for missing automation", async () => {
    await expect(ctx.automationService.get("nonexistent")).rejects.toThrow(ServiceError);
  });

  it("updates automation fields", async () => {
    const [created] = await ctx.automationService.create([{ title: "Update Me" }]);
    const [updated] = await ctx.automationService.update([{
      id: created.id,
      title: "Updated",
      summary: "New summary",
      prompt: "New prompt",
      agent: "my-agent",
      category: "refactor",
      is_favorite: true,
    }]);
    expect(updated.title).toBe("Updated");
    expect(updated.summary).toBe("New summary");
    expect(updated.prompt).toBe("New prompt");
    expect(updated.agent).toBe("my-agent");
    expect(updated.category).toBe("refactor");
    expect(updated.is_favorite).toBe(true);
  });

  it("updates tags", async () => {
    const [created] = await ctx.automationService.create([{ title: "Tag Update", tags: ["ui" as TagName] }]);
    const [updated] = await ctx.automationService.update([{ id: created.id, tags: ["data" as TagName, "infra" as TagName] }]);
    expect(updated.tags.sort()).toEqual(["data", "infra"]);
  });

  it("deletes automations", async () => {
    const [created] = await ctx.automationService.create([{ title: "Delete Me" }]);
    await ctx.automationService.remove([created.id]);
    await expect(ctx.automationService.get(created.id)).rejects.toThrow(ServiceError);
  });

  it("rejects empty title", async () => {
    await expect(ctx.automationService.create([{ title: "" }])).rejects.toThrow(ServiceError);
  });

  it("rejects title over 255 chars", async () => {
    await expect(ctx.automationService.create([{ title: "x".repeat(256) }])).rejects.toThrow(ServiceError);
  });

  it("rejects prompt over 100K chars", async () => {
    await expect(ctx.automationService.create([{ title: "Big", prompt: "x".repeat(100_001) }])).rejects.toThrow(ServiceError);
  });

  it("rejects invalid tag", async () => {
    await expect(ctx.automationService.create([{ title: "Bad Tag", tags: ["nonexistent" as TagName] }])).rejects.toThrow(ServiceError);
  });

  it("creates activity log entries", async () => {
    const logBefore = await activityLogRepo.count({ entity_type: "automation" });
    await ctx.automationService.create([{ title: "Log Test" }]);
    const logAfter = await activityLogRepo.count({ entity_type: "automation" });
    expect(logAfter).toBeGreaterThan(logBefore);
  });

  it("batch creates multiple automations", async () => {
    const results = await ctx.automationService.create([
      { title: "Batch 1" },
      { title: "Batch 2" },
      { title: "Batch 3" },
    ]);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.title)).toEqual(["Batch 1", "Batch 2", "Batch 3"]);
  });
});
