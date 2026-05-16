import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { getTools } from "./index";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

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
    (globalThis as { __TAURI_INTERNALS__?: { invoke: () => void } }).__TAURI_INTERNALS__ = {
      invoke: () => undefined,
    };
    vi.mocked(invoke).mockResolvedValueOnce([{ id: "cursor" }]);

    await expect(getTools()).resolves.toEqual([{ id: "cursor" }]);
    expect(invoke).toHaveBeenCalledWith("get_tools", undefined);
  });
});
