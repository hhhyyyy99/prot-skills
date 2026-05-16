import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectProps<T extends string = string> {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  size = "md",
}: SelectProps<T>) {
  const heightClass = size === "sm" ? "h-7 text-12" : "h-8 text-13";

  return (
    <SelectPrimitive.Root value={value} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={[
          "inline-flex items-center justify-between gap-1 rounded-md border border-border-default bg-surface px-2",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          "disabled:opacity-50",
          heightClass,
        ].join(" ")}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown style={{ width: 14, height: 14 }} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-50 overflow-hidden rounded-md border border-border-subtle bg-surface shadow-overlay"
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="relative flex items-center rounded-sm px-2 py-1 text-13 outline-none cursor-default select-none hover:bg-surface-raised data-[highlighted]:bg-surface-raised"
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
export type { SelectProps, SelectOption };
