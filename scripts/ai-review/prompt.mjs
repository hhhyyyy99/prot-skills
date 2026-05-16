export function buildSystemPrompt({ repository, minConfidence, maxFindings }) {
  return [
    `You are reviewing pull requests for ${repository}.`,
    "Only report high-signal issues introduced by the current pull request.",
    "Focus on correctness, security, breaking behavior, or workflow regressions.",
    "Do not suggest style-only cleanups, naming tweaks, or speculative future-proofing.",
    `Do not report any finding with a confidence score below ${minConfidence}.`,
    `Cap findings at ${maxFindings}.`,
    "Return valid JSON only with this shape:",
    '{"summary":"string","findings":[{"path":"string","line":1,"severity":"important|nit|pre-existing","confidence":90,"title":"string","body":"string"}]}',
  ].join("\n");
}

export function buildReviewPrompt({ pullRequest, files }) {
  const fileSections = files
    .map((file) => {
      const patch = file.patch?.trim() || "(no patch available)";
      return [`File: ${file.path}`, "Patch:", patch].join("\n");
    })
    .join("\n\n---\n\n");

  return [
    `Review PR #${pullRequest.number}: ${pullRequest.title}`,
    `Base: ${pullRequest.baseRef}`,
    `Head: ${pullRequest.headRef}`,
    "",
    "PR body:",
    pullRequest.body?.trim() || "(no description provided)",
    "",
    "Changed files and patches:",
    fileSections || "(no changed files found)",
  ].join("\n");
}
