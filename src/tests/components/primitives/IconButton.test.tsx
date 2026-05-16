import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { IconButton } from "@/components/primitives/IconButton";

describe("IconButton", () => {
  it("renders with correct aria-label", () => {
    render(<IconButton icon={<svg />} aria-label="Close" />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("variant=subtle has hover:bg-surface-raised class", () => {
    render(<IconButton icon={<svg />} aria-label="Edit" variant="subtle" />);
    expect(screen.getByRole("button").className).toContain("hover:bg-surface-raised");
  });

  it("variant=ghost does not have hover:bg-surface-raised class", () => {
    render(<IconButton icon={<svg />} aria-label="Edit" variant="ghost" />);
    expect(screen.getByRole("button").className).not.toContain("hover:bg-surface-raised");
  });
});
