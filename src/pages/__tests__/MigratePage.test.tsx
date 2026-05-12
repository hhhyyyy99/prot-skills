import { render, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTools, scanLocalSkills, migrateLocalSkill } from '../../api';
import { AppProviders } from '../../shell/AppProviders';
import { MigratePage } from '../MigratePage';
import type { AITool, LocalSkill } from '../../types';

vi.mock('../../api', () => ({
  getTools: vi.fn(),
  scanLocalSkills: vi.fn(),
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

const mockSkills: LocalSkill[] = [
  { name: 'Skill A', path: '/skills/a', is_symlink: false },
  { name: 'Skill B', path: '/skills/b', is_symlink: true, target_path: '/real/b' },
];

function renderPage() {
  return render(<MigratePage />, { wrapper: AppProviders });
}

describe('MigratePage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
});
