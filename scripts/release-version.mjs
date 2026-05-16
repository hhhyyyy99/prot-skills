import { execFile as execFileCallback } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFilePromise = promisify(execFileCallback);
const validReleaseLevels = new Set(["patch", "minor", "major"]);
const versionFiles = [
  "package.json",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.lock",
];

function normalizeVersionOutput(stdout) {
  return stdout.trim().replace(/^v/, "");
}

async function runCommand(execFile, command, args) {
  return execFile(command, args);
}

async function runPnpm(execFile, args) {
  return runCommand(execFile, "pnpm", args);
}

async function runGit(execFile, args) {
  return runCommand(execFile, "git", args);
}

async function runCargo(execFile, args) {
  return runCommand(execFile, "cargo", args);
}

export async function releaseVersion({
  args = process.argv.slice(2),
  execFile = execFilePromise,
} = {}) {
  const [releaseLevel] = args;

  if (!releaseLevel) {
    throw new Error("Usage: pnpm release:version <patch|minor|major>");
  }

  if (!validReleaseLevels.has(releaseLevel)) {
    throw new Error("Release level must be one of: patch, minor, major");
  }

  const { stdout } = await runPnpm(execFile, ["version", releaseLevel, "--no-git-tag-version"]);

  await runPnpm(execFile, ["app:sync"]);
  await runCargo(execFile, ["generate-lockfile", "--manifest-path", "src-tauri/Cargo.toml"]);
  const nextVersion = normalizeVersionOutput(stdout);

  await runGit(execFile, ["add", ...versionFiles]);
  await runGit(execFile, ["commit", "-m", `chore(release): bump version to ${nextVersion}`]);

  return nextVersion;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const nextVersion = await releaseVersion();
    console.log(`Version bumped and committed as ${nextVersion}.`);
    console.log(`Next: pnpm release:tag v${nextVersion}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
