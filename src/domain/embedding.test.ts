import { describe, it, expect } from "bun:test";
import { buildEmbeddingText } from "./embedding";

describe("buildEmbeddingText", () => {
  it("joins title and summary", () => {
    const result = buildEmbeddingText({ title: "My Task", summary: "A summary" });
    expect(result).toBe("My Task\n\nA summary");
  });

  it("falls back to content when summary is missing", () => {
    const result = buildEmbeddingText({ title: "Doc", content: "Some content here" });
    expect(result).toBe("Doc\n\nSome content here");
  });

  it("truncates content fallback to 500 chars", () => {
    const longContent = "x".repeat(1000);
    const result = buildEmbeddingText({ title: "Doc", content: longContent });
    expect(result).toBe("Doc\n\n" + "x".repeat(500));
  });

  it("includes context and acceptance_criteria", () => {
    const result = buildEmbeddingText({
      title: "Task",
      summary: "Summary",
      context: "Background",
      acceptance_criteria: "Tests pass",
    });
    expect(result).toBe("Task\n\nSummary\n\nBackground\n\nTests pass");
  });

  it("truncates context to 2000 chars for embedding", () => {
    const longContext = "c".repeat(5000);
    const result = buildEmbeddingText({ title: "Task", context: longContext });
    expect(result).toBe("Task\n\n" + "c".repeat(2000));
  });

  it("truncates acceptance_criteria to 2000 chars for embedding", () => {
    const longAC = "a".repeat(5000);
    const result = buildEmbeddingText({ title: "Task", acceptance_criteria: longAC });
    expect(result).toBe("Task\n\n" + "a".repeat(2000));
  });

  it("truncates both context and acceptance_criteria independently", () => {
    const longContext = "c".repeat(10000);
    const longAC = "a".repeat(10000);
    const result = buildEmbeddingText({
      title: "Task",
      summary: "Sum",
      context: longContext,
      acceptance_criteria: longAC,
    });
    expect(result).toBe("Task\n\nSum\n\n" + "c".repeat(2000) + "\n\n" + "a".repeat(2000));
  });

  it("handles null/undefined fields gracefully", () => {
    expect(buildEmbeddingText({ title: "Only title" })).toBe("Only title");
    expect(buildEmbeddingText({ title: "T", summary: null, context: null })).toBe("T");
  });
});
