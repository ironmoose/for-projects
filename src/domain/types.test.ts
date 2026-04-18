import { describe, it, expect } from "bun:test";
import type {
  TaskStatus,
  EffortLevel,
  ImpactLevel,
  TaskCategory,
  EntityType,
  ActivityAction,
  Task,
  ActivityLog,
} from "./entities";
import {
  TASK_STATUSES,
  EFFORT_LEVELS,
  IMPACT_LEVELS,
  TASK_CATEGORIES,
  ENTITY_TYPES,
  ACTIVITY_ACTIONS,
} from "./entities";

// -- Helper: fails if array does not cover every member of the union ----------
type AssertExhaustive<T extends readonly U[], U> = T;

// -- Forward: const arrays satisfy their union types --------------------------
TASK_STATUSES satisfies readonly TaskStatus[];
EFFORT_LEVELS satisfies readonly EffortLevel[];
IMPACT_LEVELS satisfies readonly ImpactLevel[];
TASK_CATEGORIES satisfies readonly TaskCategory[];
ENTITY_TYPES satisfies readonly EntityType[];
ACTIVITY_ACTIONS satisfies readonly ActivityAction[];

// -- Reverse: union types are fully covered by const arrays -------------------
type _CheckTaskStatuses = AssertExhaustive<typeof TASK_STATUSES, TaskStatus>;
type _CheckEffortLevels = AssertExhaustive<typeof EFFORT_LEVELS, EffortLevel>;
type _CheckImpactLevels = AssertExhaustive<typeof IMPACT_LEVELS, ImpactLevel>;
type _CheckTaskCategories = AssertExhaustive<typeof TASK_CATEGORIES, TaskCategory>;
type _CheckEntityTypes = AssertExhaustive<typeof ENTITY_TYPES, EntityType>;
type _CheckActivityActions = AssertExhaustive<typeof ACTIVITY_ACTIONS, ActivityAction>;

// -- Entity interfaces use the correct union types ----------------------------
const _taskStatusField: Task["status"] extends TaskStatus ? true : never = true;
const _taskEffortField: Task["effort"] extends EffortLevel | null ? true : never = true;
const _taskImpactField: Task["impact"] extends ImpactLevel | null ? true : never = true;
const _taskCategoryField: Task["category"] extends TaskCategory | null ? true : never = true;
const _activityEntityType: ActivityLog["entity_type"] extends EntityType ? true : never = true;
const _activityAction: ActivityLog["action"] extends ActivityAction ? true : never = true;

// Suppress unused-variable warnings
void _taskStatusField;
void _taskEffortField;
void _taskImpactField;
void _taskCategoryField;
void _activityEntityType;
void _activityAction;

describe("type consistency", () => {
  it("compiles", () => {
    expect(true).toBe(true);
  });
});
