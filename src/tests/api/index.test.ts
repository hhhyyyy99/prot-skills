import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { getTools, openUrl, preflightMigrateLocalSkill } from "@/api/index";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

function enableTauriRuntime() {
  // eslint-disable-next-line eslint/no-underscore-dangle -- Tauri runtime global
  (globalThis as { __TAURI_INTERNALS__?: { invoke: () => void } }).__TAURI_INTERNALS__ = {
    invoke: () => undefined,
  };
}

describe("api invoke wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("returns a friendly error when Tauri runtime is unavailable", async () => {
    await expect(getTools()).rejects.toThrow(
      "Desktop runtime unavailable. Open this screen in the Tauri app instead of the browser preview.",
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it("calls tauri invoke when runtime is available", async () => {
    enableTauriRuntime();
    vi.mocked(invoke).mockResolvedValueOnce([{ id: "cursor" }]);

    await expect(getTools()).resolves.toEqual([{ id: "cursor" }]);
    expect(invoke).toHaveBeenCalledWith("get_tools", undefined);
  });

  it("opens URLs through the desktop command", async () => {
    enableTauriRuntime();
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    await expect(openUrl("https://github.com/hhhyyyy99/prot-skills")).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith("open_url", {
      url: "https://github.com/hhhyyyy99/prot-skills",
    });
  });

  it("calls migration preflight command with source path and skill ID", async () => {
    enableTauriRuntime();
    vi.mocked(invoke).mockResolvedValueOnce({ skill_id: "alpha" });

    await expect(preflightMigrateLocalSkill("/skills/alpha", "alpha")).resolves.toEqual({
      skill_id: "alpha",
    });
    expect(invoke).toHaveBeenCalledWith("preflight_migrate_local_skill", {
      sourcePath: "/skills/alpha",
      skillId: "alpha",
    });
  });
});
