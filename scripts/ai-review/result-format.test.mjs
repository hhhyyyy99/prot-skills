import { describe, expect, it } from "vitest";
import { normalizeReviewResult } from "./result.mjs";

describe("normalizeReviewResult", () => {
  it("normalizes review payloads into a stable shape", () => {
    const result = normalizeReviewResult({
      summary: "Two findings found.",
      findings: [
        {
          path: "src/pages/ToolsPage.tsx",
          line: 42,
          severity: "important",
          confidence: 91,
          title: "Potential undefined access",
          body: "The value can be undefined after filtering.",
        },
      ],
    });

    expect(result).toEqual({
      summary: "Two findings found.",
      findings: [
        {
          path: "src/pages/ToolsPage.tsx",
          line: 42,
          severity: "important",
          confidence: 91,
          title: "Potential undefined access",
          body: "The value can be undefined after filtering.",
        },
      ],
    });
  });

  it("rejects invalid findings payloads", () => {
    expect(() =>
      normalizeReviewResult({
        summary: "Bad payload",
        findings: [{ path: "src/app.ts", severity: "important" }],
      }),
    ).toThrow("AI review result is invalid");
  });

  it("filters out findings below the configured confidence threshold", () => {
    const result = normalizeReviewResult(
      {
        summary: "Mixed-confidence findings.",
        findings: [
          {
            path: "src/app.ts",
            line: 10,
            severity: "important",
            confidence: 79,
            title: "Low-confidence issue",
            body: "Should not survive filtering.",
          },
          {
            path: "src/app.ts",
            line: 12,
            severity: "important",
            confidence: 91,
            title: "High-confidence issue",
            body: "Should survive filtering.",
          },
        ],
      },
      { minConfidence: 80 },
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].title).toBe("High-confidence issue");
  });
});
