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

  return (
    <>
      <header className="flex items-start justify-between gap-4 px-4 pt-5">
        {leading}
        <h1 className="sr-only">{title}</h1>
        <div className="flex gap-2">{visibleActions}</div>
      </header>
      <div className="flex items-center justify-between gap-4 px-4 pt-2 pb-4">
        <span className="text-13 text-text-secondary truncate">{meta}</span>
        <div className="flex items-center gap-2">{search}{filters}</div>
      </div>
    </>
  );
}
