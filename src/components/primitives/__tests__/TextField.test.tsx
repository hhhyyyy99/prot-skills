import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TextField } from "../TextField";

describe("TextField", () => {
  it("error sets aria-invalid and aria-describedby points to error node", () => {
    render(<TextField value="" onChange={() => {}} error="Required" id="name" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "name-error");
    expect(screen.getByText("Required")).toHaveAttribute("id", "name-error");
  });

  it("Enter key triggers onSubmit with current value", () => {
    const onSubmit = vi.fn();
    render(<TextField value="hello" onChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("hello");
  });
});
