# Coding Rules

These rules are derived from the Karpathy-style coding guidelines referenced by the team.

## Think Before Coding

- State important assumptions before implementing when they affect behavior, scope, or risk.
- If a request has multiple reasonable interpretations, surface them instead of silently picking one.
- Prefer the simpler approach when it solves the same problem.
- If something important is unclear, stop and clarify instead of guessing deep in the implementation.

## Simplicity First

- Write the minimum code needed to solve the requested problem.
- Do not add speculative flexibility, configuration, or abstractions that were not asked for.
- Do not add single-use helper layers when the existing code can stay direct and readable.
- Keep error handling realistic; avoid defensive branches for impossible scenarios.

## Surgical Changes

- Touch only the files and lines needed for the requested outcome.
- Match existing code style and local patterns unless the task explicitly includes a refactor.
- Do not clean up unrelated code, comments, or formatting just because you noticed them.
- Remove imports, variables, or helpers only when your own changes made them unused.
- If you find unrelated dead code or nearby issues, mention them separately instead of fixing them opportunistically.

## Goal-Driven Execution

- Define a concrete success condition before making substantial changes.
- Prefer verification that can prove the change worked, such as a targeted test, build, lint, or repro step.
- For bug fixes, reproduce the failure first when practical, then verify the fix.
- For multi-step work, break the task into short steps and pair each step with a verification check.

## Review Test

Before you finish, sanity-check the change against these questions:

- Can each changed line be traced back to the request?
- Is there a simpler version of this solution?
- Did the implementation stay within the requested scope?
- Did you verify the result instead of only reasoning about it?
