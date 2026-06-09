import { describe, expect, it } from "vitest";
import {
  buildBulkSyncFailureDescription,
  buildSyncFailureDescription,
  isLocalSource,
  type BulkSyncFailureItem,
  type TFunction,
} from "@/feature/my-skills/mySkillsUtils";
import type { SyncFailureItem } from "@/types";

const t: TFunction = (key, params = {}) => {
  if (key === "mySkills.toast.syncFailuresMore") {
    return ` and ${params.count} more`;
  }

  if (key === "mySkills.toast.syncFailures") {
    return `${params.items}${params.more}`;
  }

  return key;
};

function syncFailure(toolName: string, reason: string): SyncFailureItem {
  return {
    tool_id: toolName.toLowerCase(),
    tool_name: toolName,
    reason_code: "permission_denied",
    reason,
  };
}

function bulkFailure(skillName: string, toolName: string, reason: string): BulkSyncFailureItem {
  return { skillName, toolName, reason };
}

describe("mySkillsUtils", () => {
  it("detects local source values case-insensitively", () => {
    expect(isLocalSource(" local ")).toBe(true);
    expect(isLocalSource("LOCAL")).toBe(true);
    expect(isLocalSource("github")).toBe(false);
  });

  it("returns no single-skill sync failure description for empty failures", () => {
    expect(buildSyncFailureDescription([], t)).toBeUndefined();
  });

  it("summarizes a single single-skill sync failure", () => {
    expect(buildSyncFailureDescription([syncFailure("Codex", "No write permission")], t)).toBe(
      "Codex (No write permission)",
    );
  });

  it("summarizes multiple single-skill sync failures with overflow count", () => {
    expect(
      buildSyncFailureDescription(
        [
          syncFailure("Claude", "Missing folder"),
          syncFailure("Codex", "No write permission"),
          syncFailure("Gemini", "Already exists"),
          syncFailure("Cursor", "Unsupported path"),
        ],
        t,
      ),
    ).toBe(
      "Claude (Missing folder), Codex (No write permission), Gemini (Already exists) and 1 more",
    );
  });

  it("returns no bulk sync failure description for empty failures", () => {
    expect(buildBulkSyncFailureDescription([], t)).toBeUndefined();
  });

  it("summarizes a single bulk sync failure", () => {
    expect(
      buildBulkSyncFailureDescription(
        [bulkFailure("Test Skill", "Codex", "No write permission")],
        t,
      ),
    ).toBe("Test Skill -> Codex (No write permission)");
  });

  it("summarizes multiple bulk sync failures with overflow count", () => {
    expect(
      buildBulkSyncFailureDescription(
        [
          bulkFailure("One", "Claude", "Missing folder"),
          bulkFailure("Two", "Codex", "No write permission"),
          bulkFailure("Three", "Gemini", "Already exists"),
          bulkFailure("Four", "Cursor", "Unsupported path"),
        ],
        t,
      ),
    ).toBe(
      "One -> Claude (Missing folder), Two -> Codex (No write permission), Three -> Gemini (Already exists) and 1 more",
    );
  });
});
