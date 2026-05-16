import { render, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { ThemeProvider, useTheme } from "../ThemeProvider";

function Consumer() {
  const { preference, setPreference, resolved } = useTheme();
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={() => setPreference("light")}>set-light</button>
      <button onClick={() => setPreference("dark")}>set-dark</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("dark") ? false : false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it("provides default preference=system", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(getByTestId("preference").textContent).toBe("system");
    expect(getByTestId("resolved").textContent).toBe("light");
  });

  it("setPreference(light) updates dataset.theme", () => {
    const { getByText } = render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    act(() => {
      getByText("set-light").click();
    });
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("setPreference(dark) updates dataset.theme to dark", () => {
    const { getByText } = render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    act(() => {
      getByText("set-dark").click();
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
