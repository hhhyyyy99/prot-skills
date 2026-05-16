import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/primitives/Button";

describe("Button", () => {
  it("primary variant has bg-accent class", () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button").className).toContain("bg-accent");
  });

  it("secondary variant has border-border-default class", () => {
    render(<Button variant="secondary">Go</Button>);
    expect(screen.getByRole("button").className).toContain("border-border-default");
  });

  it("ghost variant has hover:bg-surface-raised class", () => {
    render(<Button variant="ghost">Go</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("hover:bg-surface-raised");
  });

  it("danger variant has border-danger class", () => {
    render(<Button variant="danger">Go</Button>);
    expect(screen.getByRole("button").className).toContain("border-danger");
  });

  it("loading=true disables button and sets aria-busy", () => {
    render(<Button loading>Go</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("has focus-visible ring-2 class", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button").className).toContain("ring-2");
  });
});
