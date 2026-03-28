/**
 * ARN (Addressable Resource Name) parser and validator.
 *
 * Format: `tab:{type}:{id}`
 *
 * Pure validation logic — no SQL, no HTTP.
 * Resource existence checks delegate to injected resolvers.
 */

export const ARN_RESOURCE_TYPES = ["project", "task", "workflow", "phase", "instruction"] as const;
export type ArnResourceType = (typeof ARN_RESOURCE_TYPES)[number];

export interface ParsedArn {
  type: ArnResourceType;
  id: string;
}

const ARN_PREFIX = "tab";
const ARN_SEPARATOR = ":";

const resourceTypeSet: ReadonlySet<string> = new Set(ARN_RESOURCE_TYPES);

/**
 * Parse an ARN string into its constituent parts.
 * Throws on malformed format or unknown resource type.
 */
export function parseArn(arn: string): ParsedArn {
  if (!arn) {
    throw new ArnError("ARN must not be empty");
  }

  const parts = arn.split(ARN_SEPARATOR);
  if (parts.length !== 3) {
    throw new ArnError(`Invalid ARN format: expected "tab:{type}:{id}", got "${arn}"`);
  }

  const [prefix, type, id] = parts;

  if (prefix !== ARN_PREFIX) {
    throw new ArnError(`Invalid ARN prefix: expected "${ARN_PREFIX}", got "${prefix}"`);
  }

  if (!resourceTypeSet.has(type)) {
    throw new ArnError(
      `Unknown ARN resource type "${type}". Valid types: ${ARN_RESOURCE_TYPES.join(", ")}`
    );
  }

  if (!id) {
    throw new ArnError("ARN id must not be empty");
  }

  return { type: type as ArnResourceType, id };
}

/**
 * Build an ARN string from parts.
 */
export function buildArn(type: ArnResourceType, id: string): string {
  return `${ARN_PREFIX}${ARN_SEPARATOR}${type}${ARN_SEPARATOR}${id}`;
}

// ---------------------------------------------------------------------------
// Resolver-based existence validation
// ---------------------------------------------------------------------------

/** A resolver returns true if the resource exists. */
export type ArnResolver = (id: string) => boolean;

/** Map from resource type to its existence resolver. */
export type ArnResolverMap = Record<ArnResourceType, ArnResolver>;

/**
 * Validate an ARN: parse it, then confirm the referenced resource exists.
 * Throws ArnError on bad format or missing resource.
 */
export function validateArn(arn: string, resolvers: ArnResolverMap): ParsedArn {
  const parsed = parseArn(arn);

  const resolver = resolvers[parsed.type];
  if (!resolver(parsed.id)) {
    throw new ArnError(`Resource not found: ${arn}`);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ArnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArnError";
  }
}
