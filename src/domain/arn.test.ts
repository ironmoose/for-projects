import { describe, expect, test } from "bun:test";
import {
  parseArn,
  buildArn,
  validateArn,
  ArnError,
  ARN_RESOURCE_TYPES,
  type ArnResolverMap,
} from "./arn";

// ---------------------------------------------------------------------------
// parseArn
// ---------------------------------------------------------------------------

describe("parseArn", () => {
  test("parses a valid task ARN", () => {
    const result = parseArn("tab:task:01KMKS878A9Q6Y4Z");
    expect(result).toEqual({ type: "task", id: "01KMKS878A9Q6Y4Z" });
  });

  test("parses a valid project ARN", () => {
    const result = parseArn("tab:project:01KMHYK0CDAYWZ1Q");
    expect(result).toEqual({ type: "project", id: "01KMHYK0CDAYWZ1Q" });
  });

  test("parses a valid workflow ARN", () => {
    const result = parseArn("tab:workflow:01KMM743S7N1F75M");
    expect(result).toEqual({ type: "workflow", id: "01KMM743S7N1F75M" });
  });

  test("parses a valid phase ARN", () => {
    const result = parseArn("tab:phase:01KMM743S7N1F75M");
    expect(result).toEqual({ type: "phase", id: "01KMM743S7N1F75M" });
  });

  test("parses a valid instruction ARN", () => {
    const result = parseArn("tab:instruction:01KMN9QR2X5B3YAH");
    expect(result).toEqual({ type: "instruction", id: "01KMN9QR2X5B3YAH" });
  });

  test("rejects workbench as unknown resource type", () => {
    expect(() => parseArn("tab:workbench:01KMM743S7N1F75M")).toThrow(
      'Unknown ARN resource type "workbench"'
    );
  });

  test("throws on empty string", () => {
    expect(() => parseArn("")).toThrow(ArnError);
    expect(() => parseArn("")).toThrow("ARN must not be empty");
  });

  test("throws on wrong number of segments", () => {
    expect(() => parseArn("tab:task")).toThrow("Invalid ARN format");
    expect(() => parseArn("tab:task:id:extra")).toThrow("Invalid ARN format");
  });

  test("throws on wrong prefix", () => {
    expect(() => parseArn("aws:task:123")).toThrow('Invalid ARN prefix');
  });

  test("throws on unknown resource type", () => {
    expect(() => parseArn("tab:banana:123")).toThrow('Unknown ARN resource type "banana"');
  });

  test("throws on empty id", () => {
    expect(() => parseArn("tab:task:")).toThrow("ARN id must not be empty");
  });

  test("accepts ids with colons... wait, no — colons split into too many segments", () => {
    // An id containing a colon would produce 4+ segments, which is rejected.
    expect(() => parseArn("tab:task:id:with:colons")).toThrow("Invalid ARN format");
  });
});

// ---------------------------------------------------------------------------
// buildArn
// ---------------------------------------------------------------------------

describe("buildArn", () => {
  test("builds a well-formed ARN", () => {
    expect(buildArn("task", "01KMKS878A9Q6Y4Z")).toBe("tab:task:01KMKS878A9Q6Y4Z");
  });

  test("roundtrips with parseArn", () => {
    for (const type of ARN_RESOURCE_TYPES) {
      const id = "01KMKS878A9Q6Y4Z";
      const arn = buildArn(type, id);
      expect(parseArn(arn)).toEqual({ type, id });
    }
  });
});

// ---------------------------------------------------------------------------
// validateArn
// ---------------------------------------------------------------------------

describe("validateArn", () => {
  const alwaysExists: ArnResolverMap = {
    project: () => true,
    task: () => true,
    workflow: () => true,
    phase: () => true,
    instruction: () => true,
  };

  const neverExists: ArnResolverMap = {
    project: () => false,
    task: () => false,
    workflow: () => false,
    phase: () => false,
    instruction: () => false,
  };

  test("returns parsed ARN when resource exists", () => {
    const result = validateArn("tab:task:01KMKS878A9Q6Y4Z", alwaysExists);
    expect(result).toEqual({ type: "task", id: "01KMKS878A9Q6Y4Z" });
  });

  test("throws on non-existent resource", () => {
    expect(() => validateArn("tab:task:01KMKS878A9Q6Y4Z", neverExists)).toThrow(
      "Resource not found: tab:task:01KMKS878A9Q6Y4Z"
    );
  });

  test("throws ArnError (not generic Error) for missing resource", () => {
    expect(() => validateArn("tab:project:gone", neverExists)).toThrow(ArnError);
  });

  test("delegates to the correct resolver by type", () => {
    const selective: ArnResolverMap = {
      project: () => true,
      task: () => false,
      workflow: () => true,
      phase: () => true,
      instruction: () => true,
    };
    expect(() => validateArn("tab:task:123", selective)).toThrow("Resource not found");
    expect(validateArn("tab:project:123", selective)).toEqual({ type: "project", id: "123" });
  });

  test("still rejects malformed ARNs before checking existence", () => {
    expect(() => validateArn("garbage", alwaysExists)).toThrow("Invalid ARN format");
  });
});
