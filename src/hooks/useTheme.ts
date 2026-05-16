import { useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { resolveTheme, type ThemePreference, type ResolvedTheme } from "../lib/theme";

const STORAGE_KEY = "ui.theme";
const VALID = new Set<ThemePreference>(["system", "light", "dark"]);

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && VALID.has(v as ThemePreference)) return v as ThemePreference;
  } catch {
    /* noop */
  }
  return "system";
}

export interface ThemeState {
  preference: ThemePreference;
  setPreference: (p: ThemePreference, options?: { origin?: { x: number; y: number } }) => void;
  resolved: ResolvedTheme;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    ready: Promise<void>;
  };
};

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getRevealRadius(x: number, y: number) {
  const horizontal = Math.max(x, window.innerWidth - x);
  const vertical = Math.max(y, window.innerHeight - y);
  return Math.hypot(horizontal, vertical);
}

export function useThemeState(): ThemeState {
  const [preference, setPreferenceRaw] = useState<ThemePreference>(readPreference);
  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const setPreference = useCallback(
    (p: ThemePreference, options?: { origin?: { x: number; y: number } }) => {
      const applyPreference = () => {
        flushSync(() => {
          setPreferenceRaw(p);
          document.documentElement.dataset.theme = resolveTheme(p, systemIsDark);
        });
        try {
          localStorage.setItem(STORAGE_KEY, p);
        } catch {
          /* noop */
        }
      };

      const origin = options?.origin;
      const nextResolved = resolveTheme(p, systemIsDark);
      const canAnimate = Boolean(
        origin &&
        typeof document !== "undefined" &&
        (document as ViewTransitionDocument).startViewTransition &&
        !prefersReducedMotion() &&
        document.documentElement.dataset.theme !== nextResolved,
      );

      if (!canAnimate || !origin) {
        applyPreference();
        return;
      }

      const transition = (document as ViewTransitionDocument).startViewTransition?.(() => {
        applyPreference();
      });

      transition?.ready
        .then(() => {
          const endRadius = getRevealRadius(origin.x, origin.y);
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${origin.x}px ${origin.y}px)`,
                `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`,
              ],
            },
            {
              duration: 820,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        })
        .catch(() => {
          // noop: if the transition lifecycle fails, the theme change already applied
        });
    },
    [systemIsDark],
  );

  const resolved = resolveTheme(preference, systemIsDark);

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  return { preference, setPreference, resolved };
}
