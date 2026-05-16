export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function resolveTheme(pref: ThemePreference, systemIsDark: boolean): ResolvedTheme {
  if (pref === "system") return systemIsDark ? "dark" : "light";
  return pref;
}
