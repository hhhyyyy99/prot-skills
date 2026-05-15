import { render, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTools, scanLocalSkills, scanAllLocalSkills, migrateLocalSkill } from '../../api';
import { AppProviders } from '../../shell/AppProviders';
import { MigratePage } from '../MigratePage';
import type { AITool, LocalSkill, Skill } from '../../types';

vi.mock('../../api', () => ({
  getTools: vi.fn(),
  scanLocalSkills: vi.fn(),
  scanAllLocalSkills: vi.fn(),
  migrateLocalSkill: vi.fn(),
}));

const mockTool: AITool = {
  id: 'cursor',
  name: 'Cursor',
  config_path: '/home/.cursor',
  skills_subdir: 'skills',
  is_detected: true,
  is_enabled: true,
};

const secondTool: AITool = {
  id: 'claude',
  name: 'Claude',
  config_path: '/home/.claude',
  skills_subdir: 'skills',
  is_detected: true,
  is_enabled: true,
};

const mockSkills: LocalSkill[] = [
  { name: 'Skill A', path: '/skills/a', is_symlink: false },
  { name: 'Skill B', path: '/skills/b', is_symlink: true, target_path: '/real/b' },
];

function renderPage() {
  return render(<MigratePage />, { wrapper: AppProviders });
}

describe('MigratePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scanAllLocalSkills).mockRejectedValue(new Error('batch unavailable'));
  });

  it('shows detected tool in selector after load', async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    const { findByText } = renderPage();
    expect(await findByText('Cursor')).toBeInTheDocument();
  });

  it('shows Selected 1 in toolbar after checking one skill', async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills);
    const { findByText, getByLabelText } = renderPage();
    await findByText('Cursor');
    fireEvent.click(await findByText('Scan'));
    await findByText('Skill A');
    fireEvent.click(getByLabelText('Select Skill A'));
    expect(await findByText('Selected 1')).toBeInTheDocument();
  });

  it('shows Retry button on failed row after migrate', async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills);
    // Both reject so success=0 and no re-scan is triggered
    vi.mocked(migrateLocalSkill)
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'));
    const { findByText, getByLabelText, findAllByRole } = renderPage();
    await findByText('Cursor');
    fireEvent.click(await findByText('Scan'));
    await findByText('Skill A');
    fireEvent.click(getByLabelText('Select Skill A'));
    fireEvent.click(getByLabelText('Select Skill B'));
    fireEvent.click(await findByText(/Migrate selected/));
    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledTimes(2);
    });
    const retryButtons = await findAllByRole('button', { name: 'Retry' });
    expect(retryButtons.length).toBe(2);
  });

  it('shows a progress bar while migration is running', async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills);
    let resolveFirstMigration: ((value: Skill | PromiseLike<Skill>) => void) | undefined;
    vi.mocked(migrateLocalSkill)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstMigration = resolve; }))
      .mockResolvedValueOnce({} as never);
    const user = userEvent.setup();
    const { findByText, getByLabelText, findByRole } = renderPage();

    await findByText('Cursor');
    await user.click(await findByText('Scan'));
    await findByText('Skill A');
    await user.click(getByLabelText('Select Skill A'));
    await user.click(getByLabelText('Select Skill B'));
    await user.click(await findByText(/Migrate selected/));

    const progressBar = await findByRole('progressbar', { name: 'Migration progress' });
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(await findByText('Preparing migration queue…')).toBeInTheDocument();

    resolveFirstMigration?.({} as Skill);
  });

  it('clears hidden selections when switching tool filters', async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool, secondTool]);
    vi.mocked(scanAllLocalSkills).mockResolvedValue([
      { name: 'Skill A', path: '/skills/a', is_symlink: false, tool_id: 'cursor', tool_name: 'Cursor' },
      { name: 'Skill C', path: '/skills/c', is_symlink: false, tool_id: 'claude', tool_name: 'Claude' },
    ]);
    const user = userEvent.setup();
    const { findByText, getByLabelText, findByRole, queryByText } = renderPage();

    await findByText('Skill A');
    await user.click(getByLabelText('Select Skill A'));
    expect(await findByText('Selected 1')).toBeInTheDocument();

    await user.click(await findByRole('tab', { name: 'Claude' }));

    await waitFor(() => {
      expect(queryByText('Selected 1')).not.toBeInTheDocument();
    });
    expect(queryByText('Migrate selected (1)')).not.toBeInTheDocument();
  });

  it('shows tool-specific empty copy when the current tool has no skills', async () => {
    const traeTool: AITool = {
      id: 'trae',
      name: 'Trae',
      config_path: '/home/.trae',
      skills_subdir: 'skills',
      is_detected: true,
      is_enabled: true,
    };

    vi.mocked(getTools).mockResolvedValue([mockTool, traeTool]);
    vi.mocked(scanAllLocalSkills).mockResolvedValue([
      { name: 'Skill A', path: '/skills/a', is_symlink: false, tool_id: 'cursor', tool_name: 'Cursor' },
    ]);

    const user = userEvent.setup();
    const { findByText, findByRole } = renderPage();

    await findByText('Skill A');
    await user.click(await findByRole('tab', { name: 'Trae' }));

    expect(await findByText('No Skills found for this tool')).toBeInTheDocument();
    expect(await findByText('No skills found in this tool\'s folder')).toBeInTheDocument();
  });
});
