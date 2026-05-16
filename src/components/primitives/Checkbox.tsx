import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";

interface CheckboxProps {
  id?: string;
  checked: boolean | "indeterminate";
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  label?: string;
}

function Checkbox({
  id,
  checked,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  label,
}: CheckboxProps) {
  const radixChecked = checked === "indeterminate" ? "indeterminate" : checked;

  return (
    <div className="inline-flex items-center gap-2">
      <CheckboxPrimitive.Root
        id={id}
        checked={radixChecked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
        aria-label={ariaLabel}
        className={[
          "inline-flex items-center justify-center w-4 h-4 rounded-sm border",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          "disabled:opacity-50",
          checked && checked !== "indeterminate" ? "bg-accent border-accent" : "",
          checked === "indeterminate" ? "bg-accent border-accent" : "",
          !checked ? "border-border-default" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <CheckboxPrimitive.Indicator>
          {checked === "indeterminate" ? (
            <Minus className="text-white" style={{ width: 14, height: 14 }} />
          ) : (
            <Check className="text-white" style={{ width: 14, height: 14 }} />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && (
        <label htmlFor={id} className="text-13 text-text-primary select-none">
          {label}
        </label>
      )}
    </div>
  );
}

export { Checkbox };
export type { CheckboxProps };
