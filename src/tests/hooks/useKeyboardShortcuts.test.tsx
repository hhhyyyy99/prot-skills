import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// jsdom userAgent does not contain "Mac", so mod = ctrlKey
const MOD_KEY = "ctrlKey" as const;

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  document.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  it("triggers callback for matching shortcut", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ "mod+1": handler }));

    fireKey("1", { [MOD_KEY]: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not trigger for non-matching shortcut", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ "mod+1": handler }));

    fireKey("2", { [MOD_KEY]: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it("blocks mod+1 when activeElement is input", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ "mod+1": handler }));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireKey("1", { [MOD_KEY]: true });
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("allows mod+k when activeElement is input", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ "mod+k": handler }));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireKey("k", { [MOD_KEY]: true });
    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it("allows escape when activeElement is input", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ escape: handler }));

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    fireKey("Escape", {});
    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(textarea);
  });

  it("cleans up listener on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ "mod+1": handler }));

    unmount();
    fireKey("1", { [MOD_KEY]: true });
    expect(handler).not.toHaveBeenCalled();
  });
});
