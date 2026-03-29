import type { EntityAction, ActionRole, StartedActionResult, RunnerActionResult, Project, Task } from "../entities";
import type { IRunnerService } from "../services";
import { ServiceError } from "../errors";
import type { EntityActionRepository } from "../repositories/entity-actions";
import type { ActionRepository } from "../repositories/actions";
import type { ProjectRepository } from "../repositories/projects";
import type { TaskRepository } from "../repositories/tasks";
import type { EventBus } from "../events";

const ROLE_ORDER: Record<string, ActionRole[]> = {
  project: ['goal', 'design', 'requirements'],
  task: ['implementation', 'validation'],
};

const STALE_CLAIM_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class RunnerService implements IRunnerService {
  constructor(
    private entityActionRepo: EntityActionRepository,
    private actionRepo: ActionRepository,
    private projectRepo: ProjectRepository,
    private taskRepo: TaskRepository,
    private eventBus?: EventBus,
  ) {}

  start(): StartedActionResult {
    this.reapStaleClaims();

    const candidate = this.findNextCandidate();
    if (!candidate) {
      throw new ServiceError("no eligible action to start", 404);
    }

    const now = new Date().toISOString();
    const claimed = this.entityActionRepo.claimNext(
      candidate.entity_type,
      candidate.entity_id,
      candidate.role,
      now,
    );

    if (!claimed) {
      throw new ServiceError("no eligible action to start", 404);
    }

    this.eventBus?.emit({ entity: "entity_action", action: "status_changed", payload: claimed });

    const prompt = this.compilePrompt(claimed);
    return {
      entity_type: claimed.entity_type,
      entity_id: claimed.entity_id,
      role: claimed.role,
      prompt,
    };
  }

  complete(entity_type: string, entity_id: string, role: string, output: string): RunnerActionResult {
    const existing = this.entityActionRepo.findByEntityAndRole(entity_type, entity_id, role);
    if (!existing) {
      throw new ServiceError("entity action not found", 404);
    }
    if (existing.status !== 'in_progress') {
      throw new ServiceError(`cannot complete action with status '${existing.status}' — must be in_progress`, 400);
    }

    const now = new Date().toISOString();
    this.entityActionRepo.updateOutput(entity_type, entity_id, role, output, now);
    const updated = this.entityActionRepo.updateStatus(entity_type, entity_id, role, 'complete', now)!;

    this.eventBus?.emit({ entity: "entity_action", action: "status_changed", payload: updated });
    return { entity_type: updated.entity_type, entity_id: updated.entity_id, role: updated.role, status: updated.status };
  }

  fail(entity_type: string, entity_id: string, role: string, output?: string): RunnerActionResult {
    const existing = this.entityActionRepo.findByEntityAndRole(entity_type, entity_id, role);
    if (!existing) {
      throw new ServiceError("entity action not found", 404);
    }
    if (existing.status !== 'in_progress') {
      throw new ServiceError(`cannot fail action with status '${existing.status}' — must be in_progress`, 400);
    }

    const now = new Date().toISOString();
    if (output !== undefined) {
      this.entityActionRepo.updateOutput(entity_type, entity_id, role, output, now);
    }
    const updated = this.entityActionRepo.updateStatus(entity_type, entity_id, role, 'failed', now)!;

    this.eventBus?.emit({ entity: "entity_action", action: "status_changed", payload: updated });
    return { entity_type: updated.entity_type, entity_id: updated.entity_id, role: updated.role, status: updated.status };
  }

  // ---------------------------------------------------------------------------
  // Stale claim recovery
  // ---------------------------------------------------------------------------

  private reapStaleClaims(): void {
    const now = new Date();
    const cutoff = new Date(now.getTime() - STALE_CLAIM_TTL_MS).toISOString();
    const reverted = this.entityActionRepo.revertStale(cutoff, now.toISOString());

    for (const ea of reverted) {
      this.eventBus?.emit({ entity: "entity_action", action: "status_changed", payload: ea });
    }
  }

  // ---------------------------------------------------------------------------
  // Candidate selection
  // ---------------------------------------------------------------------------

  private findNextCandidate(): EntityAction | null {
    const todos = this.entityActionRepo.findAll(100, 0, { status: 'todo' });

    for (const ea of todos) {
      if (this.dependenciesMet(ea)) return ea;
    }

    return null;
  }

  private dependenciesMet(ea: EntityAction): boolean {
    const roles = ROLE_ORDER[ea.entity_type];
    if (!roles) return true;

    const myIndex = roles.indexOf(ea.role);
    if (myIndex <= 0) return true;

    const siblings = this.entityActionRepo.findByEntity(ea.entity_type, ea.entity_id);
    const statusByRole = new Map(siblings.map((s) => [s.role, s.status]));

    for (let i = 0; i < myIndex; i++) {
      const predStatus = statusByRole.get(roles[i]);
      if (predStatus !== 'complete') return false;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Prompt compilation
  // ---------------------------------------------------------------------------

  private compilePrompt(ea: EntityAction): string {
    const action = this.actionRepo.findById(ea.action_id);
    if (!action) {
      throw new ServiceError(`action not found: ${ea.action_id}`, 500);
    }

    const sections: string[] = [];

    // --- Context: the subject matter ---
    if (ea.entity_type === 'task') {
      const task = this.taskRepo.findById(ea.entity_id) as Task | null;
      if (!task) throw new ServiceError(`task not found: ${ea.entity_id}`, 500);

      const project = this.projectRepo.findById(task.project_id) as Project | null;
      if (project) {
        sections.push(`# Project: ${project.name}`);
        if (project.description) {
          sections.push(project.description);
        }
      }

      sections.push(`# Task: ${task.summary}`);
      if (task.context) {
        sections.push(task.context);
      }
    } else {
      const project = this.projectRepo.findById(ea.entity_id) as Project | null;
      if (!project) throw new ServiceError(`project not found: ${ea.entity_id}`, 500);

      sections.push(`# Project: ${project.name}`);
      if (project.description) {
        sections.push(project.description);
      }
    }

    // --- Prior work: completed predecessor outputs ---
    const priorWork = this.gatherPriorWork(ea);
    if (priorWork.length > 0) {
      sections.push('# Prior Work');
      for (const pw of priorWork) {
        sections.push(`## ${pw.role}`);
        sections.push(pw.output);
      }
    }

    // --- The assignment: the action prompt ---
    sections.push('# Assignment');
    sections.push(action.prompt);

    return sections.join('\n\n');
  }

  private gatherPriorWork(ea: EntityAction): { role: string; output: string }[] {
    const roles = ROLE_ORDER[ea.entity_type];
    if (!roles) return [];

    const myIndex = roles.indexOf(ea.role);
    if (myIndex <= 0) return [];

    const siblings = this.entityActionRepo.findByEntity(ea.entity_type, ea.entity_id);
    const byRole = new Map(siblings.map((s) => [s.role, s]));

    const results: { role: string; output: string }[] = [];
    for (let i = 0; i < myIndex; i++) {
      const sibling = byRole.get(roles[i]);
      if (sibling?.status === 'complete' && sibling.output) {
        results.push({ role: sibling.role, output: sibling.output });
      }
    }

    return results;
  }
}
