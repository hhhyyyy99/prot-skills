import { render, act, within } from '@testing-library/react';
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
  getSkillLinks: vi.fn().mockResolvedValue([]),
  setAllSkillToolLinks: vi.fn().mockResolvedValue([]),
  setSkillToolLink: vi.fn().mockResolvedValue(null),
}));

function renderShell() {
  return render(<AppShell />, { wrapper: AppProviders });
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows My Skills page by default and removes Discovery from primary navigation', () => {
    const { getByRole, queryByRole } = renderShell();
    expect(getByRole('heading', { name: 'My Skills' })).toBeInTheDocument();
    expect(queryByRole('button', { name: 'Discovery' })).not.toBeInTheDocument();
  });

  it('renders the app name in the window chrome', () => {
    const { getByRole } = renderShell();
    const chrome = getByRole('banner', { name: 'Application' });

    expect(within(chrome).getByText('Prot Skills')).toBeInTheDocument();
    expect(chrome).toHaveClass('bg-canvas');
  });

  it('switches to Tools on Mod+2 keydown', () => {
    const { getByRole } = renderShell();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', metaKey: true, ctrlKey: true, bubbles: true }));
    });
    expect(getByRole('heading', { name: 'Tools' })).toBeInTheDocument();
  });

  it('renders app chrome in Simplified Chinese when preference is saved', () => {
    localStorage.setItem('ui.language', 'zh-CN');
    const { getByRole, getAllByText } = renderShell();

    expect(getAllByText('我的技能').length).toBeGreaterThan(0);
    expect(getByRole('heading', { name: '我的技能' })).toBeInTheDocument();
  });
});
