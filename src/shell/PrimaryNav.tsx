import { useRef, useCallback, type ComponentType, type KeyboardEvent } from 'react';
import { Tooltip } from '../components/primitives/Tooltip';
import type { PageId } from './types';

export interface PrimaryNavItem {
  id: PageId;
  label: string;
  icon: ComponentType<{ size?: number }>;
  shortcut: string;
  hasUnread?: boolean;
}

export interface PrimaryNavProps {
  items: readonly PrimaryNavItem[];
  activeId: PageId;
  collapsed: boolean;
  onNavigate: (id: PageId) => void;
}

export function PrimaryNav({ items, activeId, collapsed, onNavigate }: PrimaryNavProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowDown') {
      nextIndex = index < items.length - 1 ? index + 1 : 0;
    } else if (e.key === 'ArrowUp') {
      nextIndex = index > 0 ? index - 1 : items.length - 1;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      const buttons = listRef.current?.querySelectorAll('button');
      buttons?.[nextIndex]?.focus();
    }
  }, [items.length]);

  return (
    <nav aria-label="Primary" className={`primary-nav flex flex-col ${collapsed ? 'w-14' : 'w-56'}`}>
      <ul ref={listRef} className="flex flex-col gap-0.5">
        {items.map((item, index) => {
          const isActive = item.id === activeId;
          const Icon = item.icon;

          const button = (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                h-9 px-3 flex items-center gap-3 text-13 border-l-2 w-full
                ${isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-raised'}
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <span className="relative flex-shrink-0">
                <Icon size={16} />
                {item.hasUnread && collapsed && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.hasUnread && (
                    <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  )}
                </>
              )}
            </button>
          );

          return (
            <li key={item.id}>
              {collapsed ? (
                <Tooltip content={`${item.label} · ${item.shortcut}`} side="right">
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
