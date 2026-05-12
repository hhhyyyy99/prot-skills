import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InlineError } from '../InlineError';

describe('InlineError', () => {
  it('renders with role="alert"', () => {
    const { getByRole } = render(<InlineError title="Something failed" />);
    expect(getByRole('alert')).toBeInTheDocument();
  });

  it('calls onRetry when Retry button is clicked', () => {
    const onRetry = vi.fn();
    const { getByRole } = render(<InlineError title="Error" onRetry={onRetry} />);
    fireEvent.click(getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders <details> when details prop is provided', () => {
    const { container } = render(<InlineError title="Error" details="stack trace here" />);
    expect(container.querySelector('details')).toBeInTheDocument();
  });
});
