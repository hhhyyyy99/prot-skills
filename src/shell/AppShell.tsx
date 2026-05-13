import { useState, useMemo, useCallback, useEffect } from 'react';
import { Package, Folder, Wrench, Search, Settings, Sparkles } from 'lucide-react';
import { PrimaryNav, type PrimaryNavItem } from './PrimaryNav';
import { PerfMark } from './PerfMark';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useCommandBar } from './CommandBarProvider';
import { SettingsPage } from '../pages/SettingsPage';
import { ToolsPage } from '../pages/ToolsPage';
import { MySkillsPage } from '../pages/MySkillsPage';
import { MigratePage } from '../pages/MigratePage';
import { DiscoveryPage } from '../pages/DiscoveryPage';
import type { PageId } from './types';

const PRIMARY_NAV_ITEMS: readonly PrimaryNavItem[] = [
  { id: 'discovery', label: 'Discovery', icon: Package as PrimaryNavItem['icon'], shortcut: '⌘1' },
  { id: 'my-skills', label: 'My Skills', icon: Folder as PrimaryNavItem['icon'], shortcut: '⌘2' },
  { id: 'tools', label: 'Tools', icon: Wrench as PrimaryNavItem['icon'], shortcut: '⌘3' },
  { id: 'migrate', label: 'Migrate', icon: Search as PrimaryNavItem['icon'], shortcut: '⌘4' },
  { id: 'settings', label: 'Settings', icon: Settings as PrimaryNavItem['icon'], shortcut: '⌘5' },
];

const PAGE_IDS: readonly PageId[] = ['discovery', 'my-skills', 'tools', 'migrate', 'settings'];

export function AppShell() {
  const [activePage, setActivePage] = useState<PageId>('discovery');
  const [, setDetailOpen] = useState(false);
  const bp = useBreakpoint();
  const { openBar, setNavigateHandler } = useCommandBar();

  useEffect(() => { setNavigateHandler(setActivePage); }, [setNavigateHandler]);

  const navCollapsed = bp !== 'regular';
  const activeTitle = PRIMARY_NAV_ITEMS.find(item => item.id === activePage)?.label ?? 'Discovery';

  const platform = useMemo(() => {
    const ua = navigator.userAgent;
    if (ua.includes('Mac')) return 'macos';
    if (ua.includes('Win')) return 'windows';
    return 'linux';
  }, []);

  const navigateTo = useCallback((id: PageId) => setActivePage(id), []);

  useKeyboardShortcuts({
    'mod+1': () => setActivePage(PAGE_IDS[0]),
    'mod+2': () => setActivePage(PAGE_IDS[1]),
    'mod+3': () => setActivePage(PAGE_IDS[2]),
    'mod+4': () => setActivePage(PAGE_IDS[3]),
    'mod+5': () => setActivePage(PAGE_IDS[4]),
    'escape': () => setDetailOpen(false),
    'mod+k': (e) => { e.preventDefault(); openBar(); },
  });

  return (
    <div className="app-shell h-screen flex flex-col bg-canvas text-text-primary" data-platform={platform}>
      <header
        aria-label="Application"
        className="flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b border-border-subtle bg-surface px-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-text-primary text-surface">
            <Sparkles size={17} />
          </span>
          <div className="truncate text-14 font-semibold text-text-primary">{activeTitle}</div>
        </div>
        <PrimaryNav items={PRIMARY_NAV_ITEMS} activeId={activePage} collapsed={navCollapsed} onNavigate={navigateTo} />
      </header>
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {activePage === 'settings' ? (
          <SettingsPage />
        ) : activePage === 'tools' ? (
          <ToolsPage />
        ) : activePage === 'my-skills' ? (
          <MySkillsPage />
        ) : activePage === 'migrate' ? (
          <MigratePage />
        ) : (
          <DiscoveryPage />
        )}
      </div>
      <PerfMark />
    </div>
  );
}
