import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { AppProviders } from '../../shell/AppProviders';
import { DiscoveryPage } from '../DiscoveryPage';

function renderPage() {
  return render(<DiscoveryPage />, { wrapper: AppProviders });
}

describe('DiscoveryPage', () => {
  it('shows No Skills yet with external link by default', () => {
    const { getByText } = renderPage();
    expect(getByText('No Skills yet')).toBeInTheDocument();
    const link = getByText('Open skills.sh') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://skills.sh');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
  });

  it('shows search results title and clears on button click', async () => {
    const user = userEvent.setup();
    const { getByPlaceholderText, findByText, getByText } = renderPage();
    const input = getByPlaceholderText('Search Skills');
    await user.type(input, 'hello');
    expect(await findByText('No results for "hello"')).toBeInTheDocument();
    const clearBtn = getByText('Clear search');
    expect(clearBtn).toBeInTheDocument();
    await user.click(clearBtn);
    expect(getByText('No Skills yet')).toBeInTheDocument();
  });
});
