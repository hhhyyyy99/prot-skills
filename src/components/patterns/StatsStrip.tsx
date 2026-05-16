interface StatItem {
  label: string;
  value: string | number;
  accent?: boolean;
}

interface StatsStripProps {
  items: readonly StatItem[];
}

function StatsStrip({ items }: StatsStripProps) {
  return (
    <div
      className="stats-strip"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <div className="stat-cell" key={item.label}>
          <div
            className={["stat-number", item.accent ? "text-accent" : ""].filter(Boolean).join(" ")}
          >
            {item.value}
          </div>
          <div className="stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export { StatsStrip };
export type { StatItem, StatsStripProps };
