import { semantic as t, KEYFRAMES } from "@4lt7ab/ui/core";
import type { CSSProperties } from "react";

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

/**
 * Format an ISO 8601 date string as a human-friendly relative label.
 *
 * Returns "just now" for <1 min, relative units up to 30 days,
 * then falls back to a locale date string.
 */
export function formatRelativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Format an ISO 8601 date string as a short date (e.g. "Apr 14, 2026").
 */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

/**
 * Returns inline style props for a staggered fadeInUp entrance animation.
 *
 * @param index  Item index in the list (controls delay).
 * @param delayMs  Base delay per item in ms (default 30).
 * @param maxMs  Maximum total delay cap in ms (default 300).
 * @param duration  Animation duration in seconds (default 0.3).
 */
export function staggerStyle(
  index: number,
  { delayMs = 30, maxMs = 300, duration = 0.3 } = {},
): CSSProperties {
  return {
    animation: `${KEYFRAMES.fadeInUp} ${duration}s ease both`,
    animationDelay: `${Math.min(index * delayMs, maxMs)}ms`,
  };
}
