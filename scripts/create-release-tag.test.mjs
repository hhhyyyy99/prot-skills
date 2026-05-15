import { describe, expect, it } from 'vitest';
import { createReleaseTag } from './create-release-tag.mjs';

describe('createReleaseTag', () => {
  it('creates and pushes an annotated tag', async () => {
    const calls = [];
    const execFile = async (command, args) => {
      calls.push({ command, args });
    };

    await createReleaseTag({
      args: ['v0.0.1'],
      execFile,
    });

    expect(calls).toEqual([
      {
        command: 'git',
        args: ['tag', '-a', 'v0.0.1', '-m', 'Release v0.0.1'],
      },
      {
        command: 'git',
        args: ['push', 'origin', 'v0.0.1'],
      },
    ]);
  });

  it('supports overriding the remote name', async () => {
    const calls = [];
    const execFile = async (command, args) => {
      calls.push({ command, args });
    };

    await createReleaseTag({
      args: ['v0.0.1', '--remote', 'upstream'],
      execFile,
    });

    expect(calls[1]).toEqual({
      command: 'git',
      args: ['push', 'upstream', 'v0.0.1'],
    });
  });

  it('rejects missing tag names', async () => {
    await expect(
      createReleaseTag({
        args: [],
        execFile: async () => {},
      }),
    ).rejects.toThrow('Usage: pnpm release:tag <vX.Y.Z> [--remote <name>]');
  });

  it('rejects tags without a v prefix', async () => {
    await expect(
      createReleaseTag({
        args: ['0.0.1'],
        execFile: async () => {},
      }),
    ).rejects.toThrow('Release tag must start with "v"');
  });
});
