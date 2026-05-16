import type { ReactNode } from "react";

type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border-border-default bg-surface-raised text-text-secondary",
  accent: "border-accent bg-info-bg text-accent",
  success: "border-success bg-success-bg text-success",
  warning: "border-warning bg-warning-bg text-warning",
  danger: "border-danger bg-danger/10 text-danger",
};

function Badge({ variant = "neutral", children }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center h-[20px] px-2 rounded-full border text-[10px] font-semibold",
        variantClasses[variant],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
