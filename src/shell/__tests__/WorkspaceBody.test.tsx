import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WorkspaceBody } from '../WorkspaceBody';

describe('WorkspaceBody', () => {
  it('overlay layout: detail element has class absolute', () => {
    const { container } = render(
      <WorkspaceBody layout="overlay" detailOpen={true} detail={<div data-testid="detail">D</div>}>
        <p>main</p>
      </WorkspaceBody>
    );
    const detailWrapper = container.querySelector('.absolute');
    expect(detailWrapper).toBeInTheDocument();
  });

  it('push layout + detailOpen=false: detail column width is 0', () => {
    const { container } = render(
      <WorkspaceBody layout="push" detailOpen={false} detail={<div>D</div>}>
        <p>main</p>
      </WorkspaceBody>
    );
    const grid = container.querySelector('.workspace-body') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('1fr 0fr');
  });
});
