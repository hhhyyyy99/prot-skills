import type { ReviewFinding, ReviewResult } from "./types.ts";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const SELF_RETRACTION_PATTERNS = [
  /\bnot a bug\b/i,
  /\bno (?:bug|issue|problem)\b/i,
  /\bdisregard\b/i,
  /\bcorrect (?:behavior|as intended)\b/i,
  /\bworks as intended\b/i,
  /\bis correct\b/i,
  /\bis not a\b.*\bbug\b/i,
  /\bno issue here\b/i,
  /\bactually (?:correct|fine|valid)\b/i,
];

function isSelfRetracted(finding: ReviewFinding) {
  const text = `${finding.title} ${finding.body}`;
  return SELF_RETRACTION_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeFinding(finding: unknown): ReviewFinding {
  if (!finding || typeof finding !== "object") {
    throw new Error("AI review result is invalid");
  }

  const candidate = finding as {
    path?: unknown;
    line?: unknown;
    severity?: unknown;
    confidence?: unknown;
    title?: unknown;
    body?: unknown;
  };
  const { path, line, severity, confidence, title, body } = candidate;
  const validSeverities = ["important", "nit", "pre-existing"] as const;

  if (
    !isNonEmptyString(path) ||
    typeof line !== "number" ||
    !Number.isInteger(line) ||
    line < 1 ||
    !validSeverities.includes(severity as ReviewFinding["severity"]) ||
    typeof confidence !== "number" ||
    confidence < 0 ||
    confidence > 100 ||
    !isNonEmptyString(title) ||
    !isNonEmptyString(body)
  ) {
    throw new Error("AI review result is invalid");
  }

  return {
    path,
    line,
    severity: severity as ReviewFinding["severity"],
    confidence,
    title,
    body,
  };
}

export function normalizeReviewResult(
  payload: unknown,
  options: { minConfidence?: number } = {},
): ReviewResult {
  if (
    !payload ||
    typeof payload !== "object" ||
    !isNonEmptyString((payload as { summary?: unknown }).summary) ||
    !Array.isArray((payload as { findings?: unknown }).findings)
  ) {
    throw new Error("AI review result is invalid");
  }

  const minConfidence =
    typeof options.minConfidence === "number" && Number.isFinite(options.minConfidence)
      ? options.minConfidence
      : 0;
  const candidate = payload as { summary: string; findings: unknown[] };

  return {
    summary: candidate.summary.trim(),
    findings: candidate.findings
      .map(normalizeFinding)
      .filter((finding) => finding.confidence >= minConfidence)
      .filter((finding) => !isSelfRetracted(finding)),
  };
}
