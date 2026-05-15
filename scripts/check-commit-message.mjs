import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const maxSubjectLength = 72;
const conventionalTypes = [
  'feat',
  'fix',
  'chore',
  'docs',
  'refactor',
  'test',
  'build',
  'ci',
  'style',
  'perf',
  'revert',
  'design',
];

const conventionalCommitPattern = new RegExp(
  `^(?:${conventionalTypes.join('|')})(?:\\([^)]+\\))?!?: .+$`,
);
const plainImperativePattern = /^[A-Z][A-Za-z0-9"'&(),/:+ -]+$/;
const gitGeneratedPattern = /^(?:Merge|Revert|fixup!|squash!)/;

export function validateCommitMessage(message) {
  const subject = message.split(/\r?\n/, 1)[0].trim();

  if (!subject) {
    throw new Error('Commit subject must not be empty.');
  }

  if (subject.length > maxSubjectLength) {
    throw new Error(`Commit subject must be ${maxSubjectLength} characters or fewer.`);
  }

  if (gitGeneratedPattern.test(subject)) {
    return subject;
  }

  if (conventionalCommitPattern.test(subject)) {
    return subject;
  }

  if (plainImperativePattern.test(subject) && subject.includes(' ')) {
    return subject;
  }

  throw new Error(
    'Commit subject must use Conventional Commit format like "feat(pages): add search" or a short imperative subject like "Add tool management actions".',
  );
}

export async function checkCommitMessageFile(messageFilePath) {
  if (!messageFilePath) {
    throw new Error('Usage: node scripts/check-commit-message.mjs <commit-msg-file>');
  }

  const message = await readFile(messageFilePath, 'utf8');
  return validateCommitMessage(message);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await checkCommitMessageFile(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
