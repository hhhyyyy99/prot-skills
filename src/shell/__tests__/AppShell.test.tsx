import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppShell } from '../AppShell';
import { AppProviders } from '../AppProviders';

vi.mock('../../api', () => ({
  getTools: vi.fn().mockResolvedValue([]),
  detectTools: vi.fn().mockResolvedValue([]),
  toggleTool: vi.fn(),
  getSkills: vi.fn().mockResolvedValue([]),
  toggleSkill: vi.fn(),
  uninstallSkill: vi.fn(),
  getSkillsDirPath: vi.fn().mockResolvedValue('/Users/test/.prot-skills/skills'),
  openFolder: vi.fn().mockResolvedValue(undefined),
  scanLocalSkills: vi.fn().mockResolvedValue([]),
  scanAllLocalSkills: vi.fn().mockResolvedValue([]),
  migrateLocalSkill: vi.fn().mockResolvedValue({}),
}));

function renderShell() {
  return render(<AppShell />, { wrapper: AppProviders });
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows Discovery page by default', () => {
    const { getByRole } = renderShell();
    expect(getByRole('heading', { name: 'Discovery' })).toBeInTheDocument();
  });

  it('switches to My Skills on Mod+2 keydown', () => {
    const { getByRole } = renderShell();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', metaKey: true, ctrlKey: true, bubbles: true }));
    });
    expect(getByRole('heading', { name: 'My Skills' })).toBeInTheDocument();
  });

  it('renders app chrome in Simplified Chinese when preference is saved', () => {
    localStorage.setItem('ui.language', 'zh-CN');
    const { getByRole, getAllByText } = renderShell();

    expect(getAllByText('发现').length).toBeGreaterThan(0);
    expect(getByRole('heading', { name: '发现' })).toBeInTheDocument();
  });
});
