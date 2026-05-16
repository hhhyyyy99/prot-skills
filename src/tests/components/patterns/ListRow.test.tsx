import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ListRow } from "@/components/patterns/ListRow";

describe("ListRow", () => {
  it("selected=true adds border-accent class", () => {
    const { container } = render(<ListRow id="1" primary="Test" selected />);
    expect(container.firstElementChild!.className).toContain("border-accent");
  });

  it("Enter key triggers onSelect(id)", () => {
    const onSelect = vi.fn();
    render(<ListRow id="abc" primary="Test" onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole("row"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("abc");
  });

  it('ArrowDown triggers onKeyNav("down")', () => {
    const onKeyNav = vi.fn();
    render(<ListRow id="1" primary="Test" onKeyNav={onKeyNav} />);
    fireEvent.keyDown(screen.getByRole("row"), { key: "ArrowDown" });
    expect(onKeyNav).toHaveBeenCalledWith("down");
  });

  it("loading=true renders three skeleton-pulse elements", () => {
    const { container } = render(<ListRow id="1" primary="Test" loading />);
    const skeletons = container.querySelectorAll(".skeleton-pulse");
    expect(skeletons.length).toBe(3);
  });

  it("href renders as <a> element", () => {
    const { container } = render(<ListRow id="1" primary="Test" href="/link" />);
    expect(container.querySelector("a")).not.toBeNull();
    expect(container.querySelector("a")!.getAttribute("href")).toBe("/link");
  });
});
