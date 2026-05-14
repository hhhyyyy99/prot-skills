import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceHeader } from '../WorkspaceHeader';

describe('WorkspaceHeader', () => {
  it('renders title as h1', () => {
    const { getByRole } = render(<WorkspaceHeader title="My Title" />);
    const h1 = getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('My Title');
    expect(h1).toBeVisible();
  });

  it('renders only first 2 primaryActions and calls console.error when given 3', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const actions = [
      <button key="1">A1</button>,
      <button key="2">A2</button>,
      <button key="3">A3</button>,
    ];
    const { queryByText } = render(<WorkspaceHeader title="T" primaryActions={actions} />);
    expect(spy).toHaveBeenCalled();
    expect(queryByText('A1')).toBeInTheDocument();
    expect(queryByText('A2')).toBeInTheDocument();
    expect(queryByText('A3')).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
