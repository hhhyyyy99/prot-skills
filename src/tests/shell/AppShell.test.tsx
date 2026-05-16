import { render, act, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppShell } from "@/shell/AppShell";
import { AppProviders } from "@/shell/AppProviders";

vi.mock("../../api", () => ({
  getTools: vi.fn().mockResolvedValue([]),
  detectTools: vi.fn().mockResolvedValue([]),
  toggleTool: vi.fn(),
  getSkills: vi.fn().mockResolvedValue([]),
  toggleSkill: vi.fn(),
  uninstallSkill: vi.fn(),
  getSkillsDirPath: vi.fn().mockResolvedValue("/Users/test/.prot-skills/skills"),
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

describe("AppShell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows My Skills page by default and removes Discovery from primary navigation", () => {
    const { getByRole, queryByRole } = renderShell();
    expect(getByRole("heading", { name: "Prot Skills" })).toBeInTheDocument();
    expect(getByRole("button", { name: "My Skills" })).toHaveAttribute("aria-current", "page");
    expect(queryByRole("button", { name: "Discovery" })).not.toBeInTheDocument();
  });

  it("keeps the window chrome empty while exposing a draggable titlebar", () => {
    const { getByRole } = renderShell();
    const chrome = getByRole("banner", { name: "Application" });

    expect(chrome).toHaveAttribute("data-tauri-drag-region");
    expect(within(chrome).queryByText("Prot Skills")).not.toBeInTheDocument();
    expect(chrome).toHaveClass("bg-canvas");
    expect(getByRole("heading", { name: "Prot Skills" })).toBeInTheDocument();
  });

  it("switches to Tools on Mod+2 keydown", () => {
    const { getByRole } = renderShell();
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "2", metaKey: true, ctrlKey: true, bubbles: true }),
      );
    });
    expect(getByRole("heading", { name: "Prot Skills" })).toBeInTheDocument();
    expect(getByRole("button", { name: "Tools" })).toHaveAttribute("aria-current", "page");
  });

  it("renders app chrome in Simplified Chinese when preference is saved", () => {
    localStorage.setItem("ui.language", "zh-CN");
    const { getByRole, getAllByText } = renderShell();

    expect(getAllByText("我的技能").length).toBeGreaterThan(0);
    expect(getByRole("heading", { name: "Prot Skills" })).toBeInTheDocument();
  });
});
