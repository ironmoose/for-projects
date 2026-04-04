import type { DocumentReference, DocumentReferenceSummary, DocumentReferenceType, EntityType } from "../entities";
import { DOCUMENT_REFERENCE_TYPES } from "../entities";
import type { IDocumentReferenceService } from "../services";
import { ServiceError } from "../errors";
import type { DocumentReferenceRepository } from "../repositories/document-references";
import type { DocumentRepository } from "../repositories/documents";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

export class DocumentReferenceService implements IDocumentReferenceService {
  constructor(
    private docRefRepo: DocumentReferenceRepository,
    private documentRepo: DocumentRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  applyMergePatch(
    entityType: EntityType,
    entityId: string,
    documents: Record<string, { type: DocumentReferenceType }[] | null>,
  ): void {
    const documentIds = Object.keys(documents);
    if (documentIds.length === 0) return;

    for (const documentId of documentIds) {
      const value = documents[documentId];

      if (value === null) {
        // null means remove all references for this entity+document pair
        this.docRefRepo.removeReferencesForEntityDocument(entityType, entityId, documentId);
        continue;
      }

      // Validate each entry's type
      for (const entry of value) {
        if (!(DOCUMENT_REFERENCE_TYPES as readonly string[]).includes(entry.type)) {
          throw new ServiceError(
            `invalid reference type "${entry.type}". Valid types: ${DOCUMENT_REFERENCE_TYPES.join(", ")}`,
            400,
          );
        }
      }

      // Validate document exists
      const doc = this.documentRepo.findById(documentId);
      if (!doc) {
        throw new ServiceError(`document not found: ${documentId}`, 404);
      }

      // Extract types and set references (full replacement for this entity+document pair)
      const types = value.map((e) => e.type);
      this.docRefRepo.setReferencesForEntityDocument(entityType, entityId, documentId, types);
    }

    // Log activity on the entity
    this.activityLog.insert({
      entity_type: entityType,
      entity_id: entityId,
      action: "updated",
      summary: JSON.stringify({ fields: ["documents"] }),
    });

    // Emit WebSocket event for the entity type
    this.eventBus.emit({ type: "updated", entity_type: entityType, ids: [entityId] });
  }

  getReferencesForEntity(entityType: EntityType, entityId: string): DocumentReferenceSummary[] {
    return this.docRefRepo.getReferencesForEntityWithDocumentTitles(entityType, entityId);
  }

  getEntitiesForDocument(documentId: string): DocumentReference[] {
    return this.docRefRepo.getEntitiesForDocument(documentId);
  }

  removeAllForEntity(entityType: EntityType, entityId: string): void {
    this.docRefRepo.removeAllForEntity(entityType, entityId);
  }

  removeAllForDocument(documentId: string): void {
    this.docRefRepo.removeAllForDocument(documentId);
  }
}
