import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";
import { DocumentReferenceRepository } from "./repositories/sqlite/document-references";
import { DocumentReferenceService } from "./services/document-references";
import type { IDocumentReferenceService } from "./services";
import type { DocumentReferenceType, EntityType } from "./entities";

let ctx: AppContext;
let tempDir: string;
let docRefRepo: DocumentReferenceRepository;
let docRefService: IDocumentReferenceService;

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "docref-test-"));
  const dbPath = join(tempDir, "test.db");
  ctx = await bootstrap(dbPath);

  docRefRepo = new DocumentReferenceRepository(ctx.db!);
  docRefService = new DocumentReferenceService(
    docRefRepo,
    // Access document repo through bootstrapped db
    new (await import("./repositories/sqlite/documents")).DocumentRepository(ctx.db!),
    new (await import("./repositories/sqlite/activity-log")).ActivityLogRepository(ctx.db!),
    ctx.eventBus,
  );
});

afterAll(() => {
  ctx.db!.close();
  rmSync(tempDir, { recursive: true, force: true });
});

// Helpers to create test entities
async function createProject(title: string) {
  return (await ctx.projectService.create([{ title }]))[0];
}

async function createTask(projectId: string, title: string) {
  return (await ctx.taskService.create([{ project_id: projectId, title }]))[0];
}

async function createDocument(title: string, content?: string) {
  return (await ctx.documentService.create([{ title, content }]))[0];
}

// ---------------------------------------------------------------------------
// CRUD basics
// ---------------------------------------------------------------------------

describe("Document References - CRUD basics", () => {
  it("adds a reference linking a document to a project with type 'goal'", async () => {
    const project = await createProject("Goal project");
    const doc = await createDocument("Goal doc", "Some goal content");

    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal"]);

    const refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(1);
    expect(refs[0].entity_type).toBe("project");
    expect(refs[0].entity_id).toBe(project.id);
    expect(refs[0].document_id).toBe(doc.id);
    expect(refs[0].type).toBe("goal");
  });

  it("adds a reference linking a document to a task with type 'plan'", async () => {
    const project = await createProject("Plan project");
    const task = await createTask(project.id, "Plan task");
    const doc = await createDocument("Plan doc");

    await docRefRepo.setReferencesForEntityDocument("task", task.id, doc.id, ["plan"]);

    const refs = await docRefRepo.getReferencesForEntity("task", task.id);
    expect(refs).toHaveLength(1);
    expect(refs[0].entity_type).toBe("task");
    expect(refs[0].entity_id).toBe(task.id);
    expect(refs[0].document_id).toBe(doc.id);
    expect(refs[0].type).toBe("plan");
  });

  it("returns references for a project", async () => {
    const project = await createProject("Multi-ref project");
    const doc1 = await createDocument("Ref doc 1");
    const doc2 = await createDocument("Ref doc 2");

    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc1.id, ["goal"]);
    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc2.id, ["design"]);

    const refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);
    const types = refs.map((r) => r.type);
    expect(types).toContain("goal");
    expect(types).toContain("design");
  });

  it("returns references for a task", async () => {
    const project = await createProject("Task ref project");
    const task = await createTask(project.id, "Task with refs");
    const doc = await createDocument("Task ref doc");

    await docRefRepo.setReferencesForEntityDocument("task", task.id, doc.id, ["plan", "note"]);

    const refs = await docRefRepo.getReferencesForEntity("task", task.id);
    expect(refs).toHaveLength(2);
  });

  it("removes a specific reference for entity+document", async () => {
    const project = await createProject("Remove ref project");
    const doc1 = await createDocument("Remove ref doc 1");
    const doc2 = await createDocument("Remove ref doc 2");

    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc1.id, ["goal"]);
    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc2.id, ["design"]);

    await docRefRepo.removeReferencesForEntityDocument("project", project.id, doc1.id);

    const refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(1);
    expect(refs[0].document_id).toBe(doc2.id);
  });

  it("removes all references for an entity", async () => {
    const project = await createProject("Remove all project");
    const doc1 = await createDocument("Remove all doc 1");
    const doc2 = await createDocument("Remove all doc 2");

    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc1.id, ["goal"]);
    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc2.id, ["design"]);

    await docRefRepo.removeAllForEntity("project", project.id);

    const refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// All 6 reference types
// ---------------------------------------------------------------------------

describe("Document References - All 6 reference types", () => {
  it("supports all 6 reference types: goal, plan, requirements, design, reference, note", async () => {
    const project = await createProject("All types project");
    const allTypes: DocumentReferenceType[] = ["goal", "plan", "requirements", "design", "reference", "note"];

    // Create a separate document for each type
    for (const type of allTypes) {
      const doc = await createDocument(`Doc for ${type}`);
      await docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, [type]);
    }

    const refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(6);

    const foundTypes = refs.map((r) => r.type).sort();
    expect(foundTypes).toEqual([...allTypes].sort());
  });
});

// ---------------------------------------------------------------------------
// Multi-entity references
// ---------------------------------------------------------------------------

describe("Document References - Multi-entity", () => {
  it("same document referenced by multiple entities with different types", async () => {
    const project = await createProject("Shared doc project");
    const task = await createTask(project.id, "Shared doc task");
    const doc = await createDocument("Shared doc");

    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal"]);
    await docRefRepo.setReferencesForEntityDocument("task", task.id, doc.id, ["plan"]);

    const projectRefs = await docRefRepo.getReferencesForEntity("project", project.id);
    const taskRefs = await docRefRepo.getReferencesForEntity("task", task.id);

    expect(projectRefs).toHaveLength(1);
    expect(projectRefs[0].type).toBe("goal");
    expect(taskRefs).toHaveLength(1);
    expect(taskRefs[0].type).toBe("plan");

    // Reverse lookup: document has references from both entities
    const entities = await docRefRepo.getEntitiesForDocument(doc.id);
    expect(entities).toHaveLength(2);
    const entityIds = entities.map((e) => e.entity_id);
    expect(entityIds).toContain(project.id);
    expect(entityIds).toContain(task.id);
  });

  it("same entity references multiple documents", async () => {
    const project = await createProject("Multi-doc project");
    const doc1 = await createDocument("Multi-doc 1");
    const doc2 = await createDocument("Multi-doc 2");
    const doc3 = await createDocument("Multi-doc 3");

    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc1.id, ["goal"]);
    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc2.id, ["requirements"]);
    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc3.id, ["design"]);

    const refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(3);
    const docIds = refs.map((r) => r.document_id);
    expect(docIds).toContain(doc1.id);
    expect(docIds).toContain(doc2.id);
    expect(docIds).toContain(doc3.id);
  });

  it("same entity references same document with different types (allowed by composite PK)", async () => {
    const project = await createProject("Same doc diff types");
    const doc = await createDocument("Multi-type doc");

    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal", "reference"]);

    const refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);
    const types = refs.map((r) => r.type).sort();
    expect(types).toEqual(["goal", "reference"]);
  });
});

// ---------------------------------------------------------------------------
// Idempotent behavior
// ---------------------------------------------------------------------------

describe("Document References - Idempotency", () => {
  it("setReferencesForEntityDocument is idempotent (replaces existing types)", async () => {
    const project = await createProject("Idempotent project");
    const doc = await createDocument("Idempotent doc");

    // Set initial references
    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal", "plan"]);
    let refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);

    // Set same references again -- should not error or duplicate
    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal", "plan"]);
    refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);

    // Set different references -- should replace
    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["design"]);
    refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(1);
    expect(refs[0].type).toBe("design");
  });
});

// ---------------------------------------------------------------------------
// Merge-patch semantics (via service)
// ---------------------------------------------------------------------------

describe("Document References - Merge-patch via service", () => {
  it("array value replaces all types for that document", async () => {
    const project = await createProject("Merge-patch replace");
    const doc = await createDocument("MP replace doc");

    // Initial set
    await docRefService.applyMergePatch("project", project.id, {
      [doc.id]: [{ type: "goal" }, { type: "plan" }],
    });
    let refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);

    // Replace with different types
    await docRefService.applyMergePatch("project", project.id, {
      [doc.id]: [{ type: "design" }],
    });
    refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(1);
    expect(refs[0].type).toBe("design");
  });

  it("null value removes all references to that document", async () => {
    const project = await createProject("Merge-patch null");
    const doc = await createDocument("MP null doc");

    await docRefService.applyMergePatch("project", project.id, {
      [doc.id]: [{ type: "goal" }],
    });
    expect(await docRefRepo.getReferencesForEntity("project", project.id)).toHaveLength(1);

    // null removes references
    await docRefService.applyMergePatch("project", project.id, {
      [doc.id]: null,
    });
    expect(await docRefRepo.getReferencesForEntity("project", project.id)).toHaveLength(0);
  });

  it("absent key leaves references untouched", async () => {
    const project = await createProject("Merge-patch absent");
    const doc1 = await createDocument("MP absent doc 1");
    const doc2 = await createDocument("MP absent doc 2");

    // Set up references for both docs
    await docRefService.applyMergePatch("project", project.id, {
      [doc1.id]: [{ type: "goal" }],
      [doc2.id]: [{ type: "plan" }],
    });
    expect(await docRefRepo.getReferencesForEntity("project", project.id)).toHaveLength(2);

    // Update only doc2; doc1 should be untouched
    await docRefService.applyMergePatch("project", project.id, {
      [doc2.id]: [{ type: "note" }],
    });
    const refs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);

    const doc1Ref = refs.find((r) => r.document_id === doc1.id);
    const doc2Ref = refs.find((r) => r.document_id === doc2.id);
    expect(doc1Ref?.type).toBe("goal"); // untouched
    expect(doc2Ref?.type).toBe("note"); // updated
  });
});

// ---------------------------------------------------------------------------
// Cascade behavior
// ---------------------------------------------------------------------------

describe("Document References - Cascade delete", () => {
  it("deleting a document removes all its references (FK CASCADE)", async () => {
    const project = await createProject("Cascade project");
    const task = await createTask(project.id, "Cascade task");
    const doc = await createDocument("Cascade doc", "Will be deleted");

    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal"]);
    await docRefRepo.setReferencesForEntityDocument("task", task.id, doc.id, ["plan"]);

    // Verify references exist
    expect(await docRefRepo.getEntitiesForDocument(doc.id)).toHaveLength(2);

    // Delete the document via service
    await ctx.documentService.remove([doc.id]);

    // References should be gone due to CASCADE
    expect(await docRefRepo.getEntitiesForDocument(doc.id)).toHaveLength(0);
    // Entity-side queries should also show no references for that doc
    const projectRefs = await docRefRepo.getReferencesForEntity("project", project.id);
    expect(projectRefs.every((r) => r.document_id !== doc.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Validation (via service)
// ---------------------------------------------------------------------------

describe("Document References - Validation", () => {
  it("rejects invalid reference type (should throw 400)", async () => {
    const project = await createProject("Invalid type project");
    const doc = await createDocument("Valid doc for bad type");

    await expect(docRefService.applyMergePatch("project", project.id, {
        [doc.id]: [{ type: "bogus" as DocumentReferenceType }],
      })).rejects.toThrow(ServiceError);

    try {
      await docRefService.applyMergePatch("project", project.id, {
        [doc.id]: [{ type: "invalid" as DocumentReferenceType }],
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceError);
      expect((err as ServiceError).statusCode).toBe(400);
    }
  });

  it("rejects reference to nonexistent document (should throw 404)", async () => {
    const project = await createProject("Missing doc project");

    await expect(docRefService.applyMergePatch("project", project.id, {
        "nonexistent-doc-id": [{ type: "goal" }],
      })).rejects.toThrow(ServiceError);

    try {
      await docRefService.applyMergePatch("project", project.id, {
        "nonexistent-doc-id": [{ type: "goal" }],
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceError);
      expect((err as ServiceError).statusCode).toBe(404);
    }
  });
});

// ---------------------------------------------------------------------------
// Query patterns
// ---------------------------------------------------------------------------

describe("Document References - Query patterns", () => {
  it("getReferencesForEntityWithDocumentTitles returns document_id, document_title, type (not full content)", async () => {
    const project = await createProject("Query pattern project");
    const doc = await createDocument("Query doc", "This content should NOT appear in summaries");

    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal"]);

    const summaries = await docRefRepo.getReferencesForEntityWithDocumentTitles("project", project.id);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].document_id).toBe(doc.id);
    expect(summaries[0].document_title).toBe("Query doc");
    expect(summaries[0].type).toBe("goal");

    // Ensure no content field leaked
    const keys = Object.keys(summaries[0]);
    expect(keys).not.toContain("content");
  });

  it("getEntitiesForDocument returns reverse lookup", async () => {
    const project = await createProject("Reverse lookup project");
    const task = await createTask(project.id, "Reverse lookup task");
    const doc = await createDocument("Reverse doc");

    await docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["requirements"]);
    await docRefRepo.setReferencesForEntityDocument("task", task.id, doc.id, ["reference"]);

    const entities = await docRefRepo.getEntitiesForDocument(doc.id);
    expect(entities).toHaveLength(2);

    const projectRef = entities.find((e) => e.entity_type === "project");
    const taskRef = entities.find((e) => e.entity_type === "task");

    expect(projectRef).toBeDefined();
    expect(projectRef?.entity_id).toBe(project.id);
    expect(projectRef?.type).toBe("requirements");

    expect(taskRef).toBeDefined();
    expect(taskRef?.entity_id).toBe(task.id);
    expect(taskRef?.type).toBe("reference");
  });

  it("getReferencesForEntities returns batch results for multiple entities", async () => {
    const project1 = await createProject("Batch query project 1");
    const project2 = await createProject("Batch query project 2");
    const doc = await createDocument("Batch query doc");

    await docRefRepo.setReferencesForEntityDocument("project", project1.id, doc.id, ["goal"]);
    await docRefRepo.setReferencesForEntityDocument("project", project2.id, doc.id, ["design"]);

    const result = await docRefRepo.getReferencesForEntities("project", [project1.id, project2.id]);
    expect(result.size).toBe(2);

    const p1Refs = result.get(project1.id);
    const p2Refs = result.get(project2.id);
    expect(p1Refs).toHaveLength(1);
    expect(p1Refs?.[0].type).toBe("goal");
    expect(p2Refs).toHaveLength(1);
    expect(p2Refs?.[0].type).toBe("design");
  });

  it("service getReferencesForEntity returns summaries with document titles", async () => {
    const project = await createProject("Service query project");
    const doc = await createDocument("Service query doc", "Content that should not appear");

    await docRefService.applyMergePatch("project", project.id, {
      [doc.id]: [{ type: "note" }],
    });

    const summaries = await docRefService.getReferencesForEntity("project", project.id);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].document_id).toBe(doc.id);
    expect(summaries[0].document_title).toBe("Service query doc");
    expect(summaries[0].type).toBe("note");
    expect(Object.keys(summaries[0])).not.toContain("content");
  });
});
