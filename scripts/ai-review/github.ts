import type {
  GatedReviewResult,
  IssueComment,
  PullRequestContext,
  ReviewFinding,
} from "./types.ts";

const GITHUB_API_BASE = "https://api.github.com";
const AI_REVIEW_COMMENT_MARKER = "## AI Review";
const API_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_000;

function getHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "user-agent": "prot-skills-ai-review",
  };
}

async function fetchWithRetry(url: string, options: RequestInit) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        continue;
      }
      throw lastError;
    }

    if (response.status === 429) {
      lastError = new Error("GitHub API rate limited (429)");
      if (attempt < MAX_RETRIES) {
        continue;
      }
      throw lastError;
    }

    return response;
  }

  throw lastError;
}

export async function getPullRequestContext({
  repo,
  pullRequestNumber,
  githubToken,
}: {
  repo: string;
  pullRequestNumber: number;
  githubToken: string;
}): Promise<PullRequestContext> {
  const prResponse = await fetchWithRetry(
    `${GITHUB_API_BASE}/repos/${repo}/pulls/${pullRequestNumber}`,
    {
      headers: getHeaders(githubToken),
    },
  );

  if (!prResponse.ok) {
    throw new Error(`Failed to fetch pull request #${pullRequestNumber}`);
  }

  const pr = (await prResponse.json()) as {
    number: number;
    title: string;
    body: string | null;
    base: { ref: string };
    head: { ref: string };
  };
  const files: PullRequestContext["files"] = [];
  let page = 1;

  while (true) {
    const filesResponse = await fetchWithRetry(
      `${GITHUB_API_BASE}/repos/${repo}/pulls/${pullRequestNumber}/files?per_page=100&page=${page}`,
      { headers: getHeaders(githubToken) },
    );

    if (!filesResponse.ok) {
      throw new Error(`Failed to fetch changed files for pull request #${pullRequestNumber}`);
    }

    const pageItems = (await filesResponse.json()) as Array<{
      filename: string;
      patch?: string;
    }>;
    if (pageItems.length === 0) {
      break;
    }

    files.push(
      ...pageItems.map((file) => ({
        path: file.filename,
        patch: file.patch || "",
      })),
    );

    if (pageItems.length < 100) {
      break;
    }

    page += 1;
  }

  return {
    pullRequest: {
      number: pr.number,
      title: pr.title,
      body: pr.body || "",
      baseRef: pr.base.ref,
      headRef: pr.head.ref,
    },
    files,
  };
}

export function formatReviewComment(result: GatedReviewResult) {
  const findings =
    result.findings.length === 0
      ? "No blocking issues found."
      : result.findings
          .map(
            (finding: ReviewFinding) =>
              `- \`${finding.severity}\` \`${finding.path}:${finding.line}\` (${finding.confidence}) ${finding.title}\n  ${finding.body}`,
          )
          .join("\n");

  return [
    result.passed ? "## AI Review Passed" : "## AI Review Blocked",
    "",
    result.summary,
    "",
    findings,
  ].join("\n");
}

export async function findExistingIssueComment({
  repo,
  pullRequestNumber,
  githubToken,
}: {
  repo: string;
  pullRequestNumber: number;
  githubToken: string;
}): Promise<IssueComment | null> {
  let latest: IssueComment | null = null;
  let page = 1;

  while (true) {
    const response = await fetchWithRetry(
      `${GITHUB_API_BASE}/repos/${repo}/issues/${pullRequestNumber}/comments?per_page=100&page=${page}`,
      {
        headers: getHeaders(githubToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to list PR comments for pull request #${pullRequestNumber}`);
    }

    const comments = (await response.json()) as Array<{
      id: number;
      body?: string;
    }>;
    if (comments.length === 0) {
      break;
    }

    for (const comment of comments) {
      if (typeof comment.body === "string" && comment.body.includes(AI_REVIEW_COMMENT_MARKER)) {
        if (!latest || comment.id > latest.id) {
          latest = { id: comment.id, body: comment.body };
        }
      }
    }

    if (comments.length < 100) {
      break;
    }

    page += 1;
  }

  return latest;
}

export async function createOrUpdateIssueComment({
  repo,
  pullRequestNumber,
  githubToken,
  body,
  commentId,
}: {
  repo: string;
  pullRequestNumber: number;
  githubToken: string;
  body: string;
  commentId?: number;
}) {
  const url = commentId
    ? `${GITHUB_API_BASE}/repos/${repo}/issues/comments/${commentId}`
    : `${GITHUB_API_BASE}/repos/${repo}/issues/${pullRequestNumber}/comments`;
  const method = commentId ? "PATCH" : "POST";
  const response = await fetchWithRetry(url, {
    method,
    headers: getHeaders(githubToken),
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    throw new Error(`Failed to upsert AI review comment on pull request #${pullRequestNumber}`);
  }
}
