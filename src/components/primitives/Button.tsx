import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary:
    "border border-border-subtle bg-surface text-text-primary hover:border-border-default hover:bg-surface-raised",
  ghost: "text-text-primary hover:bg-surface-raised",
  danger: "border border-danger text-danger hover:bg-surface-raised",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-[30px] px-3 text-12",
  md: "h-8 px-3 text-13",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      loading,
      leadingIcon,
      trailingIcon,
      className,
      children,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const icon = loading ? (
      <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} />
    ) : (
      leadingIcon
    );

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={[
          "inline-flex items-center justify-center gap-1.5 rounded-sm font-semibold transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          "disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {icon}
        {children}
        {trailingIcon}
      </button>
    );
  },
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
