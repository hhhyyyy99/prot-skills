import { describe, expect, it } from "vitest";
import {
  classifyMigrationReport,
  dedupeSyncIssues,
  getFailureDescription,
  listSyncIssues,
} from "@/feature/migrate/migrationUtils";
import type { LifecycleIssue, LifecycleReport } from "@/types";

const permissionFailure: LifecycleIssue = {
  code: "permission_denied",
  message: "Permission denied",
  path: "/tools/codex/skills/example",
  tool_id: "codex",
  tool_name: "Codex",
};

function report(overrides: Partial<LifecycleReport>): LifecycleReport {
  return {
    status: "success",
    retryable: false,
    actions: [],
    warnings: [],
    failures: [],
    ...overrides,
  };
}

describe("migrationUtils", () => {
  it("classifies successful reports as source completed", () => {
    expect(classifyMigrationReport(report({ status: "success" }))).toEqual({
      type: "source-completed",
      syncIssues: [],
    });
  });

  it("classifies blocked reports as blocked", () => {
    expect(
      classifyMigrationReport(report({ status: "blocked", failures: [permissionFailure] })),
    ).toEqual({
      type: "blocked",
      failures: [permissionFailure],
    });
  });

  it("classifies source action failures as source failed", () => {
    expect(
      classifyMigrationReport(
        report({
          status: "partial",
          actions: [
            {
              action_type: "copy_to_managed",
              status: "failed",
              path: "/skills/example",
            },
          ],
          failures: [permissionFailure],
        }),
      ),
    ).toEqual({
      type: "source-failed",
      failures: [permissionFailure],
    });
  });

  it("classifies completed source migrations with sync failures as source completed", () => {
    expect(
      classifyMigrationReport(
        report({
          status: "partial",
          actions: [
            {
              action_type: "copy_to_managed",
              status: "completed",
              path: "/skills/example",
            },
            {
              action_type: "sync_tool_link",
              status: "failed",
              path: "/tools/codex/skills/example",
            },
          ],
          failures: [permissionFailure],
        }),
      ),
    ).toEqual({
      type: "source-completed",
      syncIssues: [permissionFailure],
    });
  });

  it("deduplicates sync issues by tool and message", () => {
    const duplicate = { ...permissionFailure, path: "/another/path" };

    expect(dedupeSyncIssues([permissionFailure, duplicate])).toEqual([permissionFailure]);
  });

  it("creates stable list keys for repeated sync issues", () => {
    const items = listSyncIssues([permissionFailure, permissionFailure]);

    expect(items.map((item) => item.key)).toEqual([
      "codex:Permission denied:/tools/codex/skills/example:1",
      "codex:Permission denied:/tools/codex/skills/example:2",
    ]);
  });

  it("summarizes up to three failure messages", () => {
    expect(
      getFailureDescription([
        { ...permissionFailure, message: "one" },
        { ...permissionFailure, message: "two" },
        { ...permissionFailure, message: "three" },
        { ...permissionFailure, message: "four" },
      ]),
    ).toBe("one; two; three");
  });
});
