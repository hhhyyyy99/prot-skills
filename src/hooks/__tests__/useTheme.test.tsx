import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useThemeState } from "../useTheme";

describe("useThemeState", () => {
  let listeners: Array<(e: MediaQueryListEvent) => void>;

  beforeEach(() => {
    listeners = [];
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
        addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
          listeners.push(fn);
        },
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it("sets dataset.theme to light when system is light and preference is system", () => {
    const { result } = renderHook(() => useThemeState());
    expect(result.current.preference).toBe("system");
    expect(result.current.resolved).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("sets dataset.theme to dark when system is dark", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("dark") ? true : false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
          listeners.push(fn);
        },
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    const { result } = renderHook(() => useThemeState());
    expect(result.current.resolved).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("setPreference(dark) updates dataset.theme and localStorage", () => {
    const { result } = renderHook(() => useThemeState());

    act(() => {
      result.current.setPreference("dark");
    });

    expect(result.current.preference).toBe("dark");
    expect(result.current.resolved).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("ui.theme")).toBe("dark");
  });

  it("reads preference from localStorage on mount", () => {
    localStorage.setItem("ui.theme", "light");
    const { result } = renderHook(() => useThemeState());
    expect(result.current.preference).toBe("light");
    expect(result.current.resolved).toBe("light");
  });

  it("falls back to system for invalid localStorage value", () => {
    localStorage.setItem("ui.theme", "invalid");
    const { result } = renderHook(() => useThemeState());
    expect(result.current.preference).toBe("system");
  });
});
