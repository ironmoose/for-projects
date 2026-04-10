import type { DocumentReference, DocumentReferenceSummary, DocumentReferenceDetail, DocumentReferenceType, EntityType } from "../entities";
import { DOCUMENT_REFERENCE_TYPES } from "../entities";
import type { IDocumentReferenceService } from "../services";
import { ServiceError } from "../errors";
import type { IDocumentReferenceRepository, IDocumentRepository, IActivityLogRepository } from "../repositories/interfaces";
import type { EventBus } from "../events";

export class DocumentReferenceService implements IDocumentReferenceService {
  constructor(
    private docRefRepo: IDocumentReferenceRepository,
    private documentRepo: IDocumentRepository,
    private activityLog: IActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  async validateMergePatch(
    documents: Record<string, { type: DocumentReferenceType }[] | null>,
  ): Promise<void> {
    for (const [documentId, value] of Object.entries(documents)) {
      if (value === null) continue; // null means remove — no validation needed

      for (const entry of value) {
        if (!(DOCUMENT_REFERENCE_TYPES as readonly string[]).includes(entry.type)) {
          throw new ServiceError(
            `invalid reference type "${entry.type}". Valid types: ${DOCUMENT_REFERENCE_TYPES.join(", ")}`,
            400,
          );
        }
      }

      const doc = await this.documentRepo.findById(documentId);
      if (!doc) {
        throw new ServiceError(`document not found: ${documentId}`, 404);
      }
    }
  }

  async applyMergePatch(
    entityType: EntityType,
    entityId: string,
    documents: Record<string, { type: DocumentReferenceType }[] | null>,
  ): Promise<void> {
    const documentIds = Object.keys(documents);
    if (documentIds.length === 0) return;

    await this.validateMergePatch(documents);

    for (const documentId of documentIds) {
      const value = documents[documentId];

      if (value === null) {
        // null means remove all references for this entity+document pair
        await this.docRefRepo.removeReferencesForEntityDocument(entityType, entityId, documentId);
        continue;
      }

      // Extract types and set references (full replacement for this entity+document pair)
      const types = value.map((e) => e.type);
      await this.docRefRepo.setReferencesForEntityDocument(entityType, entityId, documentId, types);
    }

    // Log activity on the entity
    await this.activityLog.insert({
      entity_type: entityType,
      entity_id: entityId,
      action: "updated",
      summary: JSON.stringify({ fields: ["documents"] }),
    });

    // Emit WebSocket event for the entity type
    this.eventBus.emit({ type: "updated", entity_type: entityType, ids: [entityId] });
  }

  async getReferencesForEntity(entityType: EntityType, entityId: string): Promise<DocumentReferenceSummary[]> {
    return await this.docRefRepo.getReferencesForEntityWithDocumentTitles(entityType, entityId);
  }

  async findByEntity(entityType: EntityType, entityId: string): Promise<DocumentReferenceDetail[]> {
    return await this.docRefRepo.findByEntity(entityType, entityId);
  }

  async getEntitiesForDocument(documentId: string): Promise<DocumentReference[]> {
    return await this.docRefRepo.getEntitiesForDocument(documentId);
  }

  async removeAllForEntity(entityType: EntityType, entityId: string): Promise<void> {
    await this.docRefRepo.removeAllForEntity(entityType, entityId);
  }

  async removeAllForDocument(documentId: string): Promise<void> {
    await this.docRefRepo.removeAllForDocument(documentId);
  }
}
