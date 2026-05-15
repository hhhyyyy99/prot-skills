import { describe, expect, it } from 'vitest';
import { validateCommitMessage } from './check-commit-message.mjs';

describe('validateCommitMessage', () => {
  it('accepts conventional commit messages', () => {
    expect(() => validateCommitMessage('feat(pages): add husky hooks')).not.toThrow();
    expect(() => validateCommitMessage('chore(release): bump version to 0.0.3')).not.toThrow();
  });

  it('accepts existing plain imperative commit subjects', () => {
    expect(() => validateCommitMessage('Add tool management actions')).not.toThrow();
  });

  it('accepts Git-generated merge and revert messages', () => {
    expect(() => validateCommitMessage("Merge branch 'main' into codex/husky")).not.toThrow();
    expect(() => validateCommitMessage('Revert "feat(pages): add husky hooks"')).not.toThrow();
    expect(() => validateCommitMessage('fixup! feat(pages): add husky hooks')).not.toThrow();
    expect(() => validateCommitMessage('squash! feat(pages): add husky hooks')).not.toThrow();
  });

  it('rejects vague one-word messages', () => {
    expect(() => validateCommitMessage('wip')).toThrow(/Conventional Commit/);
  });

  it('rejects empty subjects and overlong summaries', () => {
    expect(() => validateCommitMessage('')).toThrow(/must not be empty/);
    expect(() => validateCommitMessage(`feat: ${'a'.repeat(80)}`)).toThrow(/72 characters/);
  });
});
