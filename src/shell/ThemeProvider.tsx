import { createContext, useContext, type ReactNode } from "react";
import { useThemeState, type ThemeState } from "../hooks/useTheme";

const ThemeCtx = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const state = useThemeState();
  return <ThemeCtx.Provider value={state}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
