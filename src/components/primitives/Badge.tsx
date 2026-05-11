import type { ReactNode } from 'react';

type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border-border-default text-text-secondary',
  accent: 'border-accent text-accent',
  success: 'border-success text-success',
  warning: 'border-warning text-warning',
  danger: 'border-danger text-danger',
};

function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center h-[18px] px-1.5 rounded-sm border text-12',
        variantClasses[variant],
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
