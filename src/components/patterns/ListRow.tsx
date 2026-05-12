import { type KeyboardEvent, type ReactNode } from 'react';
import { Skeleton } from '../primitives/Skeleton';

interface ListRowProps {
  id: string;
  leading?: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  meta?: readonly ReactNode[];
  trailing?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  loading?: boolean;
  density?: 'compact' | 'regular';
  onSelect?: (id: string) => void;
  onKeyNav?: (direction: 'up' | 'down') => void;
  href?: string;
}

function ListRow({
  id,
  leading,
  primary,
  secondary,
  meta,
  trailing,
  selected,
  disabled,
  loading,
  density = 'regular',
  onSelect,
  onKeyNav,
  href,
}: ListRowProps) {
  const height = density === 'compact' ? 'h-9' : 'h-12';
  const borderClass = selected
    ? 'border-l-2 border-accent bg-surface-raised'
    : 'border-l-2 border-transparent';

  if (loading) {
    return (
      <div
        className={`grid items-center gap-2 px-3 ${height}`}
        style={{ gridTemplateColumns: 'auto 1fr auto' }}
      >
        <Skeleton width={16} height={16} />
        <Skeleton width="70%" height={12} />
        <Skeleton width={60} height={16} />
      </div>
    );
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onKeyNav?.('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onKeyNav?.('up');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelect?.(id);
    }
  };

  const content = (
    <>
      {leading && <span className="flex items-center">{leading}</span>}
      <span className="flex items-center gap-2 min-w-0">
        <span className="truncate text-13 text-text-primary">{primary}</span>
        {secondary && (
          <span className="text-12 text-text-secondary opacity-0 transition-opacity duration-fast ease-out-quart group-hover:opacity-100 group-focus-within:opacity-100">
            {secondary}
          </span>
        )}
      </span>
      {meta && meta.length > 0 && (
        <span className="flex items-center gap-2 text-12 text-text-tertiary">
          {meta.map((m, i) => <span key={i}>{m}</span>)}
        </span>
      )}
      <span className="flex items-center opacity-0 transition-opacity duration-fast ease-out-quart group-hover:opacity-100 group-focus-within:opacity-100">
        {trailing}
      </span>
    </>
  );

  const className = [
    'group grid items-center gap-2 px-3 outline-none',
    height,
    borderClass,
    disabled ? 'opacity-50 pointer-events-none' : 'hover:bg-surface-raised',
  ].join(' ');

  const style = { gridTemplateColumns: 'auto 1fr auto auto' };

  if (href) {
    return (
      <a href={href} className={className} style={style} onKeyDown={handleKeyDown}>
        {content}
      </a>
    );
  }

  return (
    <div role="row" tabIndex={0} className={className} style={style} onKeyDown={handleKeyDown}>
      {content}
    </div>
  );
}

export { ListRow };
export type { ListRowProps };
