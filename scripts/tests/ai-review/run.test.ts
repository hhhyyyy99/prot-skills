import { describe, expect, it } from "vitest";
import { runAIReview } from "../../ai-review/run.ts";

describe("runAIReview", () => {
  it("loads PR context and posts a formatted comment", async () => {
    const comments: Array<{
      repo: string;
      pullRequestNumber: number;
      body: string;
      githubToken: string;
      commentId?: number;
    }> = [];

    const result = await runAIReview({
      env: {
        REPO: "hhhyyyy99/prot-skills",
        PR_NUMBER: "7",
        GITHUB_TOKEN: "github-token",
        AI_REVIEW_PROVIDER: "openai",
        AI_REVIEW_MODEL: "gpt-4.1-mini",
        AI_REVIEW_API_KEY: "provider-key",
      },
      pullRequestLoader: async () => ({
        pullRequest: {
          number: 7,
          title: "feat: add AI review automation",
          body: "Adds a new workflow.",
          baseRef: "main",
          headRef: "feat/ai-review",
        },
        files: [
          {
            path: ".github/workflows/ai-review.yml",
            patch: "@@ -0,0 +1,2 @@\n+name: AI Review",
          },
        ],
      }),
      providerClient: async () => ({
        summary: "One important finding.",
        findings: [
          {
            path: ".github/workflows/ai-review.yml",
            line: 1,
            severity: "important",
            confidence: 91,
            title: "Missing permission explanation",
            body: "This workflow writes comments and should justify its permissions.",
          },
        ],
      }),
      existingCommentLoader: async () => null,
      commentWriter: async (comment) => {
        comments.push(comment);
      },
    });

    expect(result.summary).toBe("One important finding.");
    expect(comments).toHaveLength(1);
    expect(comments[0].repo).toBe("hhhyyyy99/prot-skills");
    expect(comments[0].pullRequestNumber).toBe(7);
    expect(comments[0].body).toContain("## AI Review");
    expect(comments[0].body).toContain("Missing permission explanation");
  });

  it("updates an existing AI review comment instead of appending a new one", async () => {
    const comments: Array<{ commentId?: number }> = [];

    await runAIReview({
      env: {
        REPO: "hhhyyyy99/prot-skills",
        PR_NUMBER: "7",
        GITHUB_TOKEN: "github-token",
        AI_REVIEW_PROVIDER: "openai",
        AI_REVIEW_MODEL: "gpt-4.1-mini",
        AI_REVIEW_API_KEY: "provider-key",
      },
      pullRequestLoader: async () => ({
        pullRequest: {
          number: 7,
          title: "feat: add AI review automation",
          body: "Adds a new workflow.",
          baseRef: "main",
          headRef: "feat/ai-review",
        },
        files: [],
      }),
      providerClient: async () => ({
        summary: "LGTM",
        findings: [],
      }),
      commentWriter: async (comment) => {
        comments.push(comment);
      },
      existingCommentLoader: async () => ({
        id: 42,
        body: "## AI Review Passed",
      }),
    });

    expect(comments).toHaveLength(1);
    expect(comments[0].commentId).toBe(42);
  });
});
