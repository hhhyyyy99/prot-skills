import { describe, expect, it } from "vitest";
import { formatReviewComment } from "./github.mjs";
import { runAIReview } from "./run.mjs";

describe("AI review merge gate", () => {
  it("marks a clean review as passing", async () => {
    const result = await runAIReview({
      env: {
        REPO: "hhhyyyy99/prot-skills",
        PR_NUMBER: "8",
        GITHUB_TOKEN: "github-token",
        AI_REVIEW_PROVIDER: "openai",
        AI_REVIEW_MODEL: "gpt-4.1-mini",
        AI_REVIEW_API_KEY: "provider-key",
      },
      pullRequestLoader: async () => ({
        pullRequest: {
          number: 8,
          title: "chore: no-op",
          body: "",
          baseRef: "main",
          headRef: "chore/no-op",
        },
        files: [],
      }),
      providerClient: async () => ({
        summary: "LGTM",
        findings: [],
      }),
      commentWriter: async () => {},
    });

    expect(result.passed).toBe(true);
  });

  it("marks a review with findings as blocking", async () => {
    const result = await runAIReview({
      env: {
        REPO: "hhhyyyy99/prot-skills",
        PR_NUMBER: "9",
        GITHUB_TOKEN: "github-token",
        AI_REVIEW_PROVIDER: "openai",
        AI_REVIEW_MODEL: "gpt-4.1-mini",
        AI_REVIEW_API_KEY: "provider-key",
      },
      pullRequestLoader: async () => ({
        pullRequest: {
          number: 9,
          title: "feat: risky change",
          body: "",
          baseRef: "main",
          headRef: "feat/risky-change",
        },
        files: [],
      }),
      providerClient: async () => ({
        summary: "One blocking issue found.",
        findings: [
          {
            path: "src/app.ts",
            line: 10,
            severity: "important",
            confidence: 92,
            title: "Potential crash",
            body: "This branch can dereference undefined.",
          },
        ],
      }),
      commentWriter: async () => {},
    });

    expect(result.passed).toBe(false);
  });

  it("renders passing and blocking headings clearly", () => {
    const passing = formatReviewComment({
      summary: "LGTM",
      findings: [],
      passed: true,
    });
    const blocking = formatReviewComment({
      summary: "One blocking issue found.",
      findings: [
        {
          path: "src/app.ts",
          line: 10,
          severity: "important",
          confidence: 92,
          title: "Potential crash",
          body: "This branch can dereference undefined.",
        },
      ],
      passed: false,
    });

    expect(passing).toContain("## AI Review Passed");
    expect(blocking).toContain("## AI Review Blocked");
  });
});
