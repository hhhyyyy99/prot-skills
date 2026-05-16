function isNonEmptyString(value) {
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

function isSelfRetracted(finding) {
  const text = `${finding.title} ${finding.body}`;
  return SELF_RETRACTION_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeFinding(finding) {
  if (!finding || typeof finding !== "object") {
    throw new Error("AI review result is invalid");
  }

  const { path, line, severity, confidence, title, body } = finding;

  if (
    !isNonEmptyString(path) ||
    !Number.isInteger(line) ||
    line < 1 ||
    !["important", "nit", "pre-existing"].includes(severity) ||
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
    severity,
    confidence,
    title,
    body,
  };
}

export function normalizeReviewResult(payload, options = {}) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !isNonEmptyString(payload.summary) ||
    !Array.isArray(payload.findings)
  ) {
    throw new Error("AI review result is invalid");
  }

  const minConfidence = Number.isFinite(options.minConfidence) ? options.minConfidence : 0;

  return {
    summary: payload.summary.trim(),
    findings: payload.findings
      .map(normalizeFinding)
      .filter((finding) => finding.confidence >= minConfidence)
      .filter((finding) => !isSelfRetracted(finding)),
  };
}
