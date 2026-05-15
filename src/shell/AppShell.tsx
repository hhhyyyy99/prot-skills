import { useState, useMemo, useCallback, useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import { Folder, Wrench, Search, Settings } from 'lucide-react';
import { PrimaryNav, type PrimaryNavItem } from './PrimaryNav';
import { PerfMark } from './PerfMark';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useCommandBar } from './CommandBarProvider';
import { useI18n } from './LanguageProvider';
import { SettingsPage } from '../pages/SettingsPage';
import { ToolsPage } from '../pages/ToolsPage';
import { MySkillsPage } from '../pages/MySkillsPage';
import { MigratePage } from '../pages/MigratePage';
import type { PageId } from './types';

const PRIMARY_NAV_ITEMS: readonly PrimaryNavItem[] = [
  { id: 'my-skills', label: 'nav.mySkills', icon: Folder as PrimaryNavItem['icon'], shortcut: '⌘1' },
  { id: 'tools', label: 'nav.tools', icon: Wrench as PrimaryNavItem['icon'], shortcut: '⌘2' },
  { id: 'migrate', label: 'nav.migrate', icon: Search as PrimaryNavItem['icon'], shortcut: '⌘3' },
  { id: 'settings', label: 'nav.settings', icon: Settings as PrimaryNavItem['icon'], shortcut: '⌘4' },
];

const PAGE_IDS: readonly PageId[] = ['my-skills', 'tools', 'migrate', 'settings'];
const APP_NAME = 'Prot Skills';

export function AppShell() {
  const [activePage, setActivePage] = useState<PageId>('my-skills');
  const [, setDetailOpen] = useState(false);
  const bp = useBreakpoint();
  const { openBar, setNavigateHandler } = useCommandBar();
  const { t } = useI18n();

  useEffect(() => { setNavigateHandler(setActivePage); }, [setNavigateHandler]);

  const navCollapsed = bp !== 'regular';
  const navItems = useMemo(() => PRIMARY_NAV_ITEMS.map(item => ({ ...item, label: t(item.label) })), [t]);

  const platform = useMemo(() => {
    const ua = navigator.userAgent;
    if (ua.includes('Mac')) return 'macos';
    if (ua.includes('Win')) return 'windows';
    return 'linux';
  }, []);

  const navigateTo = useCallback((id: PageId) => setActivePage(id), []);

  const handleTitlebarMouseDown = useCallback(async (event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startDragging();
    } catch {
      // Ignore when running in a plain browser context.
    }
  }, []);

  useKeyboardShortcuts({
    'mod+1': () => setActivePage(PAGE_IDS[0]),
    'mod+2': () => setActivePage(PAGE_IDS[1]),
    'mod+3': () => setActivePage(PAGE_IDS[2]),
    'mod+4': () => setActivePage(PAGE_IDS[3]),
    'escape': () => setDetailOpen(false),
    'mod+k': (e) => { e.preventDefault(); openBar(); },
  });

  return (
    <div className="app-shell h-screen flex flex-col bg-canvas text-text-primary" data-platform={platform}>
      <header
        aria-label={t('app.aria.application')}
        className="app-titlebar h-[var(--topbar-height)] shrink-0 bg-canvas"
        data-tauri-drag-region
        onMouseDown={handleTitlebarMouseDown}
      />
      <div className="flex shrink-0 items-center justify-between gap-4 px-4 pb-1 pt-3">
        <h1 className="inline-flex h-9 max-w-full items-center rounded-full border border-border-subtle bg-surface px-3.5 text-13 font-semibold text-text-primary shadow-card">
          <span className="truncate">{APP_NAME}</span>
        </h1>
        <PrimaryNav items={navItems} activeId={activePage} collapsed={navCollapsed} onNavigate={navigateTo} />
      </div>
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
          <MySkillsPage />
        )}
      </div>
      <PerfMark />
    </div>
  );
}
