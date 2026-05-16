import { type KeyboardEvent, type ReactNode } from "react";
import { Skeleton } from "../primitives/Skeleton";

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
  density?: "compact" | "regular";
  onSelect?: (id: string) => void;
  onKeyNav?: (direction: "up" | "down") => void;
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
  density = "regular",
  onSelect,
  onKeyNav,
  href,
}: ListRowProps) {
  const height = density === "compact" ? "min-h-11" : "min-h-[62px]";
  const borderClass = selected ? "border-accent bg-success-bg" : "border-border-subtle bg-surface";

  if (loading) {
    return (
      <div
        className={`mb-2 grid items-center gap-2 rounded-lg border border-border-subtle bg-surface px-4 ${height}`}
        style={{ gridTemplateColumns: "auto 1fr auto" }}
      >
        <Skeleton width={16} height={16} />
        <Skeleton width="70%" height={12} />
        <Skeleton width={60} height={16} />
      </div>
    );
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onKeyNav?.("down");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onKeyNav?.("up");
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSelect?.(id);
    }
  };

  const content = (
    <>
      {leading && <span className="flex items-center">{leading}</span>}
      <span className="flex min-w-0 flex-col justify-center gap-0.5">
        <span className="truncate text-14 font-semibold text-text-primary">{primary}</span>
        {secondary && <span className="truncate text-12 text-text-tertiary">{secondary}</span>}
      </span>
      {meta && meta.length > 0 && (
        <span className="flex min-w-0 items-center gap-2 text-12 text-text-tertiary">
          {/* eslint-disable-next-line react/no-array-index-key -- meta items lack stable ids */}
          {meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </span>
      )}
      {trailing && <span className="flex items-center justify-end">{trailing}</span>}
    </>
  );

  const className = [
    "group mb-2 grid items-center gap-3 rounded-lg border px-4 py-3 outline-none shadow-card transition-colors duration-fast",
    height,
    borderClass,
    disabled ? "opacity-50 pointer-events-none" : "hover:border-border-default",
  ].join(" ");

  const columns = [
    leading ? "auto" : null,
    "minmax(0, 1fr)",
    meta && meta.length > 0 ? "auto" : null,
    trailing ? "auto" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const style = { gridTemplateColumns: columns };

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
