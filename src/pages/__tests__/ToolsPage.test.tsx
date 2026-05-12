import { render, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTools, detectTools } from '../../api';
import { AppProviders } from '../../shell/AppProviders';
import { ToolsPage } from '../ToolsPage';
import type { AITool } from '../../types';

vi.mock('../../api', () => ({
  getTools: vi.fn(),
  detectTools: vi.fn(),
  toggleTool: vi.fn(),
}));

const mockTool: AITool = {
  id: 'tool-1',
  name: 'Cursor',
  config_path: '/home/user/.cursor/config.json',
  skills_subdir: 'skills',
  is_detected: true,
  is_enabled: true,
};

function renderPage() {
  return render(<ToolsPage />, { wrapper: AppProviders });
}

describe('ToolsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no agent tools are detected', async () => {
    vi.mocked(getTools).mockResolvedValue([]);
    const { findByText } = renderPage();
    expect(await findByText('No agent tools detected')).toBeInTheDocument();
  });

  it('renders tool name and badge when tool is returned', async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    const { findByText } = renderPage();
    expect(await findByText('Cursor')).toBeInTheDocument();
    expect(await findByText('Detected')).toBeInTheDocument();
  });

  it('calls detectTools when Scan tools is clicked', async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(detectTools).mockResolvedValue([mockTool]);
    const { findByRole } = renderPage();
    const btn = await findByRole('button', { name: /scan tools/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(detectTools).toHaveBeenCalled();
    });
  });
});
