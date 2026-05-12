import { type ReactNode, isValidElement } from 'react';
import { Button } from '../primitives/Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?:
    | { label: string; onClick: () => void }
    | { label: string; href: string; external?: boolean };
  align?: 'left' | 'center';
}

function EmptyState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  align = 'left',
}: EmptyStateProps) {
  if (isValidElement(icon)) {
    const props = icon.props as Record<string, unknown>;
    if (typeof props.size === 'number' && props.size > 16) {
      console.warn('EmptyState: icon size should be 16px');
    }
  }

  const alignClass = align === 'center' ? 'text-center mx-auto' : '';

  return (
    <div className={`p-6 space-y-2 max-w-md ${alignClass}`}>
      <div className={align === 'center' ? 'flex items-center justify-center gap-2' : 'inline-flex items-center gap-2'}>
        {icon && <span className="inline-flex items-center" style={{ width: 16, height: 16 }}>{icon}</span>}
        <h3 className="text-14 font-medium text-text-primary">{title}</h3>
      </div>
      {description && <p className="text-13 text-text-secondary">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-2 pt-1">
          {primaryAction && (
            <Button variant="primary" size="sm" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && renderSecondary(secondaryAction)}
        </div>
      )}
    </div>
  );
}

function renderSecondary(
  action: { label: string; onClick: () => void } | { label: string; href: string; external?: boolean }
) {
  if ('href' in action && action.external) {
    return (
      <a
        href={action.href}
        target="_blank"
        rel="noreferrer"
        className="text-13 text-accent underline-offset-2 hover:underline"
      >
        {action.label}
      </a>
    );
  }
  if ('href' in action) {
    return (
      <a href={action.href} className="text-13 text-accent underline-offset-2 hover:underline">
        {action.label}
      </a>
    );
  }
  return (
    <Button variant="ghost" size="sm" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export { EmptyState };
export type { EmptyStateProps };
