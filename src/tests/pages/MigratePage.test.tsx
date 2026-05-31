import { render, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTools,
  scanLocalSkills,
  scanAllLocalSkills,
  migrateLocalSkill,
  preflightMigrateLocalSkill,
} from "@/api";
import { AppProviders } from "@/shell/AppProviders";
import { MigratePage } from "@/pages/MigratePage";
import type { AITool, LifecycleReport, LocalSkill, MigrationResult } from "@/types";

vi.mock("../../api", () => ({
  getTools: vi.fn(),
  scanLocalSkills: vi.fn(),
  scanAllLocalSkills: vi.fn(),
  migrateLocalSkill: vi.fn(),
  preflightMigrateLocalSkill: vi.fn(),
}));

const mockTool: AITool = {
  id: "cursor",
  name: "Cursor",
  config_path: "/home/.cursor",
  skills_subdir: "skills",
  is_detected: true,
  is_enabled: true,
};

const secondTool: AITool = {
  id: "claude",
  name: "Claude",
  config_path: "/home/.claude",
  skills_subdir: "skills",
  is_detected: true,
  is_enabled: true,
};

const mockSkills: LocalSkill[] = [
  { name: "Skill A", path: "/skills/a", is_symlink: false },
  { name: "Skill B", path: "/skills/b", is_symlink: true, target_path: "/real/b" },
];

const successReport: LifecycleReport = {
  status: "success",
  retryable: false,
  actions: [],
  warnings: [],
  failures: [],
};

const successMigration: MigrationResult = {
  report: successReport,
};

function renderPage() {
  return render(<MigratePage />, { wrapper: AppProviders });
}

describe("MigratePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scanAllLocalSkills).mockRejectedValue(new Error("batch unavailable"));
    vi.mocked(preflightMigrateLocalSkill).mockResolvedValue({
      skill_id: "alpha",
      source_path: "/skills/a",
      managed_target_path: "/managed/alpha",
      original_replacement_path: "/skills/a",
      report: {
        status: "success",
        retryable: false,
        actions: [],
        warnings: [],
        failures: [],
      },
    });
  });

  it("shows detected tool in selector after load", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    const { findByText } = renderPage();
    expect(await findByText("Cursor")).toBeInTheDocument();
  });

  it("shows Selected 1 in toolbar after checking one skill", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills);
    const { findByText, getByLabelText } = renderPage();
    await findByText("Cursor");
    fireEvent.click(await findByText("Scan"));
    await findByText("Skill A");
    fireEvent.click(getByLabelText("Select Skill A"));
    expect(await findByText("Selected 1 / 2")).toBeInTheDocument();
  });

  it("shows Retry button on failed row after migrate", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills);
    // Both reject so success=0 and no re-scan is triggered
    vi.mocked(migrateLocalSkill)
      .mockRejectedValueOnce(new Error("fail1"))
      .mockRejectedValueOnce(new Error("fail2"));
    const { findByText, getByLabelText, findAllByRole } = renderPage();
    await findByText("Cursor");
    fireEvent.click(await findByText("Scan"));
    await findByText("Skill A");
    fireEvent.click(getByLabelText("Select Skill A"));
    fireEvent.click(getByLabelText("Select Skill B"));
    fireEvent.click(await findByText(/Migrate selected/));
    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledTimes(2);
    });
    const retryButtons = await findAllByRole("button", { name: "Retry" });
    expect(retryButtons.length).toBe(2);
  });

  it("shows a progress bar while migration is running", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills);
    let resolveFirstMigration:
      | ((value: MigrationResult | PromiseLike<MigrationResult>) => void)
      | undefined;
    vi.mocked(migrateLocalSkill)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstMigration = resolve;
          }),
      )
      .mockResolvedValueOnce(successMigration);
    const user = userEvent.setup();
    const { findByText, getByLabelText, findByRole } = renderPage();

    await findByText("Cursor");
    await user.click(await findByText("Scan"));
    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(getByLabelText("Select Skill B"));
    await user.click(await findByText(/Migrate selected/));

    const progressBar = await findByRole("progressbar", { name: "Migration progress" });
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    expect(await findByText("Working on Skill A")).toBeInTheDocument();

    resolveFirstMigration?.(successMigration);
  });

  it("does not auto-rescan again after a successful migration batch", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanAllLocalSkills).mockResolvedValue([
      {
        name: "Skill A",
        path: "/skills/a",
        is_symlink: false,
        tool_id: "cursor",
        tool_name: "Cursor",
      },
      {
        name: "Skill B",
        path: "/skills/b",
        is_symlink: true,
        target_path: "/real/b",
        tool_id: "cursor",
        tool_name: "Cursor",
      },
    ]);
    vi.mocked(migrateLocalSkill).mockResolvedValue(successMigration);

    const user = userEvent.setup();
    const { findByText, getByLabelText } = renderPage();

    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(getByLabelText("Select Skill B"));
    await user.click(await findByText(/Migrate selected/));

    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledTimes(2);
    });

    expect(scanAllLocalSkills).toHaveBeenCalledTimes(1);
    expect(scanLocalSkills).not.toHaveBeenCalled();
  });

  it("clears hidden selections when switching tool filters", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool, secondTool]);
    vi.mocked(scanAllLocalSkills).mockResolvedValue([
      {
        name: "Skill A",
        path: "/skills/a",
        is_symlink: false,
        tool_id: "cursor",
        tool_name: "Cursor",
      },
      {
        name: "Skill C",
        path: "/skills/c",
        is_symlink: false,
        tool_id: "claude",
        tool_name: "Claude",
      },
    ]);
    const user = userEvent.setup();
    const { findByText, getByLabelText, findByRole, queryByText } = renderPage();

    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    expect(await findByText("Selected 1 / 2")).toBeInTheDocument();

    await user.click(await findByRole("tab", { name: "Claude" }));

    await waitFor(() => {
      expect(queryByText(/Selected/)).not.toBeInTheDocument();
    });
    expect(queryByText("Migrate selected (1)")).not.toBeInTheDocument();
  });

  it("shows tool-specific empty copy when the current tool has no skills", async () => {
    const traeTool: AITool = {
      id: "trae",
      name: "Trae",
      config_path: "/home/.trae",
      skills_subdir: "skills",
      is_detected: true,
      is_enabled: true,
    };

    vi.mocked(getTools).mockResolvedValue([mockTool, traeTool]);
    vi.mocked(scanAllLocalSkills).mockResolvedValue([
      {
        name: "Skill A",
        path: "/skills/a",
        is_symlink: false,
        tool_id: "cursor",
        tool_name: "Cursor",
      },
    ]);

    const user = userEvent.setup();
    const { findByText, findByRole } = renderPage();

    await findByText("Skill A");
    await user.click(await findByRole("tab", { name: "Trae" }));

    expect(await findByText("No Skills found for this tool")).toBeInTheDocument();
    expect(await findByText("No skills found in this tool's folder")).toBeInTheDocument();
  });

  it("shows scan warnings on local skill rows", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue([
      {
        name: "Skill A",
        path: "/skills/a",
        is_symlink: false,
        scan_warnings: [
          {
            code: "already_managed",
            message: "A managed Skill with this name or ID already exists",
            path: "/skills/a",
            target_path: "/managed/a",
          },
        ],
      },
      {
        name: "Broken",
        path: "/skills/broken",
        is_symlink: true,
        scan_warnings: [
          {
            code: "broken_symlink",
            message: "Skill symlink target cannot be resolved",
            path: "/skills/broken",
          },
        ],
      },
    ]);

    const { findByText } = renderPage();

    await findByText("Cursor");
    fireEvent.click(await findByText("Scan"));

    expect(await findByText("Already managed")).toBeInTheDocument();
    expect(await findByText("Broken symlink")).toBeInTheDocument();
  });

  it("shows blockers from migration preflight and skips blocked rows", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills);
    vi.mocked(preflightMigrateLocalSkill)
      .mockResolvedValueOnce({
        skill_id: "skill-a",
        source_path: "/skills/a",
        managed_target_path: "/managed/skill-a",
        original_replacement_path: "/skills/a",
        report: {
          status: "blocked",
          retryable: false,
          actions: [],
          warnings: [],
          failures: [
            {
              code: "conflict",
              message: "Skill ID already exists: skill-a",
              target_path: "/managed/skill-a",
              skill_id: "skill-a",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        skill_id: "skill-b",
        source_path: "/skills/b",
        managed_target_path: "/managed/skill-b",
        original_replacement_path: "/skills/b",
        report: {
          status: "success",
          retryable: false,
          actions: [],
          warnings: [],
          failures: [],
        },
      });
    vi.mocked(migrateLocalSkill).mockResolvedValue(successMigration);

    const user = userEvent.setup();
    const { findByText, getByLabelText } = renderPage();

    await findByText("Cursor");
    fireEvent.click(await findByText("Scan"));
    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(getByLabelText("Select Skill B"));

    expect(await findByText("Blocked")).toBeInTheDocument();
    expect(await findByText("Skill ID already exists: skill-a")).toBeInTheDocument();

    await user.click(await findByText(/Migrate selected/));

    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledTimes(1);
    });
    expect(migrateLocalSkill).toHaveBeenCalledWith("/skills/b", "skill-b");
  });

  it("shows migration report failure details and hides retry when not retryable", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills);
    vi.mocked(migrateLocalSkill).mockResolvedValue({
      report: {
        status: "failed",
        retryable: false,
        actions: [],
        warnings: [],
        failures: [
          {
            code: "permission_denied",
            message: "Permission denied while replacing original",
            path: "/skills/a",
            target_path: "/managed/skill-a",
            skill_id: "skill-a",
          },
        ],
      },
    });

    const user = userEvent.setup();
    const { findByText, getByLabelText, queryByRole } = renderPage();

    await findByText("Cursor");
    fireEvent.click(await findByText("Scan"));
    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(await findByText(/Migrate selected/));

    expect(await findByText("Failed")).toBeInTheDocument();
    expect(
      await findByText("Permission denied while replacing original (/skills/a)"),
    ).toBeInTheDocument();
    expect(queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});
