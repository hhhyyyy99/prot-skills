function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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
      .filter((finding) => finding.confidence >= minConfidence),
  };
}
