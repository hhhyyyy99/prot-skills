import { useEffect, type ReactNode } from 'react';

export interface WorkspaceHeaderProps {
  title: string;
  meta?: ReactNode;
  leading?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  primaryActions?: readonly ReactNode[];
}

export function WorkspaceHeader({ title, meta, leading, search, filters, primaryActions = [] }: WorkspaceHeaderProps) {
  useEffect(() => {
    if (import.meta.env.DEV && typeof meta === 'string' && meta.length > 120) {
      console.warn('WorkspaceHeader: meta exceeds 120 characters');
    }
  }, [meta]);

  if (primaryActions.length > 2) {
    console.error('WorkspaceHeader: primaryActions exceeds max of 2');
  }

  const visibleActions = primaryActions.length > 2 ? primaryActions.slice(0, 2) : primaryActions;
  const hasLeadingRow = Boolean(leading);
  const showControls = visibleActions.length > 0 || Boolean(search) || Boolean(filters);
  const showMetaRow = Boolean(meta) || Boolean(search) || Boolean(filters);
  const shouldUseCompactToolbar = !hasLeadingRow && (Boolean(meta) || showControls);

  return (
    <>
      <h2 className="sr-only" data-page-title={title}>{title}</h2>
      {hasLeadingRow && (
        <header className="flex items-start justify-between gap-4 px-4 pt-1">
          <div className="flex min-w-0 items-center gap-3">
            {leading}
          </div>
          <div className="flex shrink-0 gap-2">{visibleActions}</div>
        </header>
      )}
      {shouldUseCompactToolbar && (
        <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-1">
          <span className="min-w-0 truncate text-13 text-text-secondary">{meta}</span>
          <div className="flex shrink-0 items-center gap-2">
            {visibleActions}
            {search}
            {filters}
          </div>
        </div>
      )}
      {!shouldUseCompactToolbar && showMetaRow && (
        <div className={`flex items-center justify-between gap-4 px-4 pb-2 ${hasLeadingRow ? 'pt-2' : 'pt-1'}`}>
          <span className="min-w-0 truncate text-13 text-text-secondary">{meta}</span>
          <div className="flex shrink-0 items-center gap-2">{search}{filters}</div>
        </div>
      )}
    </>
  );
}
