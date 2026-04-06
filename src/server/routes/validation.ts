import { z } from "zod";
import { DOCUMENT_REFERENCE_TYPES } from "../../domain/entities";

/**
 * Zod schema for a single document reference entry: { type: "goal" | "plan" | ... }
 */
const documentReferenceEntrySchema = z.object({
  type: z.enum(DOCUMENT_REFERENCE_TYPES),
});

/**
 * Zod schema for the documents merge-patch field.
 *
 * Shape: Record<string, Array<{type: ReferenceType}> | null>
 * - Key with array: replaces all reference types for that document on the entity
 * - Key with null: removes all references to that document from the entity
 * - Key absent: no change
 */
export const documentsMergePatchSchema = z.record(
  z.string(),
  z.union([z.array(documentReferenceEntrySchema), z.null()]),
);

export class DocumentsMergePatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentsMergePatchError";
  }
}

/**
 * Validate a documents merge-patch value using Zod.
 * Throws DocumentsMergePatchError with a descriptive message on failure.
 */
export function validateDocumentsMergePatch(value: unknown): void {
  const result = documentsMergePatchSchema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new DocumentsMergePatchError(`Invalid documents merge-patch: ${issues}`);
  }
}
