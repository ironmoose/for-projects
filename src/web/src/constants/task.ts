/**
 * Task display constants — colors, labels, and icons for rendering task metadata.
 *
 * Shared across TasksPage and ProjectDetailPage. These are display-layer mappings
 * only — the canonical status/category values live in types/.
 */

import { semantic as t } from "@4lt7ab/ui/core";

/** Status → theme color token for StatusDot, text, and borders. */
export const STATUS_COLORS: Record<string, string> = {
  todo: t.colorTextMuted,
  in_progress: t.colorWarning,
  done: t.colorSuccess,
  archived: t.colorTextSecondary,
};

/** Status → human-readable label. */
export const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  archived: "Archived",
};

/** Category → Material icon name. */
export const CATEGORY_ICONS: Record<string, string> = {
  feature: "lightbulb",
  bugfix: "bug_report",
  refactor: "construction",
  test: "science",
  perf: "speed",
  infra: "dns",
  docs: "description",
  security: "shield",
  design: "palette",
  chore: "build",
};
