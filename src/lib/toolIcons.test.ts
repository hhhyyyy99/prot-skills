import { describe, expect, it } from 'vitest';
import { resolveToolIcon } from './toolIcons';
import type { AITool } from '../types';

function makeTool(overrides: Partial<AITool> = {}): AITool {
  return {
    id: 'test-tool',
    name: 'Test Tool',
    config_path: '/tmp/test-tool',
    skills_subdir: 'skills',
    is_detected: true,
    is_enabled: true,
    ...overrides,
  };
}

describe('resolveToolIcon', () => {
  it('matches opencode by id', () => {
    const resolved = resolveToolIcon(makeTool({ id: 'opencode', name: 'OpenCode' }));

    expect(resolved).toMatchObject({
      slug: 'opencode',
      label: 'OpenCode',
    });
    expect(resolved?.src).toContain('/opencode.svg');
  });

  it('uses a bundled local asset for kiro', () => {
    const resolved = resolveToolIcon(makeTool({ id: 'kiro', name: 'Kiro' }));

    expect(resolved).toMatchObject({
      slug: 'kiro',
      label: 'Kiro',
    });
    expect(resolved?.src).toContain('/src/assets/tool-icons/kiro.svg');
  });
});
