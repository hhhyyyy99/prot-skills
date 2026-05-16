import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Tooltip } from "@/components/primitives/Tooltip";

describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows content after 400ms delay on pointer enter", async () => {
    render(
      <Tooltip content="Help text">
        <button>Hover me</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button");

    // Simulate pointerenter + focus to trigger Radix tooltip
    await act(async () => {
      trigger.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
      trigger.focus();
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole("tooltip")).toHaveTextContent("Help text");
  });
});
