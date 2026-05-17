import { render, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTools, detectTools, deleteTool, openFolder } from "@/api";
import { AppProviders } from "@/shell/AppProviders";
import { ToolsPage } from "@/pages/ToolsPage";
import type { AITool } from "@/types";

vi.mock("../../api", () => ({
  getTools: vi.fn(),
  detectTools: vi.fn(),
  toggleTool: vi.fn(),
  deleteTool: vi.fn(),
  openFolder: vi.fn(),
}));

const mockTool: AITool = {
  id: "tool-1",
  name: "Cursor",
  config_path: "/home/user/.cursor/config.json",
  skills_subdir: "skills",
  is_detected: true,
  is_enabled: true,
  custom_path: "/custom/cursor",
};

function renderPage() {
  return render(<ToolsPage />, { wrapper: AppProviders });
}

describe("ToolsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(openFolder).mockResolvedValue();
    vi.mocked(deleteTool).mockResolvedValue();
  });

  it("shows empty state when no agent tools are detected", async () => {
    vi.mocked(getTools).mockResolvedValue([]);
    const { findByText } = renderPage();
    expect(await findByText("No agent tools detected")).toBeInTheDocument();
  });

  it("renders tool name and badge when tool is returned", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    const { findByText } = renderPage();
    expect(await findByText("Cursor")).toBeInTheDocument();
    expect(await findByText("Detected")).toBeInTheDocument();
  });

  it("calls detectTools when Scan tools is clicked", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(detectTools).mockResolvedValue([mockTool]);
    const { findByRole } = renderPage();
    const btn = await findByRole("button", { name: /scan tools/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(detectTools).toHaveBeenCalled();
    });
  });

  it("opens the custom tool path from the row action", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    const user = userEvent.setup();
    const { findByRole } = renderPage();

    await user.click(await findByRole("button", { name: "Open path" }));

    expect(openFolder).toHaveBeenCalledWith("/custom/cursor");
  });

  it("shows a remove confirmation popover before deleting a tool", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    const user = userEvent.setup();
    const { findByRole, findByText } = renderPage();
    const deleteButton = await findByRole("button", { name: "Delete tool" });

    await user.click(deleteButton);
    expect(deleteTool).not.toHaveBeenCalled();

    expect(await findByText('Remove "Cursor"?')).toBeInTheDocument();
    await user.click(await findByRole("button", { name: "Remove" }));

    expect(deleteTool).toHaveBeenCalledWith("tool-1");
  });
});
