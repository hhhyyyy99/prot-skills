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
});
