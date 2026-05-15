import { describe, expect, it } from 'vitest';
import { releaseVersion } from './release-version.mjs';

describe('releaseVersion', () => {
  it('bumps a patch version, syncs app metadata, and commits the version files', async () => {
    const calls = [];
    const execFile = async (command, args) => {
      calls.push({ command, args });
      if (args[0] === 'version') {
        return { stdout: 'v0.0.2\n' };
      }
      return { stdout: '' };
    };

    const nextVersion = await releaseVersion({
      args: ['patch'],
      execFile,
    });

    expect(nextVersion).toBe('0.0.2');
    expect(calls).toEqual([
      {
        command: 'pnpm',
        args: ['version', 'patch', '--no-git-tag-version'],
      },
      {
        command: 'pnpm',
        args: ['app:sync'],
      },
      {
        command: 'git',
        args: [
          'add',
          'package.json',
          'src-tauri/Cargo.toml',
          'src-tauri/tauri.conf.json',
          'src-tauri/Cargo.lock',
        ],
      },
      {
        command: 'git',
        args: ['commit', '-m', 'chore(release): bump version to 0.0.2'],
      },
    ]);
  });

  it('bumps a minor version and uses the bumped version in the commit message', async () => {
    const calls = [];
    const execFile = async (command, args) => {
      calls.push({ command, args });
      if (args[0] === 'version') {
        return { stdout: 'v0.1.0\n' };
      }
      return { stdout: '' };
    };

    const nextVersion = await releaseVersion({
      args: ['minor'],
      execFile,
    });

    expect(nextVersion).toBe('0.1.0');
    expect(calls[0]).toEqual({
      command: 'pnpm',
      args: ['version', 'minor', '--no-git-tag-version'],
    });
    expect(calls.at(-1)).toEqual({
      command: 'git',
      args: ['commit', '-m', 'chore(release): bump version to 0.1.0'],
    });
  });

  it('rejects missing release levels', async () => {
    await expect(
      releaseVersion({
        args: [],
        execFile: async () => ({ stdout: '' }),
      }),
    ).rejects.toThrow('Usage: pnpm release:version <patch|minor|major>');
  });

  it('rejects unsupported release levels', async () => {
    await expect(
      releaseVersion({
        args: ['beta'],
        execFile: async () => ({ stdout: '' }),
      }),
    ).rejects.toThrow('Release level must be one of: patch, minor, major');
  });
});
