import { semantic as t } from "@4lt7ab/ui/core";

// ---------------------------------------------------------------------------
// Badge helpers — map domain statuses to library Badge variant/color props
// ---------------------------------------------------------------------------

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

/** Map a task status to a library Badge variant. */
export function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "in_progress": return "warning";
    case "done": return "success";
    case "archived":
    case "todo":
    default: return "default";
  }
}

/** Map an activity log action to a library Badge color token. */
export function actionBadgeColor(action: string): string | undefined {
  switch (action) {
    case "created": return t.colorSuccess;
    case "updated": return t.colorActionPrimary;
    case "deleted": return t.colorActionDestructive;
    default: return undefined;
  }
}

/** Map a domain variant name to a library Badge color token. */
export function badgeColor(variant: string): string | undefined {
  switch (variant) {
    case "active":
    case "running": return t.colorActionPrimary;
    case "complete":
    case "done": return t.colorSuccess;
    case "failed": return t.colorActionDestructive;
    case "in_progress":
    case "warning": return t.colorWarning;
    default: return undefined;
  }
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/**
 * Format an ISO 8601 date string into a human-readable short format.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format an ISO 8601 date string into a relative time label like "2m ago".
 */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
