import {
  createOrUpdateIssueComment,
  findExistingIssueComment,
  formatReviewComment,
  getPullRequestContext,
} from "./github.mjs";
import { buildReviewPrompt, buildSystemPrompt } from "./prompt.mjs";
import {
  getProviderConfig,
  resolveProviderClient,
  validateProviderConfig,
} from "./providers/index.mjs";

function getRequiredEnvFrom(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function runAIReview({
  env = process.env,
  pullRequestLoader = getPullRequestContext,
  providerClient,
  existingCommentLoader = findExistingIssueComment,
  commentWriter = createOrUpdateIssueComment,
} = {}) {
  const repo = getRequiredEnvFrom(env, "REPO");
  const pullRequestNumber = Number.parseInt(getRequiredEnvFrom(env, "PR_NUMBER"), 10);
  const githubToken = getRequiredEnvFrom(env, "GITHUB_TOKEN");
  const minConfidence = Number.parseInt(env.AI_REVIEW_MIN_CONFIDENCE || "80", 10);
  const maxFindings = Number.parseInt(env.AI_REVIEW_MAX_FINDINGS || "5", 10);

  if (Number.isNaN(minConfidence) || Number.isNaN(maxFindings)) {
    throw new Error("AI_REVIEW_MIN_CONFIDENCE and AI_REVIEW_MAX_FINDINGS must be valid integers");
  }
  const providerConfig = getProviderConfig(env);

  validateProviderConfig(providerConfig);

  const reviewContext = await pullRequestLoader({
    repo,
    pullRequestNumber,
    githubToken,
  });

  const systemPrompt = buildSystemPrompt({
    repository: repo,
    minConfidence,
    maxFindings,
  });
  const userPrompt = buildReviewPrompt(reviewContext);
  const reviewProvider = providerClient || resolveProviderClient(providerConfig);
  const result = await reviewProvider({
    ...providerConfig,
    systemPrompt,
    userPrompt,
    minConfidence,
    maxFindings,
  });
  result.findings = result.findings.slice(0, maxFindings);
  const blockingFindings = result.findings.filter((finding) => finding.severity === "important");
  const gatedResult = {
    ...result,
    passed: blockingFindings.length === 0,
  };
  const existingComment = await existingCommentLoader({
    repo,
    pullRequestNumber,
    githubToken,
  });

  await commentWriter({
    repo,
    pullRequestNumber,
    githubToken,
    commentId: existingComment?.id,
    body: formatReviewComment(gatedResult),
  });

  return gatedResult;
}

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runAIReview()
    .then((result) => {
      if (!result.passed) {
        console.error("AI review found blocking issues.");
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
