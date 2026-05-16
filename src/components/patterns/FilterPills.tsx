interface FilterPillOption<T extends string = string> {
  value: T;
  label: string;
}

interface FilterPillsProps<T extends string = string> {
  options: readonly FilterPillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

function FilterPills<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterPillsProps<T>) {
  return (
    <div className="filter-row" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={["filter-pill", active ? "filter-pill-active" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { FilterPills };
export type { FilterPillOption, FilterPillsProps };
