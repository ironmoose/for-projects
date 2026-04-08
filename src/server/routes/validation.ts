import { z } from "zod";
import { DOCUMENT_REFERENCE_TYPES, type DocumentReferenceType } from "../../domain";
import { ServiceError } from "../../domain";

/**
 * Zod schema for the merge-patch `documents` field on project/task PATCH endpoints.
 *
 * Shape: `{ [document_id]: Array<{ type: ReferenceType }> | null }`
 * - Absent key = untouched
 * - Array = full replacement of reference types for that document
 * - null = remove all references to that document
 * - Empty object {} = no-op
 */
export const documentsMergePatchSchema = z.record(
  z.string().min(1).max(26),
  z.union([
    z.array(z.object({
      type: z.enum([...DOCUMENT_REFERENCE_TYPES]),
    })),
    z.null(),
  ]),
).optional();

/**
 * Validate the `documents` merge-patch field from a request body item.
 * Returns the validated value or throws ServiceError(400).
 *
 * @param documents - Raw documents field from the request body
 * @param itemIndex - Index in the items array (for error messages)
 * @returns The validated documents object, or undefined if not provided
 */
export function validateDocumentsMergePatch(
  documents: unknown,
  itemIndex?: number,
): Record<string, { type: DocumentReferenceType }[] | null> | undefined {
  if (documents === undefined) return undefined;

  const result = documentsMergePatchSchema.safeParse(documents);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? ` at documents.${issue.path.join(".")}` : "";
      return `${issue.message}${path}`;
    });
    const prefix = itemIndex !== undefined ? `items[${itemIndex}].documents: ` : "Invalid documents merge-patch: ";
    throw new ServiceError(`${prefix}${issues.join("; ")}`, 400);
  }
  return result.data;
}
