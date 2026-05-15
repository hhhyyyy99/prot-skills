import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const execFilePromise = promisify(execFileCallback);

function parseArgs(args) {
  const [tagName, ...rest] = args;
  let remote = 'origin';

  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--remote') {
      const remoteName = rest[index + 1];
      if (!remoteName) {
        throw new Error('Missing value for --remote');
      }
      remote = remoteName;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${rest[index]}`);
  }

  return { tagName, remote };
}

async function runGit(execFile, args) {
  await execFile('git', args);
}

export async function createReleaseTag({
  args = process.argv.slice(2),
  execFile = execFilePromise,
} = {}) {
  const { tagName, remote } = parseArgs(args);

  if (!tagName) {
    throw new Error('Usage: pnpm release:tag <vX.Y.Z> [--remote <name>]');
  }

  if (!tagName.startsWith('v')) {
    throw new Error('Release tag must start with "v"');
  }

  await runGit(execFile, ['tag', '-a', tagName, '-m', `Release ${tagName}`]);
  await runGit(execFile, ['push', remote, tagName]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await createReleaseTag();
    console.log('Release tag created and pushed successfully.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
