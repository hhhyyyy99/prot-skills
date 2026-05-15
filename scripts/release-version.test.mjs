import { describe, expect, it } from 'vitest';
import { releaseVersion } from './release-version.mjs';

describe('releaseVersion', () => {
  it('bumps a patch version and syncs app metadata', async () => {
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
    ]);
  });

  it('bumps a minor version and syncs app metadata', async () => {
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
