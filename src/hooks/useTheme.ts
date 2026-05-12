import { useState, useEffect, useCallback } from 'react';
import { resolveTheme, type ThemePreference, type ResolvedTheme } from '../lib/theme';

const STORAGE_KEY = 'ui.theme';
const VALID: ThemePreference[] = ['system', 'light', 'dark'];

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && VALID.includes(v as ThemePreference)) return v as ThemePreference;
  } catch { /* noop */ }
  return 'system';
}

export interface ThemeState {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  resolved: ResolvedTheme;
}

export function useThemeState(): ThemeState {
  const [preference, setPreferenceRaw] = useState<ThemePreference>(readPreference);
  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceRaw(p);
    try { localStorage.setItem(STORAGE_KEY, p); } catch { /* noop */ }
  }, []);

  const resolved = resolveTheme(preference, systemIsDark);

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  return { preference, setPreference, resolved };
}
