const GITHUB_API_BASE = "https://api.github.com";

function getHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "user-agent": "prot-skills-ai-review",
  };
}

export async function getPullRequestContext({ repo, pullRequestNumber, githubToken }) {
  const prResponse = await fetch(`${GITHUB_API_BASE}/repos/${repo}/pulls/${pullRequestNumber}`, {
    headers: getHeaders(githubToken),
  });

  if (!prResponse.ok) {
    throw new Error(`Failed to fetch pull request #${pullRequestNumber}`);
  }

  const pr = await prResponse.json();
  const files = [];
  let page = 1;

  while (true) {
    const filesResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${repo}/pulls/${pullRequestNumber}/files?per_page=100&page=${page}`,
      { headers: getHeaders(githubToken) },
    );

    if (!filesResponse.ok) {
      throw new Error(`Failed to fetch changed files for pull request #${pullRequestNumber}`);
    }

    const pageItems = await filesResponse.json();
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

export function formatReviewComment(result) {
  const findings =
    result.findings.length === 0
      ? "No blocking issues found."
      : result.findings
          .map(
            (finding) =>
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

export async function createIssueComment({ repo, pullRequestNumber, githubToken, body }) {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${repo}/issues/${pullRequestNumber}/comments`,
    {
      method: "POST",
      headers: getHeaders(githubToken),
      body: JSON.stringify({ body }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create AI review comment on pull request #${pullRequestNumber}`);
  }
}
