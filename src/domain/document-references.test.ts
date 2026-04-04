import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap, type AppContext } from "./bootstrap";
import { ServiceError } from "./errors";
import { DocumentReferenceRepository } from "./repositories/document-references";
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

  docRefRepo = new DocumentReferenceRepository(ctx.db);
  docRefService = new DocumentReferenceService(
    docRefRepo,
    // Access document repo through bootstrapped db
    new (await import("./repositories/documents")).DocumentRepository(ctx.db),
    new (await import("./repositories/activity-log")).ActivityLogRepository(ctx.db),
    ctx.eventBus,
  );
});

afterAll(() => {
  ctx.db.close();
  rmSync(tempDir, { recursive: true, force: true });
});

// Helpers to create test entities
function createProject(title: string) {
  return ctx.projectService.create([{ title }])[0];
}

function createTask(projectId: string, title: string) {
  return ctx.taskService.create([{ project_id: projectId, title }])[0];
}

function createDocument(title: string, content?: string) {
  return ctx.documentService.create([{ title, content }])[0];
}

// ---------------------------------------------------------------------------
// CRUD basics
// ---------------------------------------------------------------------------

describe("Document References - CRUD basics", () => {
  it("adds a reference linking a document to a project with type 'goal'", () => {
    const project = createProject("Goal project");
    const doc = createDocument("Goal doc", "Some goal content");

    docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal"]);

    const refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(1);
    expect(refs[0].entity_type).toBe("project");
    expect(refs[0].entity_id).toBe(project.id);
    expect(refs[0].document_id).toBe(doc.id);
    expect(refs[0].type).toBe("goal");
  });

  it("adds a reference linking a document to a task with type 'plan'", () => {
    const project = createProject("Plan project");
    const task = createTask(project.id, "Plan task");
    const doc = createDocument("Plan doc");

    docRefRepo.setReferencesForEntityDocument("task", task.id, doc.id, ["plan"]);

    const refs = docRefRepo.getReferencesForEntity("task", task.id);
    expect(refs).toHaveLength(1);
    expect(refs[0].entity_type).toBe("task");
    expect(refs[0].entity_id).toBe(task.id);
    expect(refs[0].document_id).toBe(doc.id);
    expect(refs[0].type).toBe("plan");
  });

  it("returns references for a project", () => {
    const project = createProject("Multi-ref project");
    const doc1 = createDocument("Ref doc 1");
    const doc2 = createDocument("Ref doc 2");

    docRefRepo.setReferencesForEntityDocument("project", project.id, doc1.id, ["goal"]);
    docRefRepo.setReferencesForEntityDocument("project", project.id, doc2.id, ["design"]);

    const refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);
    const types = refs.map((r) => r.type);
    expect(types).toContain("goal");
    expect(types).toContain("design");
  });

  it("returns references for a task", () => {
    const project = createProject("Task ref project");
    const task = createTask(project.id, "Task with refs");
    const doc = createDocument("Task ref doc");

    docRefRepo.setReferencesForEntityDocument("task", task.id, doc.id, ["plan", "note"]);

    const refs = docRefRepo.getReferencesForEntity("task", task.id);
    expect(refs).toHaveLength(2);
  });

  it("removes a specific reference for entity+document", () => {
    const project = createProject("Remove ref project");
    const doc1 = createDocument("Remove ref doc 1");
    const doc2 = createDocument("Remove ref doc 2");

    docRefRepo.setReferencesForEntityDocument("project", project.id, doc1.id, ["goal"]);
    docRefRepo.setReferencesForEntityDocument("project", project.id, doc2.id, ["design"]);

    docRefRepo.removeReferencesForEntityDocument("project", project.id, doc1.id);

    const refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(1);
    expect(refs[0].document_id).toBe(doc2.id);
  });

  it("removes all references for an entity", () => {
    const project = createProject("Remove all project");
    const doc1 = createDocument("Remove all doc 1");
    const doc2 = createDocument("Remove all doc 2");

    docRefRepo.setReferencesForEntityDocument("project", project.id, doc1.id, ["goal"]);
    docRefRepo.setReferencesForEntityDocument("project", project.id, doc2.id, ["design"]);

    docRefRepo.removeAllForEntity("project", project.id);

    const refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// All 6 reference types
// ---------------------------------------------------------------------------

describe("Document References - All 6 reference types", () => {
  it("supports all 6 reference types: goal, plan, requirements, design, reference, note", () => {
    const project = createProject("All types project");
    const allTypes: DocumentReferenceType[] = ["goal", "plan", "requirements", "design", "reference", "note"];

    // Create a separate document for each type
    for (const type of allTypes) {
      const doc = createDocument(`Doc for ${type}`);
      docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, [type]);
    }

    const refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(6);

    const foundTypes = refs.map((r) => r.type).sort();
    expect(foundTypes).toEqual([...allTypes].sort());
  });
});

// ---------------------------------------------------------------------------
// Multi-entity references
// ---------------------------------------------------------------------------

describe("Document References - Multi-entity", () => {
  it("same document referenced by multiple entities with different types", () => {
    const project = createProject("Shared doc project");
    const task = createTask(project.id, "Shared doc task");
    const doc = createDocument("Shared doc");

    docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal"]);
    docRefRepo.setReferencesForEntityDocument("task", task.id, doc.id, ["plan"]);

    const projectRefs = docRefRepo.getReferencesForEntity("project", project.id);
    const taskRefs = docRefRepo.getReferencesForEntity("task", task.id);

    expect(projectRefs).toHaveLength(1);
    expect(projectRefs[0].type).toBe("goal");
    expect(taskRefs).toHaveLength(1);
    expect(taskRefs[0].type).toBe("plan");

    // Reverse lookup: document has references from both entities
    const entities = docRefRepo.getEntitiesForDocument(doc.id);
    expect(entities).toHaveLength(2);
    const entityIds = entities.map((e) => e.entity_id);
    expect(entityIds).toContain(project.id);
    expect(entityIds).toContain(task.id);
  });

  it("same entity references multiple documents", () => {
    const project = createProject("Multi-doc project");
    const doc1 = createDocument("Multi-doc 1");
    const doc2 = createDocument("Multi-doc 2");
    const doc3 = createDocument("Multi-doc 3");

    docRefRepo.setReferencesForEntityDocument("project", project.id, doc1.id, ["goal"]);
    docRefRepo.setReferencesForEntityDocument("project", project.id, doc2.id, ["requirements"]);
    docRefRepo.setReferencesForEntityDocument("project", project.id, doc3.id, ["design"]);

    const refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(3);
    const docIds = refs.map((r) => r.document_id);
    expect(docIds).toContain(doc1.id);
    expect(docIds).toContain(doc2.id);
    expect(docIds).toContain(doc3.id);
  });

  it("same entity references same document with different types (allowed by composite PK)", () => {
    const project = createProject("Same doc diff types");
    const doc = createDocument("Multi-type doc");

    docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal", "reference"]);

    const refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);
    const types = refs.map((r) => r.type).sort();
    expect(types).toEqual(["goal", "reference"]);
  });
});

// ---------------------------------------------------------------------------
// Idempotent behavior
// ---------------------------------------------------------------------------

describe("Document References - Idempotency", () => {
  it("setReferencesForEntityDocument is idempotent (replaces existing types)", () => {
    const project = createProject("Idempotent project");
    const doc = createDocument("Idempotent doc");

    // Set initial references
    docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal", "plan"]);
    let refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);

    // Set same references again -- should not error or duplicate
    docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal", "plan"]);
    refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);

    // Set different references -- should replace
    docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["design"]);
    refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(1);
    expect(refs[0].type).toBe("design");
  });
});

// ---------------------------------------------------------------------------
// Merge-patch semantics (via service)
// ---------------------------------------------------------------------------

describe("Document References - Merge-patch via service", () => {
  it("array value replaces all types for that document", () => {
    const project = createProject("Merge-patch replace");
    const doc = createDocument("MP replace doc");

    // Initial set
    docRefService.applyMergePatch("project", project.id, {
      [doc.id]: [{ type: "goal" }, { type: "plan" }],
    });
    let refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(2);

    // Replace with different types
    docRefService.applyMergePatch("project", project.id, {
      [doc.id]: [{ type: "design" }],
    });
    refs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(refs).toHaveLength(1);
    expect(refs[0].type).toBe("design");
  });

  it("null value removes all references to that document", () => {
    const project = createProject("Merge-patch null");
    const doc = createDocument("MP null doc");

    docRefService.applyMergePatch("project", project.id, {
      [doc.id]: [{ type: "goal" }],
    });
    expect(docRefRepo.getReferencesForEntity("project", project.id)).toHaveLength(1);

    // null removes references
    docRefService.applyMergePatch("project", project.id, {
      [doc.id]: null,
    });
    expect(docRefRepo.getReferencesForEntity("project", project.id)).toHaveLength(0);
  });

  it("absent key leaves references untouched", () => {
    const project = createProject("Merge-patch absent");
    const doc1 = createDocument("MP absent doc 1");
    const doc2 = createDocument("MP absent doc 2");

    // Set up references for both docs
    docRefService.applyMergePatch("project", project.id, {
      [doc1.id]: [{ type: "goal" }],
      [doc2.id]: [{ type: "plan" }],
    });
    expect(docRefRepo.getReferencesForEntity("project", project.id)).toHaveLength(2);

    // Update only doc2; doc1 should be untouched
    docRefService.applyMergePatch("project", project.id, {
      [doc2.id]: [{ type: "note" }],
    });
    const refs = docRefRepo.getReferencesForEntity("project", project.id);
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
  it("deleting a document removes all its references (FK CASCADE)", () => {
    const project = createProject("Cascade project");
    const task = createTask(project.id, "Cascade task");
    const doc = createDocument("Cascade doc", "Will be deleted");

    docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal"]);
    docRefRepo.setReferencesForEntityDocument("task", task.id, doc.id, ["plan"]);

    // Verify references exist
    expect(docRefRepo.getEntitiesForDocument(doc.id)).toHaveLength(2);

    // Delete the document via service
    ctx.documentService.remove([doc.id]);

    // References should be gone due to CASCADE
    expect(docRefRepo.getEntitiesForDocument(doc.id)).toHaveLength(0);
    // Entity-side queries should also show no references for that doc
    const projectRefs = docRefRepo.getReferencesForEntity("project", project.id);
    expect(projectRefs.every((r) => r.document_id !== doc.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Validation (via service)
// ---------------------------------------------------------------------------

describe("Document References - Validation", () => {
  it("rejects invalid reference type (should throw 400)", () => {
    const project = createProject("Invalid type project");
    const doc = createDocument("Valid doc for bad type");

    expect(() =>
      docRefService.applyMergePatch("project", project.id, {
        [doc.id]: [{ type: "bogus" as DocumentReferenceType }],
      }),
    ).toThrow(ServiceError);

    try {
      docRefService.applyMergePatch("project", project.id, {
        [doc.id]: [{ type: "invalid" as DocumentReferenceType }],
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceError);
      expect((err as ServiceError).statusCode).toBe(400);
    }
  });

  it("rejects reference to nonexistent document (should throw 404)", () => {
    const project = createProject("Missing doc project");

    expect(() =>
      docRefService.applyMergePatch("project", project.id, {
        "nonexistent-doc-id": [{ type: "goal" }],
      }),
    ).toThrow(ServiceError);

    try {
      docRefService.applyMergePatch("project", project.id, {
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
  it("getReferencesForEntityWithDocumentTitles returns document_id, document_title, type (not full content)", () => {
    const project = createProject("Query pattern project");
    const doc = createDocument("Query doc", "This content should NOT appear in summaries");

    docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["goal"]);

    const summaries = docRefRepo.getReferencesForEntityWithDocumentTitles("project", project.id);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].document_id).toBe(doc.id);
    expect(summaries[0].document_title).toBe("Query doc");
    expect(summaries[0].type).toBe("goal");

    // Ensure no content field leaked
    const keys = Object.keys(summaries[0]);
    expect(keys).not.toContain("content");
  });

  it("getEntitiesForDocument returns reverse lookup", () => {
    const project = createProject("Reverse lookup project");
    const task = createTask(project.id, "Reverse lookup task");
    const doc = createDocument("Reverse doc");

    docRefRepo.setReferencesForEntityDocument("project", project.id, doc.id, ["requirements"]);
    docRefRepo.setReferencesForEntityDocument("task", task.id, doc.id, ["reference"]);

    const entities = docRefRepo.getEntitiesForDocument(doc.id);
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

  it("getReferencesForEntities returns batch results for multiple entities", () => {
    const project1 = createProject("Batch query project 1");
    const project2 = createProject("Batch query project 2");
    const doc = createDocument("Batch query doc");

    docRefRepo.setReferencesForEntityDocument("project", project1.id, doc.id, ["goal"]);
    docRefRepo.setReferencesForEntityDocument("project", project2.id, doc.id, ["design"]);

    const result = docRefRepo.getReferencesForEntities("project", [project1.id, project2.id]);
    expect(result.size).toBe(2);

    const p1Refs = result.get(project1.id);
    const p2Refs = result.get(project2.id);
    expect(p1Refs).toHaveLength(1);
    expect(p1Refs?.[0].type).toBe("goal");
    expect(p2Refs).toHaveLength(1);
    expect(p2Refs?.[0].type).toBe("design");
  });

  it("service getReferencesForEntity returns summaries with document titles", () => {
    const project = createProject("Service query project");
    const doc = createDocument("Service query doc", "Content that should not appear");

    docRefService.applyMergePatch("project", project.id, {
      [doc.id]: [{ type: "note" }],
    });

    const summaries = docRefService.getReferencesForEntity("project", project.id);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].document_id).toBe(doc.id);
    expect(summaries[0].document_title).toBe("Service query doc");
    expect(summaries[0].type).toBe("note");
    expect(Object.keys(summaries[0])).not.toContain("content");
  });
});
