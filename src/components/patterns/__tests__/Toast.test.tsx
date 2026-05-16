import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Toast } from "../Toast";

describe("Toast", () => {
  it('variant=error uses role="alert"', () => {
    render(<Toast id="1" variant="error" title="Error" onDismiss={() => {}} />);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("clicking dismiss button triggers onDismiss(id)", () => {
    const onDismiss = vi.fn();
    render(<Toast id="t1" variant="info" title="Info" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledWith("t1");
  });
});
