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
  uninstallSkill: vi.fn().mockResolvedValue({
    status: "success",
    retryable: false,
    actions: [],
    warnings: [],
    failures: [],
  }),
  getSkillsDirPath: vi.fn().mockResolvedValue("/Users/test/.prot-skills/skills"),
  openFolder: vi.fn().mockResolvedValue(undefined),
  scanLocalSkills: vi.fn().mockResolvedValue([]),
  scanAllLocalSkills: vi.fn().mockResolvedValue([]),
  migrateLocalSkill: vi.fn().mockResolvedValue({
    report: { status: "success", retryable: false, actions: [], warnings: [], failures: [] },
  }),
  getSkillLinks: vi.fn().mockResolvedValue([]),
  setAllSkillToolLinks: vi.fn().mockResolvedValue([]),
  setSkillToolLink: vi.fn().mockResolvedValue(null),
}));

const LINUX_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64)";
const MAC_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
const WINDOWS_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

function setUserAgent(userAgent: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
}

function renderShell() {
  return render(<AppShell />, { wrapper: AppProviders });
}

describe("AppShell", () => {
  beforeEach(() => {
    localStorage.clear();
    setUserAgent(LINUX_USER_AGENT);
  });

  it("shows My Skills page by default and removes Discovery from primary navigation", () => {
    const { getByRole, queryByRole } = renderShell();
    expect(getByRole("heading", { name: "Prot Skills" })).toBeInTheDocument();
    expect(getByRole("button", { name: "My Skills" })).toHaveAttribute("aria-current", "page");
    expect(queryByRole("button", { name: "Discovery" })).not.toBeInTheDocument();
  });

  it("keeps the macOS window chrome empty while exposing a draggable titlebar", () => {
    setUserAgent(MAC_USER_AGENT);
    const { getByRole } = renderShell();
    const chrome = getByRole("banner", { name: "Application" });

    expect(chrome).toHaveAttribute("data-tauri-drag-region");
    expect(within(chrome).queryByText("Prot Skills")).not.toBeInTheDocument();
    expect(chrome).toHaveClass("bg-canvas");
    expect(getByRole("heading", { name: "Prot Skills" })).toBeInTheDocument();
  });

  it("does not reserve empty titlebar space on Windows", () => {
    setUserAgent(WINDOWS_USER_AGENT);
    const { getByRole, queryByRole } = renderShell();

    expect(queryByRole("banner", { name: "Application" })).not.toBeInTheDocument();
    expect(getByRole("heading", { name: "Prot Skills" })).toBeInTheDocument();
  });

  it("does not reserve empty titlebar space on Linux", () => {
    const { getByRole, queryByRole } = renderShell();

    expect(queryByRole("banner", { name: "Application" })).not.toBeInTheDocument();
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
