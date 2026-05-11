import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icon: ReactNode;
  'aria-label': string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'subtle';
  loading?: boolean;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', variant = 'ghost', loading, className, disabled, ...rest }, ref) => {
    const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
    const iconSize = size === 'sm' ? 16 : 20;
    const hoverClass = variant === 'subtle' ? 'hover:bg-surface-raised' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={[
          'inline-flex items-center justify-center rounded-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          'disabled:opacity-50 disabled:pointer-events-none',
          btnSize,
          hoverClass,
          className,
        ].filter(Boolean).join(' ')}
        {...rest}
      >
        {loading
          ? <Loader2 className="animate-spin" style={{ width: iconSize, height: iconSize }} />
          : <span style={{ width: iconSize, height: iconSize, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        }
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
export { IconButton };
export type { IconButtonProps };
