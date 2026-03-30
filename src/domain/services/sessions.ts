import type { Session } from "../entities";
import type { CreateSessionInput, UpdateSessionInput } from "../inputs";
import type { ISessionService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { SessionRepository } from "../repositories/sessions";
import type { ProjectRepository } from "../repositories/projects";
import type { EventBus } from "../events";

export class SessionService implements ISessionService {
  constructor(
    private sessionRepo: SessionRepository,
    private projectRepo: ProjectRepository,
    private eventBus: EventBus,
  ) {}

  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string }): Paginated<Session> {
    return {
      data: this.sessionRepo.findMany(filter),
      total: this.sessionRepo.count(filter),
    };
  }

  get(id: string): Session {
    const session = this.sessionRepo.findById(id);
    if (!session) throw new ServiceError("session not found", 404);
    return session;
  }

  create(inputs: CreateSessionInput[]): Session[] {
    for (const input of inputs) {
      const project = this.projectRepo.findById(input.project_id);
      if (!project) {
        throw new ServiceError(`project not found: ${input.project_id}`, 404);
      }
    }

    const now = new Date().toISOString();
    const rows = inputs.map((input) => ({
      project_id: input.project_id,
      summary: null,
      started_at: now,
      finished_at: null,
    }));

    const sessions = this.sessionRepo.insertMany(rows);
    this.eventBus.emit({ type: "created", entity_type: "session", payload: sessions });
    return sessions;
  }

  update(inputs: UpdateSessionInput[]): Session[] {
    for (const input of inputs) {
      const existing = this.sessionRepo.findById(input.id);
      if (!existing) throw new ServiceError(`session not found: ${input.id}`, 404);

      if (input.summary !== undefined && input.summary !== null && input.summary.length > 50000) {
        throw new ServiceError("summary must be 50000 characters or fewer", 400);
      }
    }

    const sessions = this.sessionRepo.updateMany(inputs);
    this.eventBus.emit({ type: "updated", entity_type: "session", payload: sessions });
    return sessions;
  }

  remove(ids: string[]): void {
    this.sessionRepo.deleteMany(ids);
    this.eventBus.emit({ type: "deleted", entity_type: "session", ids });
  }
}
