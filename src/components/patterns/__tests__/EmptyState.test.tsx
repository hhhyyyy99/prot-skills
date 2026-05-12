import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('default align=left does not contain text-center', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.firstElementChild!.className).not.toContain('text-center');
  });

  it('external href link has target="_blank" and rel="noreferrer"', () => {
    render(
      <EmptyState
        title="Empty"
        secondaryAction={{ label: 'Open', href: 'https://example.com', external: true }}
      />
    );
    const link = screen.getByRole('link', { name: 'Open' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('primaryAction renders before secondaryAction', () => {
    const { container } = render(
      <EmptyState
        title="Empty"
        primaryAction={{ label: 'Primary', onClick: () => {} }}
        secondaryAction={{ label: 'Secondary', onClick: () => {} }}
      />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons[0].textContent).toBe('Primary');
    expect(buttons[1].textContent).toBe('Secondary');
  });
});
