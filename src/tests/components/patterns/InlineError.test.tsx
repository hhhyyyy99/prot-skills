import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { InlineError } from "@/components/patterns/InlineError";
import { LanguageProvider } from "@/shell/LanguageProvider";

describe("InlineError", () => {
  it('renders with role="alert"', () => {
    const { getByRole } = render(<InlineError title="Something failed" />, {
      wrapper: LanguageProvider,
    });
    expect(getByRole("alert")).toBeInTheDocument();
  });

  it("calls onRetry when Retry button is clicked", () => {
    const onRetry = vi.fn();
    const { getByRole } = render(<InlineError title="Error" onRetry={onRetry} />, {
      wrapper: LanguageProvider,
    });
    fireEvent.click(getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders <details> when details prop is provided", () => {
    const { container } = render(<InlineError title="Error" details="stack trace here" />, {
      wrapper: LanguageProvider,
    });
    expect(container.querySelector("details")).toBeInTheDocument();
  });
});
