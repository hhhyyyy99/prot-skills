import { render, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSkillLinks, getSkills, getTools, openFolder, setAllSkillToolLinks, setSkillToolLink, uninstallSkill } from '../../api';
import { AppProviders } from '../../shell/AppProviders';
import { MySkillsPage } from '../MySkillsPage';
import type { AITool, Skill, SkillLink, SyncSkillTargetsResult } from '../../types';

vi.mock('../../api', () => ({
  getSkillLinks: vi.fn(),
  getSkills: vi.fn(),
  getTools: vi.fn(),
  openFolder: vi.fn(),
  setAllSkillToolLinks: vi.fn(),
  setSkillToolLink: vi.fn(),
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

const mockSyncSuccess: SyncSkillTargetsResult = {
  status: 'success',
  success_count: 0,
  failure_count: 0,
  success_tools: [],
  failed_tools: [],
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
    vi.mocked(setAllSkillToolLinks).mockResolvedValue(mockSyncSuccess);
    vi.mocked(setSkillToolLink).mockResolvedValue(null);
    vi.mocked(uninstallSkill).mockResolvedValue();
  });

  it('shows empty state when no skills returned', async () => {
    vi.mocked(getSkills).mockResolvedValue([]);
    const { findByText } = renderPage();
    expect(await findByText('No Skills installed')).toBeInTheDocument();
  });

  it('renders skill name and row-level management actions', async () => {
    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    vi.mocked(getTools).mockResolvedValue(mockTools);
    vi.mocked(getSkillLinks).mockResolvedValue([mockLink]);
    const { findByRole, findByText, queryByRole, queryByText, getByLabelText } = renderPage();
    expect(await findByText('Test Skill')).toBeInTheDocument();
    expect(await findByText('1.0.0 · A test skill')).toBeInTheDocument();
    expect(queryByText('local')).not.toBeInTheDocument();
    expect(queryByText('Claude')).not.toBeInTheDocument();
    expect(queryByRole('tablist', { name: 'Installed skill filters' })).not.toBeInTheDocument();
    expect(getByLabelText('Test Skill linked tools')).toBeInTheDocument();
    const syncAll = await findByRole('switch', { name: 'Sync Test Skill to all tools' });
    const syncTargets = await findByRole('button', { name: 'Sync targets for Test Skill' });
    expect(syncAll).toBeChecked();
    expect(await findByRole('button', { name: 'Open Test Skill folder' })).toBeInTheDocument();
    expect(await findByRole('button', { name: 'Uninstall Test Skill' })).toBeInTheDocument();
    expect(syncTargets).toBeInTheDocument();
    expect(syncTargets.compareDocumentPosition(syncAll) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('rolls back sync-all switch when bulk link update rejects', async () => {
    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    vi.mocked(getTools).mockResolvedValue(mockTools);
    vi.mocked(getSkillLinks).mockResolvedValue([mockLink]);
    vi.mocked(setAllSkillToolLinks).mockRejectedValue(new Error('fail'));
    const { findByLabelText } = renderPage();
    const toggle = await findByLabelText('Sync Test Skill to all tools');
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(setAllSkillToolLinks).toHaveBeenCalledWith('skill-1', false);
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
    const { findByRole, findByText, queryByRole } = renderPage();

    await user.click(await findByRole('button', { name: 'Sync targets for Test Skill' }));

    expect(await findByRole('dialog', { name: 'Sync Test Skill' })).toBeInTheDocument();
    expect(await findByRole('tab', { name: 'All tools' })).toBeInTheDocument();
    expect(await findByText('Enabled tools')).toBeInTheDocument();
    expect(queryByRole('tab', { name: 'Pinned' })).not.toBeInTheDocument();
    expect(queryByRole('button', { name: 'Link all' })).not.toBeInTheDocument();
    expect(queryByRole('button', { name: 'Unlink all' })).not.toBeInTheDocument();
    const dialog = await findByRole('dialog', { name: 'Sync Test Skill' });
    expect(within(dialog).getByLabelText('Claude')).toBeInTheDocument();
    const claudeLink = await findByRole('switch', { name: 'Link Test Skill to Claude' });
    expect(claudeLink).toBeChecked();

    await user.click(claudeLink);

    await waitFor(() => {
      expect(setSkillToolLink).toHaveBeenCalledWith('skill-1', 'claude', false);
    });
  });

  it('can link and unlink all enabled tools from the row switch', async () => {
    const allLinks: SkillLink[] = [
      mockLink,
      {
        id: 2,
        skill_id: 'skill-1',
        tool_id: 'codex',
        link_path: '/home/user/.codex/skills/skill-1',
        is_active: true,
        created_at: '2024-01-01',
      },
    ];
    const syncAllSuccess: SyncSkillTargetsResult = {
      status: 'success',
      success_count: 2,
      failure_count: 0,
      success_tools: [
        { tool_id: 'claude', tool_name: 'Claude' },
        { tool_id: 'codex', tool_name: 'Codex' },
      ],
      failed_tools: [],
    };
    const syncRemoveSuccess: SyncSkillTargetsResult = {
      status: 'success',
      success_count: 2,
      failure_count: 0,
      success_tools: [
        { tool_id: 'claude', tool_name: 'Claude' },
        { tool_id: 'codex', tool_name: 'Codex' },
      ],
      failed_tools: [],
    };
    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    vi.mocked(getTools).mockResolvedValue(mockTools.map(tool => ({ ...tool, is_enabled: true })));
    vi.mocked(getSkillLinks)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(allLinks)
      .mockResolvedValueOnce([]);
    vi.mocked(setAllSkillToolLinks)
      .mockResolvedValueOnce(syncAllSuccess)
      .mockResolvedValueOnce(syncRemoveSuccess);
    const user = userEvent.setup();
    const { findByRole } = renderPage();

    const syncAll = await findByRole('switch', { name: 'Sync Test Skill to all tools' });
    expect(syncAll).not.toBeChecked();

    await user.click(syncAll);

    await waitFor(() => {
      expect(setAllSkillToolLinks).toHaveBeenCalledWith('skill-1', true);
    });
    expect(syncAll).toBeChecked();

    await user.click(syncAll);

    await waitFor(() => {
      expect(setAllSkillToolLinks).toHaveBeenCalledWith('skill-1', false);
    });
  });

  it('shows partial sync details when some tools fail during sync-all', async () => {
    const partialResult: SyncSkillTargetsResult = {
      status: 'partial',
      success_count: 1,
      failure_count: 1,
      success_tools: [{ tool_id: 'claude', tool_name: 'Claude' }],
      failed_tools: [{
        tool_id: 'codex',
        tool_name: 'Codex',
        reason_code: 'permission_denied',
        reason: 'No write permission',
      }],
    };
    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    vi.mocked(getTools).mockResolvedValue(mockTools.map(tool => ({ ...tool, is_enabled: true })));
    vi.mocked(getSkillLinks)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockLink]);
    vi.mocked(setAllSkillToolLinks).mockResolvedValueOnce(partialResult);
    const user = userEvent.setup();
    const { findByRole, findByText } = renderPage();

    await user.click(await findByRole('switch', { name: 'Sync Test Skill to all tools' }));

    expect(await findByText('Linked to 1 tools, 1 failed')).toBeInTheDocument();
    expect(await findByText('Codex (No write permission)')).toBeInTheDocument();
  });

  it('keeps sync-all switch off and shows failure details when all tools fail during sync-all', async () => {
    const failedResult: SyncSkillTargetsResult = {
      status: 'failed',
      success_count: 0,
      failure_count: 2,
      success_tools: [],
      failed_tools: [
        {
          tool_id: 'claude',
          tool_name: 'Claude',
          reason_code: 'permission_denied',
          reason: 'No write permission',
        },
        {
          tool_id: 'codex',
          tool_name: 'Codex',
          reason_code: 'permission_denied',
          reason: 'No write permission',
        },
      ],
    };
    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    vi.mocked(getTools).mockResolvedValue(mockTools.map(tool => ({ ...tool, is_enabled: true })));
    vi.mocked(getSkillLinks)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(setAllSkillToolLinks).mockResolvedValueOnce(failedResult);
    const user = userEvent.setup();
    const { findByRole, findByText } = renderPage();

    const syncAll = await findByRole('switch', { name: 'Sync Test Skill to all tools' });
    await user.click(syncAll);

    expect(await findByText('Failed to link to enabled tools')).toBeInTheDocument();
    expect(await findByText('Claude (No write permission), Codex (No write permission)')).toBeInTheDocument();
    await waitFor(() => {
      expect(syncAll).not.toBeChecked();
    });
  });

  it('shows compact overflow count when a skill is linked to more than four tools', async () => {
    const manyTools: AITool[] = [
      { id: 'claude', name: 'Claude', config_path: '/a', skills_subdir: 'skills', is_detected: true, is_enabled: true },
      { id: 'codex', name: 'Codex', config_path: '/b', skills_subdir: 'skills', is_detected: true, is_enabled: true },
      { id: 'gemini', name: 'Gemini', config_path: '/c', skills_subdir: 'skills', is_detected: true, is_enabled: true },
      { id: 'cursor', name: 'Cursor', config_path: '/d', skills_subdir: 'skills', is_detected: true, is_enabled: true },
      { id: 'windsurf', name: 'Windsurf', config_path: '/e', skills_subdir: 'skills', is_detected: true, is_enabled: true },
    ];
    const manyLinks: SkillLink[] = manyTools.map((tool, index) => ({
      id: index + 1,
      skill_id: 'skill-1',
      tool_id: tool.id,
      link_path: `${tool.config_path}/skills/skill-1`,
      is_active: true,
      created_at: '2024-01-01',
    }));

    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    vi.mocked(getTools).mockResolvedValue(manyTools);
    vi.mocked(getSkillLinks).mockResolvedValue(manyLinks);

    const { findByText } = renderPage();

    expect(await findByText('+1')).toBeInTheDocument();
  });
});
