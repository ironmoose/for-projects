import type { EntityAction, ActionStatus } from "../entities";
import type { CreateEntityActionInput } from "../inputs";
import type { IEntityActionService } from "../services";
import { ServiceError } from "../errors";
import type { EntityActionRepository } from "../repositories/entity-actions";
import type { ActionRepository } from "../repositories/actions";
import type { ProjectRepository } from "../repositories/projects";
import type { TaskRepository } from "../repositories/tasks";
import type { EventBus } from "../events";

const VALID_ROLES_BY_ENTITY: Record<string, string[]> = {
  project: ['goal', 'design', 'requirements'],
  task: ['implementation', 'validation'],
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  todo: ['in_progress'],
  in_progress: ['complete', 'failed'],
  complete: [],
  failed: ['todo'],
};

export class EntityActionService implements IEntityActionService {
  constructor(
    private entityActionRepo: EntityActionRepository,
    private actionRepo: ActionRepository,
    private projectRepo: ProjectRepository,
    private taskRepo: TaskRepository,
    private eventBus?: EventBus,
  ) {}

  link(input: CreateEntityActionInput): EntityAction {
    const validTypes = Object.keys(VALID_ROLES_BY_ENTITY);
    if (!validTypes.includes(input.entity_type)) {
      throw new ServiceError(`entity_type must be one of: ${validTypes.join(", ")}`, 400);
    }

    const validRoles = VALID_ROLES_BY_ENTITY[input.entity_type];
    if (!validRoles.includes(input.role)) {
      throw new ServiceError(`role must be one of: ${validRoles.join(", ")} for ${input.entity_type}`, 400);
    }

    if (input.entity_type === 'project') {
      const project = this.projectRepo.findById(input.entity_id);
      if (!project) throw new ServiceError(`project not found: ${input.entity_id}`, 404);
    } else {
      const task = this.taskRepo.findById(input.entity_id);
      if (!task) throw new ServiceError(`task not found: ${input.entity_id}`, 404);
    }

    const action = this.actionRepo.findById(input.action_id);
    if (!action) throw new ServiceError(`action not found: ${input.action_id}`, 404);

    const now = new Date().toISOString();
    const status = input.status ?? 'todo';

    try {
      this.entityActionRepo.link({
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        role: input.role,
        action_id: input.action_id,
        status,
        output: null,
        created_at: now,
        updated_at: now,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
        throw new ServiceError("entity action already exists for this entity and role", 409);
      }
      throw err;
    }

    const entityAction = this.entityActionRepo.findByEntityAndRole(input.entity_type, input.entity_id, input.role)!;
    this.eventBus?.emit({ entity: "entity_action", action: "linked", payload: entityAction });
    return entityAction;
  }

  unlink(entity_type: string, entity_id: string, role: string): boolean {
    const validTypes = Object.keys(VALID_ROLES_BY_ENTITY);
    if (!validTypes.includes(entity_type)) {
      throw new ServiceError(`entity_type must be one of: ${validTypes.join(", ")}`, 400);
    }

    const validRoles = VALID_ROLES_BY_ENTITY[entity_type];
    if (!validRoles.includes(role)) {
      throw new ServiceError(`role must be one of: ${validRoles.join(", ")} for ${entity_type}`, 400);
    }

    const deleted = this.entityActionRepo.unlink(entity_type, entity_id, role);
    if (deleted) {
      this.eventBus?.emit({ entity: "entity_action", action: "unlinked", payload: { entity_type, entity_id, role } });
    }
    return deleted;
  }

  updateStatus(entity_type: string, entity_id: string, role: string, status: ActionStatus): EntityAction {
    const existing = this.entityActionRepo.findByEntityAndRole(entity_type, entity_id, role);
    if (!existing) {
      throw new ServiceError("entity action not found", 404);
    }

    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(status)) {
      throw new ServiceError(`invalid status transition: ${existing.status} → ${status}`, 400);
    }

    const now = new Date().toISOString();
    const updated = this.entityActionRepo.updateStatus(entity_type, entity_id, role, status, now)!;
    this.eventBus?.emit({ entity: "entity_action", action: "status_changed", payload: updated });
    return updated;
  }

  updateOutput(entity_type: string, entity_id: string, role: string, output: string | null): EntityAction {
    const existing = this.entityActionRepo.findByEntityAndRole(entity_type, entity_id, role);
    if (!existing) {
      throw new ServiceError("entity action not found", 404);
    }

    const now = new Date().toISOString();
    const updated = this.entityActionRepo.updateOutput(entity_type, entity_id, role, output, now)!;
    this.eventBus?.emit({ entity: "entity_action", action: "updated", payload: updated });
    return updated;
  }

  findByEntity(entity_type: string, entity_id: string): EntityAction[] {
    return this.entityActionRepo.findByEntity(entity_type, entity_id);
  }

  findByEntityAndRole(entity_type: string, entity_id: string, role: string): EntityAction | null {
    return this.entityActionRepo.findByEntityAndRole(entity_type, entity_id, role);
  }
}
