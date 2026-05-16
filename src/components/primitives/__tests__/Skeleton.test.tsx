import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton } from "../Skeleton";

describe("Skeleton", () => {
  it("default render includes skeleton-pulse class", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild!.className).toContain("skeleton-pulse");
  });

  it("width=100 height=20 sets inline style", () => {
    const { container } = render(<Skeleton width={100} height={20} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe("100px");
    expect(el.style.height).toBe("20px");
  });
});
