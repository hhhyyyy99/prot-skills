import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Switch } from "@/components/primitives/Switch";

describe("Switch", () => {
  it("calls onChange(true) when clicked while unchecked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch checked={false} onChange={onChange} aria-label="Toggle" />);
    await user.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
