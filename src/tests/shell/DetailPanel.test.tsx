import { render, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DetailPanel } from "@/shell/DetailPanel";

describe("DetailPanel", () => {
  it("focuses close button when open becomes true", async () => {
    const onClose = vi.fn();
    const { rerender, getByLabelText } = render(
      <DetailPanel open={false} onClose={onClose} title="T">
        body
      </DetailPanel>,
    );
    rerender(
      <DetailPanel open={true} onClose={onClose} title="T">
        body
      </DetailPanel>,
    );

    // requestAnimationFrame callback
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(document.activeElement).toBe(getByLabelText("Close"));
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    const { getByRole } = render(
      <DetailPanel open={true} onClose={onClose} title="T">
        body
      </DetailPanel>,
    );
    fireEvent.keyDown(getByRole("complementary"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on click outside", () => {
    const onClose = vi.fn();
    render(
      <DetailPanel open={true} onClose={onClose} title="T">
        body
      </DetailPanel>,
    );
    // pointerdown on document body (outside aside)
    act(() => {
      const event = new PointerEvent("pointerdown", { bubbles: true });
      document.body.dispatchEvent(event);
    });
    expect(onClose).toHaveBeenCalled();
  });
});
