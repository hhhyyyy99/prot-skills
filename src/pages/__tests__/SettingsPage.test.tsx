import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider } from '../../shell/ThemeProvider';
import { ToastProvider } from '../../shell/ToastProvider';
import { SettingsPage } from '../SettingsPage';

vi.mock('../../api', () => ({
  getSkillsDirPath: vi.fn(() => Promise.resolve('/Users/test/.ai-skills-manager/skills')),
  openFolder: vi.fn(() => Promise.resolve()),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Theme select with System as default', () => {
    const { getByText } = render(<SettingsPage />, { wrapper: Wrapper });
    expect(getByText('System')).toBeInTheDocument();
  });

  it('applies dark theme when localStorage has dark preference', () => {
    localStorage.setItem('ui.theme', 'dark');
    render(<SettingsPage />, { wrapper: Wrapper });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('About section contains AI Skills Manager', () => {
    const { getByText } = render(<SettingsPage />, { wrapper: Wrapper });
    expect(getByText('AI Skills Manager')).toBeInTheDocument();
  });

  it('loads and displays real skills folder path from backend', async () => {
    const { findByText } = render(<SettingsPage />, { wrapper: Wrapper });
    expect(await findByText('/Users/test/.ai-skills-manager/skills')).toBeInTheDocument();
  });

  it('Open folder button is disabled until path resolves', async () => {
    const { getByRole } = render(<SettingsPage />, { wrapper: Wrapper });
    const btn = getByRole('button', { name: /Open folder/i });
    expect(btn).toBeDisabled();
    await waitFor(() => expect(btn).not.toBeDisabled());
  });
});
