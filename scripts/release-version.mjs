import { execFile as execFileCallback } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFilePromise = promisify(execFileCallback);
const validReleaseLevels = new Set(['patch', 'minor', 'major']);

function normalizeVersionOutput(stdout) {
  return stdout.trim().replace(/^v/, '');
}

async function runPnpm(execFile, args) {
  return execFile('pnpm', args);
}

export async function releaseVersion({
  args = process.argv.slice(2),
  execFile = execFilePromise,
} = {}) {
  const [releaseLevel] = args;

  if (!releaseLevel) {
    throw new Error('Usage: pnpm release:version <patch|minor|major>');
  }

  if (!validReleaseLevels.has(releaseLevel)) {
    throw new Error('Release level must be one of: patch, minor, major');
  }

  const { stdout } = await runPnpm(execFile, [
    'version',
    releaseLevel,
    '--no-git-tag-version',
  ]);

  await runPnpm(execFile, ['app:sync']);

  return normalizeVersionOutput(stdout);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const nextVersion = await releaseVersion();
    console.log(`Version bumped to ${nextVersion}.`);
    console.log(`Next: git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock`);
    console.log(`Then: git commit -m "chore(release): bump version to ${nextVersion}"`);
    console.log(`Finally: pnpm release:tag v${nextVersion}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
