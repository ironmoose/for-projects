import type { ProjectDocumentDetail } from "../entities";
import type { IProjectDocumentService } from "../services";
import { ServiceError } from "../errors";
import type {
  IProjectDocumentRepository,
  IDocumentRepository,
  IActivityLogRepository,
} from "../repositories/interfaces";
import type { EventBus } from "../events";

export class ProjectDocumentService implements IProjectDocumentService {
  constructor(
    private projectDocRepo: IProjectDocumentRepository,
    private documentRepo: IDocumentRepository,
    private activityLog: IActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  async validateMergePatch(documents: Record<string, true | null>): Promise<void> {
    for (const [documentId, value] of Object.entries(documents)) {
      if (value === null) continue; // null means unlink — no existence check needed
      if (value !== true) {
        throw new ServiceError(
          `invalid documents patch value for "${documentId}": expected true or null`,
          400,
        );
      }
      const doc = await this.documentRepo.findById(documentId);
      if (!doc) {
        throw new ServiceError(`document not found: ${documentId}`, 404);
      }
    }
  }

  async applyMergePatch(
    projectId: string,
    documents: Record<string, true | null>,
  ): Promise<void> {
    const documentIds = Object.keys(documents);
    if (documentIds.length === 0) return;

    await this.validateMergePatch(documents);

    const toLink: string[] = [];
    for (const documentId of documentIds) {
      const value = documents[documentId];
      if (value === null) {
        await this.projectDocRepo.unlinkDocument(projectId, documentId);
      } else {
        toLink.push(documentId);
      }
    }
    if (toLink.length > 0) {
      await this.projectDocRepo.linkDocuments(projectId, toLink);
    }

    await this.activityLog.insert({
      entity_type: "project",
      entity_id: projectId,
      action: "updated",
      summary: JSON.stringify({ fields: ["documents"] }),
    });

    this.eventBus.emit({ type: "updated", entity_type: "project", ids: [projectId] });
  }

  async findByProject(projectId: string): Promise<ProjectDocumentDetail[]> {
    return this.projectDocRepo.findDetailsForProject(projectId);
  }

  async removeAllForProject(projectId: string): Promise<void> {
    await this.projectDocRepo.removeAllForProject(projectId);
  }

  async removeAllForDocument(documentId: string): Promise<void> {
    await this.projectDocRepo.removeAllForDocument(documentId);
  }
}
