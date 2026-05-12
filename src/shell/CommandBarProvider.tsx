import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { CommandBar, type CommandItem } from '../components/command/CommandBar';
import { useTheme } from './ThemeProvider';
import type { PageId } from './types';

interface CommandBarContextValue {
  open: boolean;
  openBar: () => void;
  closeBar: () => void;
  setNavigateHandler: (fn: (id: PageId) => void) => void;
  setRedetectToolsHandler: (fn: () => void) => void;
  setScanLocalHandler: (fn: () => void) => void;
}

const CommandBarCtx = createContext<CommandBarContextValue | null>(null);

export function useCommandBar(): CommandBarContextValue {
  const ctx = useContext(CommandBarCtx);
  if (!ctx) throw new Error('useCommandBar must be used within CommandBarProvider');
  return ctx;
}

export function CommandBarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { setPreference } = useTheme();

  const navigateRef = useRef<((id: PageId) => void) | null>(null);
  const redetectRef = useRef<(() => void) | null>(null);
  const scanLocalRef = useRef<(() => void) | null>(null);

  const openBar = useCallback(() => setOpen(true), []);
  const closeBar = useCallback(() => setOpen(false), []);
  const setNavigateHandler = useCallback((fn: (id: PageId) => void) => { navigateRef.current = fn; }, []);
  const setRedetectToolsHandler = useCallback((fn: () => void) => { redetectRef.current = fn; }, []);
  const setScanLocalHandler = useCallback((fn: () => void) => { scanLocalRef.current = fn; }, []);

  const commands = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      { id: 'go-discovery', label: 'Go to Discovery', group: 'Navigate', shortcut: '⌘1', perform: () => navigateRef.current?.('discovery') },
      { id: 'go-my-skills', label: 'Go to My Skills', group: 'Navigate', shortcut: '⌘2', perform: () => navigateRef.current?.('my-skills') },
      { id: 'go-tools', label: 'Go to Tools', group: 'Navigate', shortcut: '⌘3', perform: () => navigateRef.current?.('tools') },
      { id: 'go-migrate', label: 'Go to Migrate', group: 'Navigate', shortcut: '⌘4', perform: () => navigateRef.current?.('migrate') },
      { id: 'go-settings', label: 'Go to Settings', group: 'Navigate', shortcut: '⌘5', perform: () => navigateRef.current?.('settings') },
    ];
    const tools: CommandItem[] = redetectRef.current
      ? [{ id: 'redetect-tools', label: 'Scan Tools', group: 'Tools', perform: () => redetectRef.current?.() }]
      : [];
    const skills: CommandItem[] = scanLocalRef.current
      ? [{ id: 'scan-local', label: 'Scan Local Skills', group: 'Skills', perform: () => scanLocalRef.current?.() }]
      : [];
    const theme: CommandItem[] = [
      { id: 'set-theme-system', label: 'Theme: System', group: 'Theme', keywords: ['auto'], perform: () => setPreference('system') },
      { id: 'set-theme-light', label: 'Theme: Light', group: 'Theme', perform: () => setPreference('light') },
      { id: 'set-theme-dark', label: 'Theme: Dark', group: 'Theme', perform: () => setPreference('dark') },
    ];
    return [...nav, ...tools, ...skills, ...theme];
  }, [setPreference]);

  const value = useMemo<CommandBarContextValue>(() => ({
    open, openBar, closeBar, setNavigateHandler, setRedetectToolsHandler, setScanLocalHandler,
  }), [open, openBar, closeBar, setNavigateHandler, setRedetectToolsHandler, setScanLocalHandler]);

  return (
    <CommandBarCtx.Provider value={value}>
      {children}
      <CommandBar open={open} onOpenChange={setOpen} commands={commands} />
    </CommandBarCtx.Provider>
  );
}
