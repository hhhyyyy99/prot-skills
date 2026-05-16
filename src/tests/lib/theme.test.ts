import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { resolveTheme, type ThemePreference } from "@/lib/theme";

const prefArb = fc.constantFrom<ThemePreference>("system", "light", "dark");

describe("resolveTheme", () => {
  // Property: always returns 'light' or 'dark'
  it("always returns light or dark", () => {
    fc.assert(
      fc.property(prefArb, fc.boolean(), (pref, sys) => {
        const result = resolveTheme(pref, sys);
        return result === "light" || result === "dark";
      }),
    );
  });

  // Property: when pref='system', result matches systemIsDark
  it("system preference follows systemIsDark", () => {
    fc.assert(
      fc.property(fc.boolean(), (sys) => {
        return resolveTheme("system", sys) === (sys ? "dark" : "light");
      }),
    );
  });

  // Property: when pref!='system', result is independent of systemIsDark
  it("explicit preference ignores systemIsDark", () => {
    fc.assert(
      fc.property(fc.constantFrom<"light" | "dark">("light", "dark"), fc.boolean(), (pref, sys) => {
        return resolveTheme(pref, sys) === pref;
      }),
    );
  });

  // Example assertions
  it("resolves system+dark to dark", () => {
    expect(resolveTheme("system", true)).toBe("dark");
  });

  it("resolves light+true to light", () => {
    expect(resolveTheme("light", true)).toBe("light");
  });
});
