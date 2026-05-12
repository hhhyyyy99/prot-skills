import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppShell } from '../AppShell';
import { AppProviders } from '../AppProviders';

vi.mock('../../api', () => ({
  getTools: vi.fn().mockResolvedValue([]),
  detectTools: vi.fn().mockResolvedValue([]),
  toggleTool: vi.fn(),
  getSkills: vi.fn().mockResolvedValue([]),
  toggleSkill: vi.fn(),
  uninstallSkill: vi.fn(),
  scanLocalSkills: vi.fn().mockResolvedValue([]),
  migrateLocalSkill: vi.fn().mockResolvedValue({}),
}));

function renderShell() {
  return render(<AppShell />, { wrapper: AppProviders });
}

describe('AppShell', () => {
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
});
