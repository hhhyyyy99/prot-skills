import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  it('checked=indeterminate sets data-state=indeterminate', () => {
    render(<Checkbox checked="indeterminate" onChange={() => {}} aria-label="Select all" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'indeterminate');
  });

  it('checked=true sets data-state=checked', () => {
    render(<Checkbox checked={true} onChange={() => {}} aria-label="Accept" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'checked');
  });
});
