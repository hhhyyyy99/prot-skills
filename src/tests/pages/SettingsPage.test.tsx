import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThemeProvider } from "@/shell/ThemeProvider";
import { LanguageProvider } from "@/shell/LanguageProvider";
import { ToastProvider } from "@/shell/ToastProvider";
import { SettingsPage } from "@/pages/SettingsPage";
import packageJson from "../../../package.json";

const appName = packageJson.productName ?? packageJson.name;

vi.mock("../../api", () => ({
  getSkillsDirPath: vi.fn(() => Promise.resolve("/Users/test/.prot-skills/skills")),
  openFolder: vi.fn(() => Promise.resolve()),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>{children}</ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders theme icon controls with System as default", async () => {
    const { getByRole, findByText } = render(<SettingsPage />, { wrapper: Wrapper });
    expect(getByRole("button", { name: "System" })).toBeInTheDocument();
    expect(getByRole("button", { name: "Light" })).toBeInTheDocument();
    expect(getByRole("button", { name: "Dark" })).toBeInTheDocument();
    await findByText("/Users/test/.prot-skills/skills");
  });

  it("applies dark theme when localStorage has dark preference", async () => {
    localStorage.setItem("ui.theme", "dark");
    const { findByText } = render(<SettingsPage />, { wrapper: Wrapper });
    expect(document.documentElement.dataset.theme).toBe("dark");
    await findByText("/Users/test/.prot-skills/skills");
  });

  it("About section contains Prot Skills", async () => {
    const { getAllByText, findByText } = render(<SettingsPage />, { wrapper: Wrapper });
    expect(getAllByText(appName).length).toBeGreaterThan(0);
    await findByText("/Users/test/.prot-skills/skills");
  });

  it("renders app version from package metadata", async () => {
    const { getByText, findByText } = render(<SettingsPage />, { wrapper: Wrapper });
    expect(getByText(`Version ${packageJson.version} · Build dev`)).toBeInTheDocument();
    await findByText("/Users/test/.prot-skills/skills");
  });

  it("loads and displays real skills folder path from backend", async () => {
    const { findByText } = render(<SettingsPage />, { wrapper: Wrapper });
    expect(await findByText("/Users/test/.prot-skills/skills")).toBeInTheDocument();
  });

  it("Open folder button is disabled until path resolves", async () => {
    const { getByRole } = render(<SettingsPage />, { wrapper: Wrapper });
    const btn = getByRole("button", { name: /Open folder/i });
    expect(btn).toBeDisabled();
    await waitFor(() => expect(btn).not.toBeDisabled());
  });
});
