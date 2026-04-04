/**
 * Shared utilities for TypeScript migrations 021 and 022.
 *
 * These migrations convert text blobs on projects and tasks into
 * standalone documents linked via document_references. This module
 * centralises the edge-case handling so both migrations behave
 * identically.
 *
 * Key rules:
 * - Null/empty/whitespace-only fields are skipped (no document created).
 * - Each non-empty field produces exactly one document + one reference.
 *   Fields are never merged into a single document.
 * - Migrated documents have summary set to null. Generating summaries
 *   is a separate concern — don't fabricate them during migration.
 * - Content is preserved exactly, without truncation.
 * - Migrations should be idempotent-safe: before inserting a document
 *   and reference, check whether a matching reference already exists
 *   for the (entity_type, entity_id, type) tuple so re-running the
 *   migration does not create duplicates.
 */

import type { DocumentReferenceType } from '../../entities';

// ---------------------------------------------------------------------------
// Field-to-reference-type mapping
// ---------------------------------------------------------------------------

/**
 * Maps old text-blob column names to their DocumentReferenceType.
 *
 * Project columns: goal, requirements, design
 * Task columns:    plan, description, implementation, acceptance_criteria
 */
export const FIELD_TO_REFERENCE_TYPE = {
  // Project fields
  goal: 'goal',
  requirements: 'requirements',
  design: 'design',
  // Task fields
  plan: 'plan',
  description: 'note',
  implementation: 'reference',
  acceptance_criteria: 'requirements',
} as const satisfies Record<string, DocumentReferenceType>;

// ---------------------------------------------------------------------------
// Display names for document titles
// ---------------------------------------------------------------------------

/** Human-readable names for each reference type, used in generated titles. */
export const TYPE_DISPLAY_NAMES: Record<DocumentReferenceType, string> = {
  goal: 'Goal',
  plan: 'Plan',
  requirements: 'Requirements',
  design: 'Design',
  reference: 'Reference',
  note: 'Note',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determines whether a text-blob value should be migrated into a document.
 *
 * Returns false for null, empty string, and whitespace-only strings.
 * Returns true for any string containing at least one non-whitespace character.
 */
export function shouldMigrate(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

/**
 * Generates a document title for a migrated text blob.
 *
 * Pattern: "{entityTitle} — {TypeName}"
 *
 * Uses the mapped type display name (e.g. "Requirements" not
 * "Acceptance Criteria") so titles are consistent regardless of
 * which source field they originated from.
 */
export function generateDocumentTitle(
  entityTitle: string,
  referenceType: DocumentReferenceType,
): string {
  return `${entityTitle} — ${TYPE_DISPLAY_NAMES[referenceType]}`;
}
