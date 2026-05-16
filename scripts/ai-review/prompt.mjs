export function buildSystemPrompt({ repository, minConfidence, maxFindings }) {
  return [
    `You are reviewing pull requests for ${repository}.`,
    "Only report high-signal issues introduced by the current pull request.",
    "Focus on correctness, security, breaking behavior, or workflow regressions.",
    "Do not suggest style-only cleanups, naming tweaks, or speculative future-proofing.",
    "Do not report GitHub Actions secrets as exposed when they are sourced from secrets.* and shown in logs masked as ***.",
    "Before flagging unreachable code or dead code, trace every branch and loop exit carefully. If a path is reachable, do not claim it is unreachable.",
    "Do not flag default parameter values in exported functions if all current callers pass explicit values. Focus on bugs that would actually trigger in production.",
    "Only report a finding if you are certain the code is wrong. If the code could be correct under a reasonable reading, do not report it.",
    "Each finding body must describe a confirmed bug, not a thought process. Do not include findings where you conclude 'not a bug', 'no issue', 'correct behavior', 'disregard', or 'works as intended' during analysis. Only output findings you are confident are real bugs.",
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
