import { render, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSkillLinks, getSkills, getTools, openFolder, setSkillToolLink, toggleSkill, uninstallSkill } from '../../api';
import { AppProviders } from '../../shell/AppProviders';
import { MySkillsPage } from '../MySkillsPage';
import type { AITool, Skill, SkillLink } from '../../types';

vi.mock('../../api', () => ({
  getSkillLinks: vi.fn(),
  getSkills: vi.fn(),
  getTools: vi.fn(),
  openFolder: vi.fn(),
  setSkillToolLink: vi.fn(),
  toggleSkill: vi.fn(),
  uninstallSkill: vi.fn(),
}));

const mockSkill: Skill = {
  id: 'skill-1',
  name: 'Test Skill',
  source_type: 'local',
  local_path: '/path/to/skill',
  installed_at: '2024-01-01',
  updated_at: '2024-01-02',
  is_enabled: true,
  metadata: { description: 'A test skill', tags: ['test'], version: '1.0.0' },
};

const mockTools: AITool[] = [
  {
    id: 'claude',
    name: 'Claude',
    config_path: '/home/user/.claude',
    skills_subdir: 'skills',
    is_detected: true,
    is_enabled: true,
  },
  {
    id: 'codex',
    name: 'Codex',
    config_path: '/home/user/.codex',
    skills_subdir: 'skills',
    is_detected: true,
    is_enabled: false,
  },
];

const mockLink: SkillLink = {
  id: 1,
  skill_id: 'skill-1',
  tool_id: 'claude',
  link_path: '/home/user/.claude/skills/skill-1',
  is_active: true,
  created_at: '2024-01-01',
};

function renderPage() {
  return render(<MySkillsPage />, { wrapper: AppProviders });
}

describe('MySkillsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTools).mockResolvedValue([]);
    vi.mocked(getSkillLinks).mockResolvedValue([]);
    vi.mocked(openFolder).mockResolvedValue();
    vi.mocked(setSkillToolLink).mockResolvedValue(null);
    vi.mocked(toggleSkill).mockResolvedValue();
    vi.mocked(uninstallSkill).mockResolvedValue();
  });

  it('shows empty state when no skills returned', async () => {
    vi.mocked(getSkills).mockResolvedValue([]);
    const { findByText } = renderPage();
    expect(await findByText('No Skills installed')).toBeInTheDocument();
  });

  it('renders skill name and row-level management actions', async () => {
    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    const { findByRole, findByText } = renderPage();
    expect(await findByText('Test Skill')).toBeInTheDocument();
    expect(await findByRole('button', { name: 'Open Test Skill folder' })).toBeInTheDocument();
    expect(await findByRole('button', { name: 'Uninstall Test Skill' })).toBeInTheDocument();
    expect(await findByRole('button', { name: 'Sync targets for Test Skill' })).toBeInTheDocument();
  });

  it('rolls back UI when toggleSkill rejects', async () => {
    vi.mocked(getSkills).mockResolvedValue([{ ...mockSkill, is_enabled: true }]);
    vi.mocked(toggleSkill).mockRejectedValue(new Error('fail'));
    const { findByLabelText } = renderPage();
    const toggle = await findByLabelText('Toggle Test Skill');
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
  });

  it('opens the skill folder from the row action', async () => {
    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    const user = userEvent.setup();
    const { findByRole } = renderPage();
    await user.click(await findByRole('button', { name: 'Open Test Skill folder' }));

    expect(openFolder).toHaveBeenCalledWith('/path/to/skill');
  });

  it('uninstalls from the row action after confirmation click', async () => {
    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    const user = userEvent.setup();
    const { findByRole } = renderPage();
    const uninstall = await findByRole('button', { name: 'Uninstall Test Skill' });

    await user.click(uninstall);
    await user.click(uninstall);

    expect(uninstallSkill).toHaveBeenCalledWith('skill-1');
  });

  it('opens sync targets dialog and toggles a tool link', async () => {
    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    vi.mocked(getTools).mockResolvedValue(mockTools);
    vi.mocked(getSkillLinks).mockResolvedValue([mockLink]);
    const user = userEvent.setup();
    const { findByRole } = renderPage();

    await user.click(await findByRole('button', { name: 'Sync targets for Test Skill' }));

    expect(await findByRole('dialog', { name: 'Sync Test Skill' })).toBeInTheDocument();
    const claudeLink = await findByRole('switch', { name: 'Link Test Skill to Claude' });
    expect(claudeLink).toBeChecked();

    await user.click(claudeLink);

    await waitFor(() => {
      expect(setSkillToolLink).toHaveBeenCalledWith('skill-1', 'claude', false);
    });
  });
});
