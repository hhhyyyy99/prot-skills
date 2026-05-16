export type ReviewSeverity = "important" | "nit" | "pre-existing";

export type ReviewFinding = {
  path: string;
  line: number;
  severity: ReviewSeverity;
  confidence: number;
  title: string;
  body: string;
};

export type ReviewResult = {
  summary: string;
  findings: ReviewFinding[];
};

export type GatedReviewResult = ReviewResult & {
  passed: boolean;
};

export type PullRequestContext = {
  pullRequest: {
    number: number;
    title: string;
    body: string;
    baseRef: string;
    headRef: string;
  };
  files: Array<{
    path: string;
    patch: string;
  }>;
};

export type ProviderName = "openai" | "anthropic";

export type ProviderConfig = {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseUrl: string;
};

export type ReviewProviderInput = ProviderConfig & {
  systemPrompt: string;
  userPrompt: string;
  minConfidence: number;
  maxFindings?: number;
};

export type ReviewProvider = (input: ReviewProviderInput) => Promise<ReviewResult>;

export type AIReviewEnv = Record<string, string | undefined>;

export type IssueComment = {
  id: number;
  body: string;
};
