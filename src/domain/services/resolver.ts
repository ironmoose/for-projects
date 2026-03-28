import { parseArn, type ArnResourceType, type EntityResolverMap } from "../arn";
import type { Instruction, Task, Project, Workflow, Phase, ResolvedEntity, ResolvedSection, ResolvedInstruction } from "../entities";
import type { IBindingService, IResolverService, ResolveOptions } from "../services";
import { ServiceError } from "../errors";

const DEFAULT_MAX_SECTION_LENGTH = 10_000;

/**
 * Derive a section header from the ARN resource type.
 * Isolated so it can be extended for new types without touching resolution logic.
 */
function sectionHeaderForType(type: ArnResourceType): string {
  switch (type) {
    case "task": return "Task";
    case "instruction": return "Context";
    case "project": return "Goal";
    case "workflow": return "Workflow";
    case "phase": return "Phase";
  }
}

/**
 * Render an entity into section content based on its ARN type.
 * Returns the markdown body for the section.
 */
function renderSectionContent(type: ArnResourceType, entity: unknown): string {
  switch (type) {
    case "task": {
      const task = entity as Task;
      return `# ${task.title}\n\nStatus: ${task.status}\n\n${task.description}`;
    }
    case "instruction": {
      const instruction = entity as Instruction;
      if (instruction.output === null) {
        return "Output not yet available.";
      }
      return instruction.output;
    }
    case "project": {
      const project = entity as Project;
      return `# ${project.name}\n\n${project.description}`;
    }
    case "workflow": {
      const workflow = entity as Workflow;
      return `# ${workflow.goal}\n\nStatus: ${workflow.status}`;
    }
    case "phase": {
      const phase = entity as Phase;
      return `# ${phase.title}`;
    }
  }
}

/**
 * Truncate content to maxLength characters, appending a notice if truncated.
 */
function truncate(content: string, maxLength: number): { content: string; truncated: boolean } {
  if (content.length <= maxLength) {
    return { content, truncated: false };
  }
  const truncated = content.slice(0, maxLength) + `\n\n[Truncated — original length: ${content.length} characters]`;
  return { content: truncated, truncated: true };
}

export class ResolverService implements IResolverService {
  constructor(
    private readonly bindingService: IBindingService,
    private readonly entityResolvers: EntityResolverMap,
  ) {}

  resolve(arns: string[]): ResolvedEntity[] {
    return arns.map((arn) => this.resolveOne(arn));
  }

  compilePrompt(instructionId: string, options?: ResolveOptions): ResolvedInstruction {
    const maxSectionLength = options?.maxSectionLength ?? DEFAULT_MAX_SECTION_LENGTH;

    // Look up the instruction directly via the entity resolver
    const instructionResolver = this.entityResolvers.instruction;
    if (!instructionResolver) {
      throw new ServiceError("No resolver registered for instruction type", 500);
    }

    const instruction = instructionResolver(instructionId) as Instruction | null;
    if (!instruction) {
      throw new ServiceError("Instruction not found", 404);
    }

    const bindings = this.bindingService.findByInstruction(instructionId);
    const sections: ResolvedSection[] = [];
    const warnings: string[] = [];

    // Future optimization point: group bindings by ARN type for batch lookups
    for (const binding of bindings) {
      let parsed: { type: ArnResourceType; id: string };
      try {
        parsed = parseArn(binding.arn);
      } catch {
        warnings.push(`Binding ${binding.arn} has invalid ARN format — skipped`);
        continue;
      }

      const resolver = this.entityResolvers[parsed.type];
      if (!resolver) {
        warnings.push(`Unsupported ARN type "${parsed.type}" for binding ${binding.arn} — skipped`);
        continue;
      }

      const entity = resolver(parsed.id);
      if (entity === null || entity === undefined) {
        // Tombstone section for dangling ARN
        warnings.push(`Binding ${binding.arn} resolved to null — resource may have been deleted`);
        sections.push({
          arn: binding.arn,
          type: parsed.type,
          header: sectionHeaderForType(parsed.type),
          content: `_The bound resource (${binding.arn}) no longer exists._`,
          truncated: false,
        });
        continue;
      }

      // Check for instruction with null output
      if (parsed.type === "instruction" && (entity as Instruction).output === null) {
        warnings.push(`Binding ${binding.arn} has no output — instruction may not have executed yet`);
      }

      const rawContent = renderSectionContent(parsed.type, entity);
      const { content, truncated } = truncate(rawContent, maxSectionLength);

      sections.push({
        arn: binding.arn,
        type: parsed.type,
        header: sectionHeaderForType(parsed.type),
        content,
        truncated,
      });
    }

    return { instruction, sections, warnings };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private resolveOne(arn: string): ResolvedEntity {
    let parsed: { type: ArnResourceType; id: string };
    try {
      parsed = parseArn(arn);
    } catch (err) {
      return {
        arn,
        type: null,
        data: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const resolver = this.entityResolvers[parsed.type];
    if (!resolver) {
      return {
        arn,
        type: parsed.type,
        data: null,
        error: `No resolver registered for type "${parsed.type}"`,
      };
    }

    const data = (resolver(parsed.id) ?? null) as ResolvedEntity["data"];

    const result: ResolvedEntity = { arn, type: parsed.type, data };

    // For instructions, also fetch bindings
    if (parsed.type === "instruction" && data !== null) {
      result.bindings = this.bindingService.findByInstruction(parsed.id);
    }

    return result;
  }
}
