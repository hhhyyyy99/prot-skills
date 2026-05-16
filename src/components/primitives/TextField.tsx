import {
  useId,
  type ReactNode,
  type KeyboardEvent,
  forwardRef,
  type InputHTMLAttributes,
} from "react";

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "size" | "onSubmit"
> {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingSlot?: ReactNode;
  size?: "sm" | "md";
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      label,
      helperText,
      error,
      leadingIcon,
      trailingSlot,
      size = "md",
      id: idProp,
      className,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;
    const describedBy = error ? errorId : helperText ? helperId : undefined;
    const sizeClass = size === "sm" ? "h-7 text-12" : "h-8 text-13";

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSubmit) {
        onSubmit(value);
      }
      rest.onKeyDown?.(e);
    };

    return (
      <div className={className}>
        {label && (
          <label htmlFor={id} className="block text-12 text-text-secondary mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {leadingIcon && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            className={[
              "w-full rounded-md border bg-surface px-2",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              "disabled:opacity-50",
              sizeClass,
              error ? "border-danger" : "border-border-default",
              leadingIcon ? "pl-7" : "",
              trailingSlot ? "pr-7" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            {...rest}
          />
          {trailingSlot && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailingSlot}</span>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-12 text-danger">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="mt-1 text-12 text-text-tertiary">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

TextField.displayName = "TextField";
export { TextField };
export type { TextFieldProps };
