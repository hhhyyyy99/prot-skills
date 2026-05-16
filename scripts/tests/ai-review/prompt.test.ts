import { describe, expect, it } from "vitest";
import { buildReviewPrompt, buildSystemPrompt } from "../../ai-review/prompt.ts";

describe("ai review prompts", () => {
  it("builds a repository-aware system prompt", () => {
    const prompt = buildSystemPrompt({
      repository: "hhhyyyy99/prot-skills",
      minConfidence: 80,
      maxFindings: 5,
    });

    expect(prompt).toContain("hhhyyyy99/prot-skills");
    expect(prompt).toContain("Default to");
    expect(prompt).toContain("Confidence below 80");
    expect(prompt).toContain("Maximum 5 findings");
    expect(prompt).toContain("shown as *** in logs");
  });

  it("builds a user prompt from PR metadata and changed files", () => {
    const prompt = buildReviewPrompt({
      pullRequest: {
        number: 12,
        title: "feat: add AI review workflow",
        body: "Adds PR automation.",
        baseRef: "main",
        headRef: "feat/ai-review-workflow",
      },
      files: [
        {
          path: ".github/workflows/ai-review.yml",
          patch: "@@ -0,0 +1,10 @@\n+name: AI Review",
        },
      ],
    });

    expect(prompt).toContain("PR #12");
    expect(prompt).toContain("feat: add AI review workflow");
    expect(prompt).toContain(".github/workflows/ai-review.yml");
    expect(prompt).toContain("name: AI Review");
  });
});
