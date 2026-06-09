import { render, waitFor, fireEvent, act } from "@testing-library/react";
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

const test3Tool: AITool = {
  id: "test3",
  name: "test3",
  config_path: "/test3",
  skills_subdir: "skills",
  is_detected: true,
  is_enabled: true,
};

const test4Tool: AITool = {
  id: "test4",
  name: "test4",
  config_path: "/test4",
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

const sourceCompletedSyncFailedMigration: MigrationResult = {
  report: {
    status: "partial",
    retryable: true,
    actions: [
      {
        action_type: "copy_to_managed",
        status: "completed",
        path: "/test4/artifacts-builder",
        target_path: "/managed/artifacts-builder",
        skill_id: "artifacts-builder",
        skill_name: "artifacts-builder",
      },
      {
        action_type: "replace_original_with_symlink",
        status: "completed",
        path: "/test4/artifacts-builder",
        target_path: "/managed/artifacts-builder",
        skill_id: "artifacts-builder",
        skill_name: "artifacts-builder",
      },
      {
        action_type: "sync_tool_link",
        status: "failed",
        path: "/test3/skills/artifacts-builder",
        skill_id: "artifacts-builder",
        skill_name: "artifacts-builder",
        tool_id: "test3",
        tool_name: "test3",
      },
    ],
    warnings: [],
    failures: [
      {
        code: "permission_denied",
        message: "Permission denied",
        path: "/test3/skills/artifacts-builder",
        skill_id: "artifacts-builder",
        skill_name: "artifacts-builder",
        tool_id: "test3",
        tool_name: "test3",
      },
    ],
  },
};

function renderPage() {
  return render(<MigratePage />, { wrapper: AppProviders });
}

describe("MigratePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
    vi.mocked(migrateLocalSkill).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstMigration = resolve;
        }),
    );
    const user = userEvent.setup();
    const { findByText, getByLabelText, findByRole } = renderPage();

    await findByText("Cursor");
    await user.click(await findByText("Scan"));
    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(await findByText(/Migrate selected/));

    const progressBar = await findByRole("progressbar", { name: "Migration progress" });
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    expect(await findByText("Working on Skill A")).toBeInTheDocument();

    await act(async () => {
      resolveFirstMigration?.(successMigration);
    });
    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledTimes(1);
    });
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
    const { findByText, getByLabelText, queryByText } = renderPage();

    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(getByLabelText("Select Skill B"));
    await user.click(await findByText(/Migrate selected/));

    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledTimes(2);
    });

    expect(scanAllLocalSkills).toHaveBeenCalledTimes(1);
    expect(scanLocalSkills).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(queryByText("Skill A")).not.toBeInTheDocument();
      expect(queryByText("Skill B")).not.toBeInTheDocument();
    });
    expect(await findByText("Migration summary")).toBeInTheDocument();
    expect(await findByText("Migrated 2, failed 0, skipped 0")).toBeInTheDocument();
  });

  it("keeps failed rows visible when a migration batch has mixed outcomes", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills);
    vi.mocked(migrateLocalSkill)
      .mockResolvedValueOnce(successMigration)
      .mockResolvedValueOnce({
        report: {
          status: "failed",
          retryable: true,
          actions: [],
          warnings: [],
          failures: [
            {
              code: "permission_denied",
              message: "Permission denied while replacing original",
              path: "/skills/b",
              skill_id: "skill-b",
            },
          ],
        },
      });

    const user = userEvent.setup();
    const { findByText, getByLabelText, queryByText, findByRole } = renderPage();

    await findByText("Cursor");
    fireEvent.click(await findByText("Scan"));
    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(getByLabelText("Select Skill B"));
    await user.click(await findByText(/Migrate selected/));

    await waitFor(() => {
      expect(queryByText("Skill A")).not.toBeInTheDocument();
    });
    expect(await findByText("Skill B")).toBeInTheDocument();
    expect(
      await findByText("Permission denied while replacing original (/skills/b)"),
    ).toBeInTheDocument();
    expect(await findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(await findByText("Migrated 1, failed 1, skipped 0")).toBeInTheDocument();
  });

  it("removes a migrated source row and reports unrelated tool sync failures", async () => {
    vi.mocked(getTools).mockResolvedValue([test3Tool, test4Tool]);
    vi.mocked(scanAllLocalSkills).mockResolvedValue([
      {
        name: "artifacts-builder",
        path: "/test4/artifacts-builder",
        is_symlink: false,
        tool_id: "test4",
        tool_name: "test4",
      },
    ]);
    vi.mocked(migrateLocalSkill).mockResolvedValue(sourceCompletedSyncFailedMigration);

    const user = userEvent.setup();
    const { findByText, getByLabelText, queryByText, queryByRole } = renderPage();

    await findByText("artifacts-builder");
    await user.click(getByLabelText("Select artifacts-builder"));
    await user.click(await findByText(/Migrate selected/));

    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledWith(
        "/test4/artifacts-builder",
        "artifacts-builder",
      );
      expect(queryByText("artifacts-builder")).not.toBeInTheDocument();
    });
    expect(await findByText("Migrated 1, failed 0, skipped 0")).toBeInTheDocument();
    expect(await findByText("Sync issue: test3: Permission denied")).toBeInTheDocument();
    expect(queryByText("Failed")).not.toBeInTheDocument();
    expect(queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("summarizes repeated sync failures and shows details in a dialog", async () => {
    vi.mocked(getTools).mockResolvedValue([test3Tool, test4Tool]);
    vi.mocked(scanAllLocalSkills).mockResolvedValue([
      {
        name: "artifacts-builder",
        path: "/test4/artifacts-builder",
        is_symlink: false,
        tool_id: "test4",
        tool_name: "test4",
      },
    ]);
    vi.mocked(migrateLocalSkill).mockResolvedValue({
      report: {
        ...sourceCompletedSyncFailedMigration.report,
        failures: Array.from({ length: 9 }, (_, index) => ({
          ...sourceCompletedSyncFailedMigration.report.failures[0],
          path: `/test3/skills/artifacts-builder-${index}`,
        })),
      },
    });

    const user = userEvent.setup();
    const { findByText, getByLabelText, queryByText, findByRole } = renderPage();

    await findByText("artifacts-builder");
    await user.click(getByLabelText("Select artifacts-builder"));
    await user.click(await findByText(/Migrate selected/));

    expect(await findByText("Sync issue: test3: Permission denied")).toBeInTheDocument();
    expect(queryByText(/and 6 more/)).not.toBeInTheDocument();

    await user.click(await findByRole("button", { name: "View all (9)" }));

    expect(await findByRole("dialog", { name: "Sync issues" })).toBeInTheDocument();
    expect(await findByText("9 sync attempts failed after migration.")).toBeInTheDocument();
    expect(await findByText("/test3/skills/artifacts-builder-0")).toBeInTheDocument();
    expect(await findByText("/test3/skills/artifacts-builder-8")).toBeInTheDocument();
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
    vi.mocked(preflightMigrateLocalSkill).mockImplementation((sourcePath) =>
      Promise.resolve(
        sourcePath === "/skills/a"
          ? {
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
            }
          : {
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
            },
      ),
    );
    vi.mocked(migrateLocalSkill).mockResolvedValue(successMigration);

    const user = userEvent.setup();
    const { findByText, getByLabelText, queryByText } = renderPage();

    await findByText("Cursor");
    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(getByLabelText("Select Skill B"));
    await waitFor(() => {
      expect(preflightMigrateLocalSkill).toHaveBeenCalledWith("/skills/a", "skill-a");
    });

    expect(await findByText("Blocked")).toBeInTheDocument();
    expect(await findByText("Skill ID already exists: skill-a")).toBeInTheDocument();

    await user.click(await findByText(/Migrate selected/));

    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledTimes(1);
    });
    expect(migrateLocalSkill).toHaveBeenCalledWith("/skills/b", "skill-b");
    expect(await findByText("Skill A")).toBeInTheDocument();
    await waitFor(() => {
      expect(queryByText("Skill B")).not.toBeInTheDocument();
    });
    expect(await findByText("Migrated 1, failed 0, skipped 1")).toBeInTheDocument();
  });

  it("clears stale blocked preflight state when rescanning the same path", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills.slice(0, 1));
    let shouldBlock = true;
    vi.mocked(preflightMigrateLocalSkill).mockImplementation(async () => {
      if (shouldBlock) {
        return {
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
        };
      }

      return {
        skill_id: "skill-a",
        source_path: "/skills/a",
        managed_target_path: "/managed/skill-a",
        original_replacement_path: "/skills/a",
        report: {
          status: "success",
          retryable: false,
          actions: [],
          warnings: [],
          failures: [],
        },
      };
    });

    const user = userEvent.setup();
    const { findByText, getByLabelText, queryByText } = renderPage();

    await findByText("Cursor");
    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await waitFor(() => {
      expect(preflightMigrateLocalSkill).toHaveBeenCalledWith("/skills/a", "skill-a");
    });
    expect(await findByText("Blocked")).toBeInTheDocument();
    expect(getByLabelText("Select Skill A")).toBeDisabled();

    shouldBlock = false;
    fireEvent.click(await findByText("Rescan All"));
    await waitFor(() => {
      expect(queryByText("Blocked")).not.toBeInTheDocument();
    });
    expect(getByLabelText("Select Skill A")).toBeEnabled();
    await user.click(getByLabelText("Select Skill A"));

    await waitFor(() => {
      expect(vi.mocked(preflightMigrateLocalSkill).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    expect(getByLabelText("Select Skill A")).toBeEnabled();
  });

  it("ignores stale preflight results after deselecting a row", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills.slice(0, 1));
    let resolvePreflight:
      | ((value: Awaited<ReturnType<typeof preflightMigrateLocalSkill>>) => void)
      | undefined;
    vi.mocked(preflightMigrateLocalSkill).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreflight = resolve;
        }),
    );

    const user = userEvent.setup();
    const { findByText, getByLabelText, queryByText } = renderPage();

    await findByText("Cursor");
    await findByText("Skill A");

    await user.click(getByLabelText("Select Skill A"));
    await waitFor(() => {
      expect(getByLabelText("Select Skill A")).toBeChecked();
    });
    await waitFor(() => {
      expect(preflightMigrateLocalSkill).toHaveBeenCalledWith("/skills/a", "skill-a");
    });
    await user.click(getByLabelText("Select Skill A"));

    resolvePreflight?.({
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
    });

    await waitFor(() => {
      expect(getByLabelText("Select Skill A")).not.toBeChecked();
    });
    expect(queryByText("Blocked")).not.toBeInTheDocument();
    expect(queryByText("Skill ID already exists: skill-a")).not.toBeInTheDocument();

    await user.click(getByLabelText("Select Skill A"));
    await waitFor(() => {
      expect(preflightMigrateLocalSkill).toHaveBeenCalledTimes(2);
    });
  });

  it("allows version-checked managed duplicates to migrate and relink", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills.slice(0, 1));
    vi.mocked(preflightMigrateLocalSkill).mockResolvedValue({
      skill_id: "skill-a",
      source_path: "/skills/a",
      managed_target_path: "/managed/skill-a",
      original_replacement_path: "/skills/a",
      report: {
        status: "success",
        retryable: false,
        actions: [],
        warnings: [
          {
            code: "already_managed_version_checked",
            message:
              "Managed Skill version 2.0.0 is newer than local version 1.0.0; local copy will be replaced with a symlink",
            path: "/skills/a",
            target_path: "/managed/skill-a",
            skill_id: "skill-a",
          },
        ],
        failures: [],
      },
    });
    vi.mocked(migrateLocalSkill).mockResolvedValue({
      report: {
        status: "success",
        retryable: false,
        actions: [],
        warnings: [],
        failures: [],
      },
    });

    const user = userEvent.setup();
    const { findByText, getByLabelText, queryByText } = renderPage();

    await findByText("Cursor");
    await findByText("Skill A");

    expect(getByLabelText("Select Skill A")).toBeEnabled();
    await user.click(getByLabelText("Select Skill A"));
    await waitFor(() => {
      expect(preflightMigrateLocalSkill).toHaveBeenCalledWith("/skills/a", "skill-a");
    });
    expect(
      await findByText(
        "Managed Skill version 2.0.0 is newer than local version 1.0.0; local copy will be replaced with a symlink",
      ),
    ).toBeInTheDocument();

    await user.click(await findByText(/Migrate selected/));

    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledWith("/skills/a", "skill-a");
      expect(queryByText("Skill A")).not.toBeInTheDocument();
    });
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

  it("keeps source relink failures visible and retryable", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills.slice(0, 1));
    vi.mocked(migrateLocalSkill).mockResolvedValue({
      report: {
        status: "partial",
        retryable: true,
        actions: [
          {
            action_type: "copy_to_managed",
            status: "completed",
            path: "/skills/a",
            target_path: "/managed/skill-a",
            skill_id: "skill-a",
          },
          {
            action_type: "replace_original_with_symlink",
            status: "failed",
            path: "/skills/a",
            target_path: "/managed/skill-a",
            skill_id: "skill-a",
          },
        ],
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
    const { findByText, getByLabelText, findByRole } = renderPage();

    await findByText("Cursor");
    fireEvent.click(await findByText("Scan"));
    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(await findByText(/Migrate selected/));

    expect(await findByText("Skill A")).toBeInTheDocument();
    expect(await findByText("Failed")).toBeInTheDocument();
    expect(
      await findByText("Permission denied while replacing original (/skills/a)"),
    ).toBeInTheDocument();
    expect(await findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(await findByText("Migrated 0, failed 1, skipped 0")).toBeInTheDocument();
  });

  it("removes a failed row when retry succeeds", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills.slice(0, 1));
    vi.mocked(migrateLocalSkill)
      .mockResolvedValueOnce({
        report: {
          status: "failed",
          retryable: true,
          actions: [],
          warnings: [],
          failures: [
            {
              code: "filesystem_error",
              message: "Failed to create symlink",
              path: "/skills/a",
              skill_id: "skill-a",
            },
          ],
        },
      })
      .mockResolvedValueOnce(successMigration);

    const user = userEvent.setup();
    const { findByText, getByLabelText, findByRole, queryByText } = renderPage();

    await findByText("Cursor");
    fireEvent.click(await findByText("Scan"));
    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(await findByText(/Migrate selected/));

    await findByText("Failed to create symlink (/skills/a)");
    const retryButton = await findByRole("button", { name: "Retry" });
    await waitFor(() => {
      expect(retryButton).toBeEnabled();
    });
    await user.click(retryButton);

    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(queryByText("Skill A")).not.toBeInTheDocument();
    });
    expect(await findByText("Migrated 1, failed 0, skipped 0")).toBeInTheDocument();
  });

  it("removes a failed row when retry completes source migration with sync issues", async () => {
    vi.mocked(getTools).mockResolvedValue([mockTool]);
    vi.mocked(scanLocalSkills).mockResolvedValue(mockSkills.slice(0, 1));
    vi.mocked(migrateLocalSkill)
      .mockResolvedValueOnce({
        report: {
          status: "failed",
          retryable: true,
          actions: [],
          warnings: [],
          failures: [
            {
              code: "filesystem_error",
              message: "Failed to create symlink",
              path: "/skills/a",
              skill_id: "skill-a",
            },
          ],
        },
      })
      .mockResolvedValueOnce(sourceCompletedSyncFailedMigration);

    const user = userEvent.setup();
    const { findByText, getByLabelText, findByRole, queryByText } = renderPage();

    await findByText("Cursor");
    fireEvent.click(await findByText("Scan"));
    await findByText("Skill A");
    await user.click(getByLabelText("Select Skill A"));
    await user.click(await findByText(/Migrate selected/));

    await findByText("Failed to create symlink (/skills/a)");
    const retryButton = await findByRole("button", { name: "Retry" });
    await waitFor(() => {
      expect(retryButton).toBeEnabled();
    });
    await user.click(retryButton);

    await waitFor(() => {
      expect(migrateLocalSkill).toHaveBeenCalledTimes(2);
      expect(queryByText("Skill A")).not.toBeInTheDocument();
    });
    expect(await findByText("Migrated 1, failed 0, skipped 0")).toBeInTheDocument();
    expect(await findByText("Sync issue: test3: Permission denied")).toBeInTheDocument();
  });
});
