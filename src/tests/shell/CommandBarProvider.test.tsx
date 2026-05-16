import { render, screen, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ThemeProvider } from "@/shell/ThemeProvider";
import { LanguageProvider } from "@/shell/LanguageProvider";
import { CommandBarProvider, useCommandBar } from "@/shell/CommandBarProvider";

function TestConsumer() {
  const { openBar, open } = useCommandBar();
  return (
    <div>
      <span data-testid="state">{open ? "open" : "closed"}</span>
      <button onClick={openBar}>open</button>
    </div>
  );
}

function renderWithProviders() {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <CommandBarProvider>
          <TestConsumer />
        </CommandBarProvider>
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe("CommandBarProvider", () => {
  it("starts closed", () => {
    renderWithProviders();
    expect(screen.getByTestId("state").textContent).toBe("closed");
  });

  it("opens command bar when openBar is called", () => {
    renderWithProviders();
    act(() => {
      screen.getByRole("button", { name: "open" }).click();
    });
    expect(screen.getByTestId("state").textContent).toBe("open");
    expect(screen.getByPlaceholderText("Type a command or search…")).toBeInTheDocument();
  });

  it("renders theme commands", () => {
    renderWithProviders();
    act(() => {
      screen.getByRole("button", { name: "open" }).click();
    });
    expect(screen.getByText("Theme: Light")).toBeInTheDocument();
    expect(screen.getByText("Theme: Dark")).toBeInTheDocument();
    expect(screen.getByText("Theme: System")).toBeInTheDocument();
  });

  it("renders navigate commands", () => {
    renderWithProviders();
    act(() => {
      screen.getByRole("button", { name: "open" }).click();
    });
    expect(screen.queryByText("Go to Discovery")).not.toBeInTheDocument();
    expect(screen.getByText("Go to My Skills")).toBeInTheDocument();
    expect(screen.getByText("Go to Settings")).toBeInTheDocument();
  });
});
