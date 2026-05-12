import { render, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSkills, toggleSkill } from '../../api';
import { AppProviders } from '../../shell/AppProviders';
import { MySkillsPage } from '../MySkillsPage';
import type { Skill } from '../../types';

vi.mock('../../api', () => ({
  getSkills: vi.fn(),
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

function renderPage() {
  return render(<MySkillsPage />, { wrapper: AppProviders });
}

describe('MySkillsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no skills returned', async () => {
    vi.mocked(getSkills).mockResolvedValue([]);
    const { findByText } = renderPage();
    expect(await findByText('No Skills installed')).toBeInTheDocument();
  });

  it('renders skill name and opens DetailPanel on row click', async () => {
    vi.mocked(getSkills).mockResolvedValue([mockSkill]);
    const user = userEvent.setup();
    const { findByText, getByRole } = renderPage();
    expect(await findByText('Test Skill')).toBeInTheDocument();
    const row = getByRole('listitem');
    await user.click(row);
    await waitFor(() => {
      expect(getByRole('complementary')).toBeInTheDocument();
    });
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
});
